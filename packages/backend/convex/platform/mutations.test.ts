/**
 * Tests des mutations métier plateforme (P2/P3) + des permissions
 * `platform_admin`. Suit le pattern de admin/mutations.test.ts (ADR-0013).
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
  platformOrgId: Id<"organisms">
  arseeOrgId: Id<"organisms">
  dgEtatCivilId: Id<"organisms">
  herveId: Id<"agents">
  herveToken: string
  yolandeToken: string
  arseeProcessId: Id<"onboardingProcesses">
}

async function buildFixture(): Promise<Fixture> {
  const t = convexTest(schema, modules)
  registerAggregates(t)

  const seeded = await t.run(async (rawCtx) => {
    const ctx = { ...rawCtx, db: triggers.wrapDB(rawCtx).db }

    const platformOrgId = await ctx.db.insert("organisms", {
      name: "Gabon Connect — Console plateforme",
      shortName: "Plateforme",
      category: "institution",
      status: "active",
    })
    const dgEtatCivilId = await ctx.db.insert("organisms", {
      name: "DG État Civil",
      shortName: "DG EC",
      category: "direction_generale",
      status: "active",
    })
    const arseeOrgId = await ctx.db.insert("organisms", {
      name: "ARSEE",
      shortName: "ARSEE",
      category: "autorite",
      status: "onboarding",
    })

    const herveId = await ctx.db.insert("agents", {
      organismId: platformOrgId,
      nip: "196509100099",
      name: "Hervé",
      email: "h@plat",
      role: "platform_admin",
    })
    await ctx.db.insert("agents", {
      organismId: dgEtatCivilId,
      nip: "198501100001",
      name: "Yolande",
      email: "y@ec",
      role: "agent_instructeur",
    })

    const arseeProcessId = await ctx.db.insert("onboardingProcesses", {
      organismId: arseeOrgId,
      currentStepKey: "convention",
      initiatedByAgentId: herveId,
      initiatedAt: Date.now() - 21 * 24 * 60 * 60 * 1000,
    })
    const STEPS = [
      ["identification", 0, "done"],
      ["referents", 1, "done"],
      ["habilitations", 2, "done"],
      ["convention", 3, "active"],
      ["services_catalog", 4, "pending"],
      ["integration_tests", 5, "pending"],
      ["production", 6, "pending"],
    ] as const
    for (const [key, order, status] of STEPS) {
      await ctx.db.insert("onboardingSteps", {
        processId: arseeProcessId,
        key,
        order,
        status,
      })
    }
    await ctx.db.insert("conventions", {
      organismId: arseeOrgId,
      version: "v2.4",
      title: "Convention d'adhésion · ARSEE",
      articleChecklist: [],
      status: "draft",
      generatedAt: Date.now(),
    })

    return { platformOrgId, dgEtatCivilId, arseeOrgId, herveId, arseeProcessId }
  })

  const herve = await t.mutation(api.auth.signInWithNip, { nip: "196509100099" })
  const yolande = await t.mutation(api.auth.signInWithNip, { nip: "198501100001" })

  return {
    t,
    ...seeded,
    herveToken: herve.token,
    yolandeToken: yolande.token,
  }
}

// ====================================================================
// requirePlatformAdmin (via une query / mutation au choix)
// ====================================================================

describe("requirePlatformAdmin", () => {
  test("refuse un agent non platform_admin", async () => {
    const f = await buildFixture()
    await expect(
      f.t.query(api.platform.supervision.getSupervision, {
        token: f.yolandeToken,
      }),
    ).rejects.toThrowError(/refusée|platform/i)
  })

  test("autorise un platform_admin", async () => {
    const f = await buildFixture()
    const data = await f.t.query(api.platform.supervision.getSupervision, {
      token: f.herveToken,
    })
    expect(data).toBeDefined()
    expect(Array.isArray(data.kpis)).toBe(true)
  })
})

// ====================================================================
// registerOrganism
// ====================================================================

describe("registerOrganism", () => {
  test("crée l'organisme en onboarding + un process avec 7 étapes", async () => {
    const f = await buildFixture()
    const res = await f.t.mutation(
      api.platform.organisms.registerOrganism,
      {
        token: f.herveToken,
        name: "Mairie de Lambaréné",
        shortName: "Mairie Lambaréné",
        category: "collectivite",
        province: "Moyen-Ogooué",
        provinceCode: "moyen_ogooue",
      },
    )
    const org = await f.t.run((ctx) => ctx.db.get(res.organismId))
    expect(org?.status).toBe("onboarding")
    expect(org?.slug).toBe("mairie-lambarene")

    const steps = await f.t.run((ctx) =>
      ctx.db
        .query("onboardingSteps")
        .withIndex("by_process", (q) => q.eq("processId", res.processId))
        .collect(),
    )
    expect(steps).toHaveLength(7)
    expect(steps.find((s) => s.order === 0)?.status).toBe("active")
    expect(steps.filter((s) => s.status === "pending")).toHaveLength(6)
  })

  test("refuse un agent non platform_admin", async () => {
    const f = await buildFixture()
    await expect(
      f.t.mutation(api.platform.organisms.registerOrganism, {
        token: f.yolandeToken,
        name: "Foo",
        category: "collectivite",
      }),
    ).rejects.toThrowError(/refusée|platform/i)
  })

  test("refuse un nom vide", async () => {
    const f = await buildFixture()
    await expect(
      f.t.mutation(api.platform.organisms.registerOrganism, {
        token: f.herveToken,
        name: "   ",
        category: "ministere",
      }),
    ).rejects.toThrowError(/nom de l'organisme/i)
  })

  test("refuse un slug en doublon", async () => {
    const f = await buildFixture()
    await f.t.mutation(api.platform.organisms.registerOrganism, {
      token: f.herveToken,
      name: "Mairie de Tchibanga",
      category: "collectivite",
    })
    await expect(
      f.t.mutation(api.platform.organisms.registerOrganism, {
        token: f.herveToken,
        name: "Mairie de Tchibanga",
        category: "collectivite",
      }),
    ).rejects.toThrowError(/déjà/i)
  })
})

// ====================================================================
// suspendOrganism / reactivateOrganism
// ====================================================================

describe("suspendOrganism / reactivateOrganism", () => {
  test("suspend exige un motif", async () => {
    const f = await buildFixture()
    await expect(
      f.t.mutation(api.platform.organisms.suspendOrganism, {
        token: f.herveToken,
        organismId: f.dgEtatCivilId,
        reason: "   ",
      }),
    ).rejects.toThrowError(/motif/i)
  })

  test("suspend puis réactive", async () => {
    const f = await buildFixture()
    await f.t.mutation(api.platform.organisms.suspendOrganism, {
      token: f.herveToken,
      organismId: f.dgEtatCivilId,
      reason: "Test",
    })
    let org = await f.t.run((ctx) => ctx.db.get(f.dgEtatCivilId))
    expect(org?.status).toBe("suspended")

    await f.t.mutation(api.platform.organisms.reactivateOrganism, {
      token: f.herveToken,
      organismId: f.dgEtatCivilId,
    })
    org = await f.t.run((ctx) => ctx.db.get(f.dgEtatCivilId))
    expect(org?.status).toBe("active")
  })

  test("refuse de suspendre une org déjà suspendue", async () => {
    const f = await buildFixture()
    await f.t.mutation(api.platform.organisms.suspendOrganism, {
      token: f.herveToken,
      organismId: f.dgEtatCivilId,
      reason: "Test",
    })
    await expect(
      f.t.mutation(api.platform.organisms.suspendOrganism, {
        token: f.herveToken,
        organismId: f.dgEtatCivilId,
        reason: "Encore",
      }),
    ).rejects.toThrowError(/déjà/i)
  })
})

// ====================================================================
// validateOnboardingStep
// ====================================================================

describe("validateOnboardingStep", () => {
  test("avance currentStepKey vers l'étape suivante", async () => {
    const f = await buildFixture()
    const conventionStep = await f.t.run((ctx) =>
      ctx.db
        .query("onboardingSteps")
        .withIndex("by_process_order", (q) =>
          q.eq("processId", f.arseeProcessId).eq("order", 3),
        )
        .first(),
    )
    await f.t.mutation(api.platform.onboarding.validateOnboardingStep, {
      token: f.herveToken,
      stepId: conventionStep!._id,
    })
    const process = await f.t.run((ctx) => ctx.db.get(f.arseeProcessId))
    expect(process?.currentStepKey).toBe("services_catalog")

    const next = await f.t.run((ctx) =>
      ctx.db
        .query("onboardingSteps")
        .withIndex("by_process_order", (q) =>
          q.eq("processId", f.arseeProcessId).eq("order", 4),
        )
        .first(),
    )
    expect(next?.status).toBe("active")
  })

  test("complète le process et active l'organisme à la dernière étape", async () => {
    const f = await buildFixture()
    // Marquer 4-5 comme done, valider 6 (production)
    await f.t.run(async (ctx) => {
      for (let order = 4; order <= 5; order++) {
        const s = await ctx.db
          .query("onboardingSteps")
          .withIndex("by_process_order", (q) =>
            q.eq("processId", f.arseeProcessId).eq("order", order),
          )
          .first()
        if (s) await ctx.db.patch(s._id, { status: "done" })
      }
      const last = await ctx.db
        .query("onboardingSteps")
        .withIndex("by_process_order", (q) =>
          q.eq("processId", f.arseeProcessId).eq("order", 6),
        )
        .first()
      if (last) await ctx.db.patch(last._id, { status: "active" })
    })
    const last = await f.t.run((ctx) =>
      ctx.db
        .query("onboardingSteps")
        .withIndex("by_process_order", (q) =>
          q.eq("processId", f.arseeProcessId).eq("order", 6),
        )
        .first(),
    )
    const res = await f.t.mutation(
      api.platform.onboarding.validateOnboardingStep,
      { token: f.herveToken, stepId: last!._id },
    )
    expect(res.processCompleted).toBe(true)

    const process = await f.t.run((ctx) => ctx.db.get(f.arseeProcessId))
    expect(process?.completedAt).toBeDefined()
    const org = await f.t.run((ctx) => ctx.db.get(f.arseeOrgId))
    expect(org?.status).toBe("active")
  })

  test("refuse de revalider une étape déjà done", async () => {
    const f = await buildFixture()
    const doneStep = await f.t.run((ctx) =>
      ctx.db
        .query("onboardingSteps")
        .withIndex("by_process_order", (q) =>
          q.eq("processId", f.arseeProcessId).eq("order", 0),
        )
        .first(),
    )
    await expect(
      f.t.mutation(api.platform.onboarding.validateOnboardingStep, {
        token: f.herveToken,
        stepId: doneStep!._id,
      }),
    ).rejects.toThrowError(/déjà validée/i)
  })
})

// ====================================================================
// startSignatureStep
// ====================================================================

describe("startSignatureStep", () => {
  test("bascule la convention en pending_signature quand convention active", async () => {
    const f = await buildFixture()
    await f.t.mutation(api.platform.onboarding.startSignatureStep, {
      token: f.herveToken,
      processId: f.arseeProcessId,
    })
    const conv = await f.t.run((ctx) =>
      ctx.db
        .query("conventions")
        .withIndex("by_organism_status", (q) =>
          q.eq("organismId", f.arseeOrgId),
        )
        .first(),
    )
    expect(conv?.status).toBe("pending_signature")
  })

  test("refuse si l'étape convention n'est pas active", async () => {
    const f = await buildFixture()
    // Marquer convention comme déjà done
    const convStep = await f.t.run((ctx) =>
      ctx.db
        .query("onboardingSteps")
        .withIndex("by_process_order", (q) =>
          q.eq("processId", f.arseeProcessId).eq("order", 3),
        )
        .first(),
    )
    await f.t.run((ctx) => ctx.db.patch(convStep!._id, { status: "done" }))
    await expect(
      f.t.mutation(api.platform.onboarding.startSignatureStep, {
        token: f.herveToken,
        processId: f.arseeProcessId,
      }),
    ).rejects.toThrowError(/convention active/i)
  })
})

// ====================================================================
// addOnboardingReferent
// ====================================================================

describe("addOnboardingReferent", () => {
  test("ajoute un référent visible par getOnboardingDashboard", async () => {
    const f = await buildFixture()
    await f.t.mutation(api.platform.onboarding.addOnboardingReferent, {
      token: f.herveToken,
      processId: f.arseeProcessId,
      fullName: "Mme Léa MENGUE",
      functionTitle: "Chef juridique",
      email: "l.mengue@arsee.ga",
      role: "agent_superviseur",
      authMethod: "nip_carte_agent",
    })
    const dashboard = await f.t.query(
      api.platform.onboarding.getOnboardingDashboard,
      { token: f.herveToken, organismId: f.arseeOrgId },
    )
    expect(dashboard?.referents).toHaveLength(1)
    expect(dashboard?.referents[0].email).toBe("l.mengue@arsee.ga")
  })

  test("refuse si nom ou e-mail vides", async () => {
    const f = await buildFixture()
    await expect(
      f.t.mutation(api.platform.onboarding.addOnboardingReferent, {
        token: f.herveToken,
        processId: f.arseeProcessId,
        fullName: "  ",
        functionTitle: "X",
        email: "x@y",
        role: "admin_organisme",
        authMethod: "nip_only",
      }),
    ).rejects.toThrowError(/Nom et e-mail/i)
  })
})

// ====================================================================
// Aggregates supervision
// ====================================================================

describe("getSupervision agrégats", () => {
  test("KPI active/onboarding reflètent l'état après suspendOrganism", async () => {
    const f = await buildFixture()
    const before = await f.t.query(api.platform.supervision.getSupervision, {
      token: f.herveToken,
    })
    const activeBefore = Number(
      before.kpis.find((k) => k.label === "Organismes actifs")?.value,
    )

    await f.t.mutation(api.platform.organisms.suspendOrganism, {
      token: f.herveToken,
      organismId: f.dgEtatCivilId,
      reason: "test",
    })

    const after = await f.t.query(api.platform.supervision.getSupervision, {
      token: f.herveToken,
    })
    const activeAfter = Number(
      after.kpis.find((k) => k.label === "Organismes actifs")?.value,
    )
    expect(activeAfter).toBe(activeBefore - 1)
  })
})
