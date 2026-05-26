/**
 * Tests Phase Trous A — NotificationProvider.
 *
 * Couvre :
 *   - notify() insère toujours in-app
 *   - notify() respecte les préférences (email/sms désactivés par défaut)
 *   - notify() pousse dans outbox quand email/sms activés
 *   - mute par kind empêche les canaux externes
 *   - forceChannels override les préférences (alertes critiques)
 *   - SMS body est tronqué
 *   - StubEmailProvider / StubSmsProvider renvoient {ok:true}
 */
import { register as registerAggregate } from "@convex-dev/aggregate/test"
import { convexTest, type TestConvex } from "convex-test"
import type { GenericSchema, SchemaDefinition } from "convex/server"
import { describe, expect, test } from "vitest"
import type { Id } from "../_generated/dataModel"
import schema from "../schema"
import { triggers } from "./triggers"
import { modules } from "../test.setup"
import {
  StubEmailProvider,
  StubSmsProvider,
  getExternalProvider,
  notify,
} from "./notificationProvider"

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
  agentInApp: Id<"agents">
  agentEmail: Id<"agents">
  agentMuteRequest: Id<"agents">
  citizenInApp: Id<"citizens">
  citizenAllChannels: Id<"citizens">
}

async function buildFixture(): Promise<Fixture> {
  const t = convexTest(schema, modules)
  registerAggregates(t)
  const ids = await t.run(async (rawCtx) => {
    const ctx = { ...rawCtx, db: triggers.wrapDB(rawCtx).db }
    const orgId = await ctx.db.insert("organisms", {
      name: "DG Test",
      shortName: "DGT",
      category: "direction_generale",
      status: "active",
    })
    const agentInApp = await ctx.db.insert("agents", {
      organismId: orgId,
      nip: "A001",
      name: "Agent InApp",
      email: "inapp@gabon.test",
      role: "agent_instructeur",
    })
    const agentEmail = await ctx.db.insert("agents", {
      organismId: orgId,
      nip: "A002",
      name: "Agent Email",
      email: "withemail@gabon.test",
      role: "agent_instructeur",
      notificationPreferences: { email: true },
    })
    const agentMuteRequest = await ctx.db.insert("agents", {
      organismId: orgId,
      nip: "A003",
      name: "Agent Mute",
      email: "mute@gabon.test",
      role: "agent_instructeur",
      notificationPreferences: {
        email: true,
        muteKinds: ["request_status_change"],
      },
    })
    const citizenInApp = await ctx.db.insert("citizens", {
      nip: "184127600100",
      name: "Citoyen InApp",
      email: "c1@gabon.test",
      phone: "+241 06 11 22 33",
      identityVerified: true,
      createdAt: Date.now(),
    })
    const citizenAllChannels = await ctx.db.insert("citizens", {
      nip: "184127600101",
      name: "Citoyen Multi",
      email: "c2@gabon.test",
      phone: "+241 06 44 55 66",
      identityVerified: true,
      notificationPreferences: { email: true, sms: true },
      createdAt: Date.now(),
    })
    return {
      orgId,
      agentInApp,
      agentEmail,
      agentMuteRequest,
      citizenInApp,
      citizenAllChannels,
    }
  })
  return { t, ...ids }
}

/* ============================================================
   notify() — in-app défaut
   ============================================================ */

