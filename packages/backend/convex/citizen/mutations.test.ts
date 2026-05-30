/**
 * Tests des mutations métier citoyen + de la résolution sub IDN → citoyen.
 */
import { register as registerAggregate } from "@convex-dev/aggregate/test"
import { convexTest, type TestConvex } from "convex-test"
import type { GenericSchema, SchemaDefinition } from "convex/server"
import { describe, expect, test } from "vitest"
import { api } from "../_generated/api"
import type { Id } from "../_generated/dataModel"
import schema from "../schema"
import { triggers } from "../lib/triggers"
import { modules } from "../test.setup"

const AGGREGATE_NAMES = [
  "aggCitizensGlobal",
  "aggRequestsGlobal",
  "aggDocumentsGlobal",
  "aggArchivesGlobal",
  "aggRequestsByOrg",
  "aggDocumentsByOrg",
  "aggRequestsByOrgStatus",
  "aggArchivesByOrgStatus",
  "aggRequestsByOrgAgent",
  "aggRequestsByService",
  "aggRequestsByServiceVariant",
  "aggOrgsByStatus",
  "aggNotifsUnread",
] as const

function registerAggregates(
  t: TestConvex<SchemaDefinition<GenericSchema, boolean>>,
): void {
  for (const name of AGGREGATE_NAMES) registerAggregate(t, name)
}

interface Fixture {
  t: ReturnType<typeof convexTest>
  marieId: Id<"citizens">
  marieSub: string
  jpId: Id<"citizens">
  jpSub: string
  orgId: Id<"organisms">
  serviceId: Id<"services">
  serviceSlug: string
  variantKey: string
  existingRef: string
  existingRequestId: Id<"requests">
}

async function buildFixture(): Promise<Fixture> {
  const t = convexTest(schema, modules)
  registerAggregates(t)

  const seeded = await t.run(async (rawCtx) => {
    const ctx = { ...rawCtx, db: triggers.wrapDB(rawCtx).db }
    const orgId = await ctx.db.insert("organisms", {
      name: "DG État Civil",
      shortName: "DG EC",
      category: "direction_generale",
      status: "active",
    })
    const marieId = await ctx.db.insert("citizens", {
      nip: "184127600504",
      idnSub: "idn-test-marie",
      name: "Marie OBAME",
      email: "marie@id.gouv.ga",
      identityVerified: true,
      createdAt: Date.now(),
    })
    const jpId = await ctx.db.insert("citizens", {
      nip: "178050099218",
      idnSub: "idn-test-jp",
      name: "Jean-Pierre",
      identityVerified: true,
      createdAt: Date.now(),
    })
    const serviceId = await ctx.db.insert("services", {
      organismId: orgId,
      categorySlug: "etat-civil",
      slug: "acte-naissance",
      title: "Acte de naissance",
      category: "État civil",
      fee: "Gratuit",
      delayHours: 48,
      status: "published",
    })
    await ctx.db.insert("serviceVariants", {
      serviceId,
      key: "copie_integrale",
      label: "Copie intégrale",
      isDefault: true,
      order: 1,
    })
    const existingRequestId = await ctx.db.insert("requests", {
      ref: "GC-2026-EC-000001",
      citizenId: marieId,
      serviceId,
      organismId: orgId,
      status: "in_instruction",
      progressPct: 50,
      depositedAt: Date.now() - 24 * 60 * 60 * 1000,
    })
    return {
      orgId,
      marieId,
      jpId,
      serviceId,
      serviceSlug: "acte-naissance",
      variantKey: "copie_integrale",
      existingRef: "GC-2026-EC-000001",
      existingRequestId,
    }
  })

  return {
    t,
    ...seeded,
    marieSub: "idn-test-marie",
    jpSub: "idn-test-jp",
  }
}

// ====================================================================
// requireCitizen (via getDashboard query)
// ====================================================================

describe("requireCitizen", () => {
  test("refuse un sub IDN inconnu (compte non provisionné)", async () => {
    const f = await buildFixture()
    await expect(
      f.t
        .withIdentity({ subject: "idn-test-inconnu" })
        .query(api.citizen.dashboard.getDashboard, {}),
    ).rejects.toThrowError(/non provisionné/i)
  })

  test("refuse une requête non authentifiée", async () => {
    const f = await buildFixture()
    await expect(
      f.t.query(api.citizen.dashboard.getDashboard, {}),
    ).rejects.toThrowError(/authentification/i)
  })

  test("autorise un sub IDN connu", async () => {
    const f = await buildFixture()
    const dash = await f.t
      .withIdentity({ subject: f.marieSub })
      .query(api.citizen.dashboard.getDashboard, {})
    expect(dash.profile.name).toContain("Marie")
  })
})

// ====================================================================
// submitRequest
// ====================================================================

