/**
 * Tests Phase Trous C — Onboarding réel.
 *
 * Couvre :
 *   - platform.registerOrganism avec firstAdminEmail crée invitation
 *     pending et retourne le token
 *   - admin.onboarding.getOnboardingStatus retourne la bonne checklist
 *   - admin.onboarding.finalizeActivation passe l'organism active +
 *     marque le process complete
 *   - finalizeActivation refus si organisme suspendu
 *   - finalizeActivation idempotent
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
  platformAdminToken: string
  orgOnboardingId: Id<"organisms">
  adminToken: string
  adminId: Id<"agents">
}

async function buildFixture(): Promise<Fixture> {
  const t = convexTest(schema, modules)
  registerAggregates(t)
  const ids = await t.run(async (rawCtx) => {
    const ctx = { ...rawCtx, db: triggers.wrapDB(rawCtx).db }
    // Org pour le platform admin
    const platformOrg = await ctx.db.insert("organisms", {
      name: "Digitalium",
      shortName: "DGT",
      category: "etablissement_public",
      status: "active",
    })
    await ctx.db.insert("agents", {
      organismId: platformOrg,
      nip: "PLA01",
      name: "Platform Admin",
      email: "pa@gabon.test",
      role: "platform_admin",
      active: true,
    })
    // Org cliente en onboarding (pour tester finalizeActivation)
    const orgOnboardingId = await ctx.db.insert("organisms", {
      name: "DG Test Onboarding",
      shortName: "DGTO",
      category: "direction_generale",
      status: "onboarding",
    })
    const adminId = await ctx.db.insert("agents", {
      organismId: orgOnboardingId,
      nip: "ADM01",
      name: "Admin Onboarding",
      email: "ao@gabon.test",
      role: "admin_organisme",
      active: true,
    })
    return { orgOnboardingId, adminId }
  })
  const pa = await t.mutation(api.auth.signInWithNip, { nip: "PLA01" })
  const adm = await t.mutation(api.auth.signInWithNip, { nip: "ADM01" })
  return {
    t,
    ...ids,
    platformAdminToken: pa.token,
    adminToken: adm.token,
  }
}

/* ============================================================
   registerOrganism avec firstAdminEmail
   ============================================================ */

describe("registerOrganism — bootstrap 1er admin", () => {
  test("crée l'organisme + une invitation pending pour le 1er admin", async () => {
    const f = await buildFixture()
    const result = await f.t.mutation(api.platform.organisms.registerOrganism, {
      token: f.platformAdminToken,
      name: "Mairie de Libreville Test",
      shortName: "MLB-Test",
      category: "collectivite",
      firstAdminEmail: "maire@lbv.test",
      firstAdminFunction: "Maire",
    })
    expect(result.organismId).toBeDefined()
    expect(result.firstAdminInvitationToken).toBeTruthy()
    expect(result.firstAdminInvitationToken!.length).toBe(64)

    // Vérifier l'invitation
    const inv = await f.t.run(async (ctx) => {
      return await ctx.db
        .query("agentInvitations")
        .withIndex("by_token", (q) =>
          q.eq("token", result.firstAdminInvitationToken!),
        )
        .first()
    })
    expect(inv).toBeDefined()
    expect(inv?.email).toBe("maire@lbv.test")
    expect(inv?.role).toBe("admin_organisme")
    expect(inv?.functionTitle).toBe("Maire")
    expect(inv?.organismId).toEqual(result.organismId)
  })

  test("sans firstAdminEmail : pas d'invitation créée", async () => {
    const f = await buildFixture()
    const result = await f.t.mutation(api.platform.organisms.registerOrganism, {
      token: f.platformAdminToken,
      name: "Org sans admin",
      category: "etablissement_public",
    })
    expect(result.firstAdminInvitationToken).toBeNull()
  })

  test("refus si firstAdminEmail invalide", async () => {
    const f = await buildFixture()
    await expect(
      f.t.mutation(api.platform.organisms.registerOrganism, {
        token: f.platformAdminToken,
        name: "Org X",
        category: "etablissement_public",
        firstAdminEmail: "pas-un-email",
      }),
    ).rejects.toThrow(/invalide/i)
  })
})

/* ============================================================
   getOnboardingStatus
   ============================================================ */

describe("getOnboardingStatus", () => {
  test("organisme onboarding + admin → isOnboarding=true, canFinalize=true", async () => {
    const f = await buildFixture()
    const status = await f.t.query(api.admin.onboarding.getOnboardingStatus, {
      token: f.adminToken,
    })
    expect(status?.isOnboarding).toBe(true)
    expect(status?.canFinalize).toBe(true)
    expect(status?.checklist.teamInvited).toBe(false)
    expect(status?.checklist.saeConfigured).toBe(false)
    expect(status?.checklist.servicesPublished).toBe(false)
    expect(status?.completedCount).toBe(0)
  })

  test("après invitation : checklist.teamInvited=true", async () => {
    const f = await buildFixture()
    await f.t.mutation(api.admin.team.inviteAgent, {
      token: f.adminToken,
      email: "newbie@test.gabon",
      role: "agent_instructeur",
    })
    const status = await f.t.query(api.admin.onboarding.getOnboardingStatus, {
      token: f.adminToken,
    })
    expect(status?.checklist.teamInvited).toBe(true)
  })
})

/* ============================================================
   finalizeActivation
   ============================================================ */

describe("finalizeActivation", () => {
  test("admin active son organisme → status=active", async () => {
    const f = await buildFixture()
    const result = await f.t.mutation(
      api.admin.onboarding.finalizeActivation,
      { token: f.adminToken },
    )
    expect(result.already).toBe(false)
    const org = await f.t.run((ctx) => ctx.db.get(f.orgOnboardingId))
    expect(org?.status).toBe("active")
  })

  test("idempotent : 2e finalize → already=true", async () => {
    const f = await buildFixture()
    await f.t.mutation(api.admin.onboarding.finalizeActivation, {
      token: f.adminToken,
    })
    const result = await f.t.mutation(
      api.admin.onboarding.finalizeActivation,
      { token: f.adminToken },
    )
    expect(result.already).toBe(true)
  })

  test("refus si organisme suspendu", async () => {
    const f = await buildFixture()
    await f.t.run(async (rawCtx) => {
      const ctx = { ...rawCtx, db: triggers.wrapDB(rawCtx).db }
      await ctx.db.patch(f.orgOnboardingId, { status: "suspended" })
    })
    await expect(
      f.t.mutation(api.admin.onboarding.finalizeActivation, {
        token: f.adminToken,
      }),
    ).rejects.toThrow(/suspendu/i)
  })
})
