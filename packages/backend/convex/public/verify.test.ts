/**
 * Tests Bloc 4 — vérification publique d'un acte + révocation + lazy registry.
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
  orgId: Id<"organisms">
  otherOrgId: Id<"organisms">
  adminToken: string
  adminId: Id<"agents">
  instructeurToken: string
  citizenId: Id<"citizens">
  requestId: Id<"requests">
  documentId: Id<"documents">
  verificationCode: string
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
    const otherOrgId = await ctx.db.insert("organisms", {
      name: "Autre",
      category: "direction_generale",
      status: "active",
    })
    const adminId = await ctx.db.insert("agents", {
      organismId: orgId,
      nip: "ADM01",
      name: "Admin",
      email: "a@x",
      role: "admin_organisme",
    })
    const instructeurId = await ctx.db.insert("agents", {
      organismId: orgId,
      nip: "INS01",
      name: "Instructeur",
      email: "i@x",
      role: "agent_instructeur",
    })
    const citizenId = await ctx.db.insert("citizens", {
      nip: "184127600504",
      name: "Marie OBAME",
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
    const requestId = await ctx.db.insert("requests", {
      ref: "GC-BLOC4-001",
      citizenId,
      serviceId,
      organismId: orgId,
      status: "issued",
      progressPct: 100,
      depositedAt: Date.now() - 86400_000,
      issuedAt: Date.now(),
    })
    const verificationCode = "GC-EC-4242"
    const documentId = await ctx.db.insert("documents", {
      actNumber: "EC-LBV-2026-04242",
      requestId,
      citizenId,
      issuedByAgentId: adminId,
      organismId: orgId,
      title: "Acte de naissance · Copie intégrale",
      status: "issued",
      issuedAt: Date.now(),
      sha256:
        "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
      qualifiedTimestamp: "2026-05-26T12:00:00Z",
      qrCode: verificationCode,
      verificationCode,
      payload: {},
    })
    return {
      orgId,
      otherOrgId,
      adminId,
      instructeurId,
      citizenId,
      requestId,
      documentId,
      verificationCode,
    }
  })

  const admin = await t.mutation(api.auth.signInWithNip, { nip: "ADM01" })
  const instructeur = await t.mutation(api.auth.signInWithNip, { nip: "INS01" })

  return {
    t,
    ...seeded,
    adminToken: admin.token,
    instructeurToken: instructeur.token,
  }
}

// ====================================================================
// public.verify.verifyByCode
// ====================================================================

describe("verifyByCode", () => {
  test("renvoie outcome=valid + document safe pour un code existant", async () => {
    const f = await buildFixture()
    const res = await f.t.mutation(api.public.verify.verifyByCode, {
      code: f.verificationCode,
    })
    expect(res.outcome).toBe("valid")
    expect(res.document?.actNumber).toBe("EC-LBV-2026-04242")
    expect(res.document?.title).toContain("Acte de naissance")
    expect(res.document?.organismName).toBe("DG EC")
    expect(res.document?.beneficiaryName).toBe("Marie OBAME")
    expect(res.document?.sha256Short).toHaveLength(16)
    // sha256 court — pas le full
    expect(res.document?.sha256Short).not.toContain(
      "abcdef0123456789abcdef",
    )
  })

  test("renvoie outcome=unknown pour un code inexistant", async () => {
    const f = await buildFixture()
    const res = await f.t.mutation(api.public.verify.verifyByCode, {
      code: "GC-XX-9999",
    })
    expect(res.outcome).toBe("unknown")
    expect(res.document).toBeUndefined()
  })

  test("renvoie outcome=unknown pour un format invalide", async () => {
    const f = await buildFixture()
    const res = await f.t.mutation(api.public.verify.verifyByCode, {
      code: "garbage",
    })
    expect(res.outcome).toBe("unknown")
  })

  test("tolère les espaces et la casse dans le code", async () => {
    const f = await buildFixture()
    const res = await f.t.mutation(api.public.verify.verifyByCode, {
      code: " gc-ec-4242 ",
    })
    expect(res.outcome).toBe("valid")
  })

  test("log dans publicVerifications pour les codes valides", async () => {
    const f = await buildFixture()
    await f.t.mutation(api.public.verify.verifyByCode, {
      code: f.verificationCode,
      verifierIpHash: "abc123",
      userAgent: "Mozilla/5.0",
    })
    const logs = await f.t.run((ctx) =>
      ctx.db
        .query("publicVerifications")
        .withIndex("by_code", (q) =>
          q.eq("verificationCode", f.verificationCode),
        )
        .collect(),
    )
    expect(logs).toHaveLength(1)
    expect(logs[0].outcome).toBe("valid")
    expect(logs[0].verifierIpHash).toBe("abc123")
    expect(logs[0].userAgent).toBe("Mozilla/5.0")
  })

  test("lazy-create un registryEntries à la première consultation (acte naissance)", async () => {
    const f = await buildFixture()
    // Avant : pas d'entry
    const before = await f.t.run((ctx) =>
      ctx.db.query("registryEntries").collect(),
    )
    expect(before).toHaveLength(0)

    await f.t.mutation(api.public.verify.verifyByCode, {
      code: f.verificationCode,
    })

    const after = await f.t.run((ctx) =>
      ctx.db.query("registryEntries").collect(),
    )
    expect(after).toHaveLength(1)
    expect(after[0].kind).toBe("birth")
    expect(after[0].registerCode).toMatch(/^EC-LBV-\d{4}-B$/)
    expect(after[0].linkedCitizenId).toBe(f.citizenId)

    // Le doc doit avoir linkedRegistryEntryId
    const doc = await f.t.run((ctx) => ctx.db.get(f.documentId))
    expect(doc?.linkedRegistryEntryId).toBe(after[0]._id)
  })

  test("idempotent : 2 vérifications ne créent pas 2 registryEntries", async () => {
    const f = await buildFixture()
    await f.t.mutation(api.public.verify.verifyByCode, {
      code: f.verificationCode,
    })
    await f.t.mutation(api.public.verify.verifyByCode, {
      code: f.verificationCode,
    })
    const entries = await f.t.run((ctx) =>
      ctx.db.query("registryEntries").collect(),
    )
    expect(entries).toHaveLength(1)
  })
})

// ====================================================================
// admin.mutations.revokeDocument
// ====================================================================

describe("revokeDocument", () => {
  test("admin_organisme peut révoquer + insert event + notif citoyen", async () => {
    const f = await buildFixture()
    const res = await f.t.mutation(api.admin.mutations.revokeDocument, {
      token: f.adminToken,
      documentId: f.documentId,
      reason: "Erreur sur la filiation déclarée",
    })
    expect(res.already).toBe(false)

    const doc = await f.t.run((ctx) => ctx.db.get(f.documentId))
    expect(doc?.status).toBe("revoked")
    expect(doc?.revokedAt).toBeGreaterThan(0)
    expect(doc?.revocationReason).toBe("Erreur sur la filiation déclarée")

    const events = await f.t.run((ctx) =>
      ctx.db
        .query("requestEvents")
        .withIndex("by_request_time", (q) => q.eq("requestId", f.requestId))
        .collect(),
    )
    expect(events.some((e) => e.title === "Acte révoqué")).toBe(true)

    const notifs = await f.t.run((ctx) =>
      ctx.db
        .query("notifications")
        .withIndex("by_recipient_time", (q) =>
          q.eq("recipientKind", "citizen").eq("recipientId", String(f.citizenId)),
        )
        .collect(),
    )
    expect(notifs.some((n) => n.title === "Votre acte a été révoqué")).toBe(true)
  })

  test("instructeur sans permission est refusé", async () => {
    const f = await buildFixture()
    await expect(
      f.t.mutation(api.admin.mutations.revokeDocument, {
        token: f.instructeurToken,
        documentId: f.documentId,
        reason: "x",
      }),
    ).rejects.toThrowError(/document\.revoke|refusée/)
  })

  test("motif vide est refusé", async () => {
    const f = await buildFixture()
    await expect(
      f.t.mutation(api.admin.mutations.revokeDocument, {
        token: f.adminToken,
        documentId: f.documentId,
        reason: "   ",
      }),
    ).rejects.toThrowError(/motif/)
  })

  test("idempotent : 2e appel renvoie already=true sans relancer notif", async () => {
    const f = await buildFixture()
    await f.t.mutation(api.admin.mutations.revokeDocument, {
      token: f.adminToken,
      documentId: f.documentId,
      reason: "premier motif",
    })
    const res2 = await f.t.mutation(api.admin.mutations.revokeDocument, {
      token: f.adminToken,
      documentId: f.documentId,
      reason: "second motif",
    })
    expect(res2.already).toBe(true)

    // Le motif initial est conservé (pas écrasé)
    const doc = await f.t.run((ctx) => ctx.db.get(f.documentId))
    expect(doc?.revocationReason).toBe("premier motif")
  })

  test("refuse révocation d'un doc d'un autre organisme", async () => {
    const f = await buildFixture()
    const otherDocId = await f.t.run((ctx) =>
      ctx.db.insert("documents", {
        actNumber: "XX-001",
        requestId: f.requestId,
        citizenId: f.citizenId,
        issuedByAgentId: f.adminId,
        organismId: f.otherOrgId, // ← autre
        title: "X",
        status: "issued",
        issuedAt: Date.now(),
        sha256: "0".repeat(64),
        qualifiedTimestamp: "now",
        qrCode: "X",
        payload: {},
      }),
    )
    await expect(
      f.t.mutation(api.admin.mutations.revokeDocument, {
        token: f.adminToken,
        documentId: otherDocId,
        reason: "x",
      }),
    ).rejects.toThrowError(/organisme/)
  })
})

// ====================================================================
// Intégration : revoke → verify renvoie "revoked"
// ====================================================================

describe("intégration revoke + verify", () => {
  test("après révocation, verifyByCode renvoie outcome=revoked + motif", async () => {
    const f = await buildFixture()
    await f.t.mutation(api.admin.mutations.revokeDocument, {
      token: f.adminToken,
      documentId: f.documentId,
      reason: "Réémission suite à correction",
    })
    const res = await f.t.mutation(api.public.verify.verifyByCode, {
      code: f.verificationCode,
    })
    expect(res.outcome).toBe("revoked")
    expect(res.document?.revocationReason).toBe(
      "Réémission suite à correction",
    )
    expect(res.document?.revokedAt).toBeGreaterThan(0)
  })
})