describe("submitRequest", () => {
  test("happy path : crée une demande + 2 events (submission + seal)", async () => {
    const f = await buildFixture()
    const res = await f.t
      .withIdentity({ subject: f.marieSub })
      .mutation(api.citizen.requests.submitRequest, {
        serviceSlug: f.serviceSlug,
        variantKey: f.variantKey,
        numberOfCopies: 2,
        beneficiaryKind: "self",
        consents: { honor: true, rgpd: true },
      })
    expect(res.ref).toMatch(/^GC-\d{4}-EC-\d{5}$/)

    const req = await f.t.run((ctx) => ctx.db.get(res.requestId))
    expect(req?.status).toBe("submitted")
    expect(req?.citizenId).toBe(f.marieId)
    expect(req?.numberOfCopies).toBe(2)

    const events = await f.t.run((ctx) =>
      ctx.db
        .query("requestEvents")
        .withIndex("by_request_time", (q) => q.eq("requestId", res.requestId))
        .collect(),
    )
    expect(events.map((e) => e.kind).sort()).toEqual(["seal", "submission"])
  })

  test("refuse si consentement honor manquant", async () => {
    const f = await buildFixture()
    await expect(
      f.t.withIdentity({ subject: f.marieSub }).mutation(
        api.citizen.requests.submitRequest,
        {
          serviceSlug: f.serviceSlug,
          consents: { honor: false, rgpd: true },
        },
      ),
    ).rejects.toThrowError(/honneur/i)
  })

  test("refuse si service inconnu", async () => {
    const f = await buildFixture()
    await expect(
      f.t.withIdentity({ subject: f.marieSub }).mutation(
        api.citizen.requests.submitRequest,
        {
          serviceSlug: "service-inexistant",
          consents: { honor: true, rgpd: true },
        },
      ),
    ).rejects.toThrowError(/introuvable/i)
  })

  test("refuse si compte non provisionné", async () => {
    const f = await buildFixture()
    await expect(
      f.t.withIdentity({ subject: "idn-inexistant" }).mutation(
        api.citizen.requests.submitRequest,
        {
          serviceSlug: f.serviceSlug,
          consents: { honor: true, rgpd: true },
        },
      ),
    ).rejects.toThrowError(/non provisionné/i)
  })
})

// ====================================================================
// cancelMyRequest
// ====================================================================

describe("cancelMyRequest", () => {
  test("happy path : statut → cancelled + event", async () => {
    const f = await buildFixture()
    await f.t
      .withIdentity({ subject: f.marieSub })
      .mutation(api.citizen.requests.cancelMyRequest, {
        ref: f.existingRef,
        reason: "Je m'en occupe directement en mairie.",
      })
    const req = await f.t.run((ctx) => ctx.db.get(f.existingRequestId))
    expect(req?.status).toBe("cancelled")
    const events = await f.t.run((ctx) =>
      ctx.db
        .query("requestEvents")
        .withIndex("by_request_time", (q) =>
          q.eq("requestId", f.existingRequestId),
        )
        .collect(),
    )
    expect(events.some((e) => e.kind === "cancellation")).toBe(true)
  })

  test("refuse d'annuler la demande d'un autre citoyen", async () => {
    const f = await buildFixture()
    await expect(
      f.t.withIdentity({ subject: f.jpSub }).mutation(
        api.citizen.requests.cancelMyRequest,
        { ref: f.existingRef },
      ),
    ).rejects.toThrowError(/appartient pas/i)
  })

  test("refuse d'annuler une demande déjà issued", async () => {
    const f = await buildFixture()
    await f.t.run((ctx) =>
      ctx.db.patch(f.existingRequestId, { status: "issued" }),
    )
    await expect(
      f.t.withIdentity({ subject: f.marieSub }).mutation(
        api.citizen.requests.cancelMyRequest,
        { ref: f.existingRef },
      ),
    ).rejects.toThrowError(/ne peut plus/i)
  })
})

// ====================================================================
// sendMessageToOrganism
// ====================================================================

describe("sendMessageToOrganism", () => {
  test("happy path : insère un message + event", async () => {
    const f = await buildFixture()
    await f.t
      .withIdentity({ subject: f.marieSub })
      .mutation(api.citizen.requests.sendMessageToOrganism, {
        ref: f.existingRef,
        body: "Bonjour, où en est ma demande ?",
      })
    const msgs = await f.t.run((ctx) =>
      ctx.db
        .query("requestMessages")
        .withIndex("by_request_time", (q) =>
          q.eq("requestId", f.existingRequestId),
        )
        .collect(),
    )
    expect(msgs).toHaveLength(1)
    expect(msgs[0].fromKind).toBe("citizen")
    expect(msgs[0].fromCitizenId).toBe(f.marieId)
  })

  test("refuse un message vide", async () => {
    const f = await buildFixture()
    await expect(
      f.t.withIdentity({ subject: f.marieSub }).mutation(
        api.citizen.requests.sendMessageToOrganism,
        { ref: f.existingRef, body: "   " },
      ),
    ).rejects.toThrowError(/vide/i)
  })

  test("refuse si demande appartient à un autre", async () => {
    const f = await buildFixture()
    await expect(
      f.t.withIdentity({ subject: f.jpSub }).mutation(
        api.citizen.requests.sendMessageToOrganism,
        { ref: f.existingRef, body: "Hello" },
      ),
    ).rejects.toThrowError(/appartient pas/i)
  })
})