describe("notify — in-app par défaut", () => {
  test("agent sans préférences → uniquement in_app", async () => {
    const f = await buildFixture()
    const result = await f.t.run(async (ctx) => {
      return await notify(ctx, {
        recipientKind: "agent",
        recipientId: String(f.agentInApp),
        kind: "assignment",
        severity: "info",
        title: "Test in-app",
        body: "Corps du test",
      })
    })
    expect(result.channels).toEqual(["in_app"])
    expect(result.outboxIds).toHaveLength(0)
    expect(result.notificationId).toBeDefined()
    const notif = await f.t.run((ctx) => ctx.db.get(result.notificationId))
    expect(notif?.title).toBe("Test in-app")
    expect(notif?.recipientId).toBe(String(f.agentInApp))
  })

  test("citoyen sans préférences → uniquement in_app", async () => {
    const f = await buildFixture()
    const result = await f.t.run(async (ctx) => {
      return await notify(ctx, {
        recipientKind: "citizen",
        recipientId: String(f.citizenInApp),
        kind: "document_ready",
        severity: "success",
        title: "Acte prêt",
      })
    })
    expect(result.channels).toEqual(["in_app"])
    expect(result.outboxIds).toHaveLength(0)
  })

  test("platform_admin → toujours in_app uniquement v1", async () => {
    const f = await buildFixture()
    const result = await f.t.run(async (ctx) => {
      return await notify(ctx, {
        recipientKind: "platform_admin",
        recipientId: "platform_super_001",
        kind: "security_alert",
        severity: "danger",
        title: "Alerte",
      })
    })
    expect(result.channels).toEqual(["in_app"])
  })
})

/* ============================================================
   notify() — canaux externes
   ============================================================ */

describe("notify — canaux externes", () => {
  test("agent email=true + adresse → in_app + email outbox", async () => {
    const f = await buildFixture()
    const result = await f.t.run(async (ctx) => {
      return await notify(ctx, {
        recipientKind: "agent",
        recipientId: String(f.agentEmail),
        kind: "signature_requested",
        severity: "info",
        title: "Visa demandé",
        body: "Acte X attend votre approbation.",
        linkTo: "/signatures",
      })
    })
    expect(result.channels).toContain("email")
    expect(result.outboxIds).toHaveLength(1)
    const outbox = await f.t.run((ctx) => ctx.db.get(result.outboxIds[0]!))
    expect(outbox?.channel).toBe("email")
    expect(outbox?.address).toBe("withemail@gabon.test")
    expect(outbox?.status).toBe("pending")
    expect(outbox?.subject).toBe("Visa demandé")
    expect(outbox?.linkTo).toBe("/signatures")
  })

  test("citoyen email+sms activés → in_app + 2 entrées outbox", async () => {
    const f = await buildFixture()
    const result = await f.t.run(async (ctx) => {
      return await notify(ctx, {
        recipientKind: "citizen",
        recipientId: String(f.citizenAllChannels),
        kind: "request_status_change",
        severity: "info",
        title: "Statut mis à jour",
        body: "Votre demande a avancé.",
      })
    })
    expect(result.channels).toEqual(["in_app", "email", "sms"])
    expect(result.outboxIds).toHaveLength(2)
    const channels = await f.t.run(async (ctx) =>
      Promise.all(result.outboxIds.map((id) => ctx.db.get(id))),
    )
    expect(channels.map((c) => c?.channel).sort()).toEqual(["email", "sms"])
  })

  test("agent email=true mais kind muté → in_app seulement", async () => {
    const f = await buildFixture()
    const result = await f.t.run(async (ctx) => {
      return await notify(ctx, {
        recipientKind: "agent",
        recipientId: String(f.agentMuteRequest),
        kind: "request_status_change", // muté !
        severity: "info",
        title: "Mise à jour",
      })
    })
    expect(result.channels).toEqual(["in_app"])
    expect(result.outboxIds).toHaveLength(0)
  })

  test("agent email=true sans email (cas dégénéré) → in_app seulement", async () => {
    const f = await buildFixture()
    const agentNoEmail = await f.t.run(async (rawCtx) => {
      const ctx = { ...rawCtx, db: triggers.wrapDB(rawCtx).db }
      return await ctx.db.insert("agents", {
        organismId: f.orgId,
        nip: "A004",
        name: "Agent NoEmail",
        email: "", // adresse vide → skip
        role: "agent_instructeur",
        notificationPreferences: { email: true },
      })
    })
    const result = await f.t.run(async (ctx) => {
      return await notify(ctx, {
        recipientKind: "agent",
        recipientId: String(agentNoEmail),
        kind: "assignment",
        severity: "info",
        title: "Test",
      })
    })
    expect(result.channels).toEqual(["in_app"])
  })
})

/* ============================================================
   notify() — forceChannels
   ============================================================ */

describe("notify — forceChannels", () => {
  test("forceChannels=[email] sur agent sans email pref → push email quand même", async () => {
    const f = await buildFixture()
    const result = await f.t.run(async (ctx) => {
      return await notify(ctx, {
        recipientKind: "agent",
        recipientId: String(f.agentInApp), // pas de notificationPreferences
        kind: "security_alert",
        severity: "danger",
        title: "Connexion suspecte",
        forceChannels: ["email"],
      })
    })
    expect(result.channels).toContain("email")
    expect(result.outboxIds).toHaveLength(1)
  })

  test("forceChannels bypass aussi le mute", async () => {
    const f = await buildFixture()
    const result = await f.t.run(async (ctx) => {
      return await notify(ctx, {
        recipientKind: "agent",
        recipientId: String(f.agentMuteRequest),
        kind: "request_status_change", // muté !
        severity: "danger",
        title: "Urgence",
        forceChannels: ["email"],
      })
    })
    // muté est ignoré par forceChannels
    expect(result.channels).toContain("email")
  })
})

/* ============================================================
   SMS truncation
   ============================================================ */

describe("notify — SMS body", () => {
  test("body très long est tronqué à 320 caractères", async () => {
    const f = await buildFixture()
    const longBody = "x".repeat(400)
    const result = await f.t.run(async (ctx) => {
      return await notify(ctx, {
        recipientKind: "citizen",
        recipientId: String(f.citizenAllChannels),
        kind: "document_ready",
        severity: "success",
        title: "T",
        body: longBody,
      })
    })
    const smsId = result.outboxIds.find((_, i) => result.channels[i + 1] === "sms")
    // On retrouve l'outbox SMS
    const all = await f.t.run((ctx) =>
      Promise.all(result.outboxIds.map((id) => ctx.db.get(id))),
    )
    const sms = all.find((e) => e?.channel === "sms")
    expect(sms).toBeDefined()
    expect(sms!.body.length).toBeLessThanOrEqual(320)
    expect(sms!.body.endsWith("…")).toBe(true)
    void smsId // satisfait le linter
  })
})

/* ============================================================
   Provider skeletons
   ============================================================ */

describe("StubEmailProvider / StubSmsProvider", () => {
  test("StubEmailProvider.send retourne {ok:true}", async () => {
    const provider = new StubEmailProvider()
    expect(provider.kind).toBe("email")
    const result = await provider.send({
      _id: "fake_id" as Id<"notificationOutbox">,
      _creationTime: 0,
      recipientKind: "agent",
      recipientId: "rid",
      channel: "email",
      address: "test@x",
      kind: "assignment",
      severity: "info",
      subject: "Sujet",
      body: "Corps",
      status: "pending",
      attempts: 0,
      createdAt: Date.now(),
    })
    expect(result.ok).toBe(true)
  })

  test("StubSmsProvider.send retourne {ok:true}", async () => {
    const provider = new StubSmsProvider()
    expect(provider.kind).toBe("sms")
    const result = await provider.send({
      _id: "fake_id" as Id<"notificationOutbox">,
      _creationTime: 0,
      recipientKind: "citizen",
      recipientId: "rid",
      channel: "sms",
      address: "+241 06 11 22 33",
      kind: "document_ready",
      severity: "info",
      subject: "Sujet",
      body: "Corps court",
      status: "pending",
      attempts: 0,
      createdAt: Date.now(),
    })
    expect(result.ok).toBe(true)
  })

  test("getExternalProvider factory renvoie le bon provider", () => {
    expect(getExternalProvider("email").kind).toBe("email")
    expect(getExternalProvider("email").name).toBe("stub-email")
    expect(getExternalProvider("sms").kind).toBe("sms")
    expect(getExternalProvider("sms").name).toBe("stub-sms")
  })
})
