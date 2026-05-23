import { v } from "convex/values"
import { query, type MutationCtx, type QueryCtx } from "../_generated/server"
import { mutation } from "../lib/triggers" // wrapper trigger-aware
import type { Id } from "../_generated/dataModel"
import { assertCan } from "../lib/permissions"
import {
  agentRoleValidator,
  authMethodValidator,
  type OnboardingStepKey,
} from "../lib/enums"
import { requirePlatformAdmin } from "./auth"

/**
 * Page Onboarding (P3) — un wizard par processus en cours. Par défaut on
 * sélectionne le process le plus récent encore actif. Les mutations
 * gèrent : validation d'étape, démarrage de la signature, ajout référent.
 */

const STEP_LABELS: Record<OnboardingStepKey, string> = {
  identification: "Identification de l'organisme",
  referents: "Désignation des référents",
  habilitations: "Habilitations & rôles",
  convention: "Signature de la convention",
  services_catalog: "Catalogue des services",
  integration_tests: "Tests d'intégration API",
  production: "Mise en production",
}

const STEP_ORDER: OnboardingStepKey[] = [
  "identification",
  "referents",
  "habilitations",
  "convention",
  "services_catalog",
  "integration_tests",
  "production",
]

export const getOnboardingDashboard = query({
  args: {
    token: v.string(),
    organismId: v.optional(v.id("organisms")),
  },
  handler: async (ctx, { token, organismId }) => {
    await requirePlatformAdmin(ctx, token)

    // Choisir le process : si organismId fourni → celui-là ; sinon le plus
    // récent encore en cours (completedAt === undefined).
    let process: Awaited<ReturnType<typeof getProcessByOrganism>> | null
    if (organismId) {
      process = await getProcessByOrganism(ctx, organismId)
    } else {
      const inFlight = await ctx.db
        .query("onboardingProcesses")
        .collect()
      process = inFlight
        .filter((p) => p.completedAt === undefined)
        .sort((a, b) => b.initiatedAt - a.initiatedAt)[0] ?? null
      if (!process) {
        // Fallback : prendre le plus récent même complété
        process = inFlight.sort((a, b) => b.initiatedAt - a.initiatedAt)[0] ?? null
      }
    }

    if (!process) return null

    const targetOrg = await ctx.db.get(process.organismId)
    if (!targetOrg) return null

    const steps = await ctx.db
      .query("onboardingSteps")
      .withIndex("by_process_order", (q) => q.eq("processId", process._id))
      .collect()
    steps.sort((a, b) => a.order - b.order)

    const stepsView = steps.map((s) => ({
      id: s._id,
      key: s.key,
      title: STEP_LABELS[s.key] ?? s.key,
      status: s.status,
      order: s.order,
      completedAt: s.completedAt,
    }))

    const initiator = await ctx.db.get(process.initiatedByAgentId)

    const referents = await ctx.db
      .query("onboardingReferents")
      .withIndex("by_process", (q) => q.eq("processId", process._id))
      .collect()

    const referentsView = referents.map((r) => ({
      id: r._id,
      name: r.fullName,
      function: r.functionTitle,
      email: r.email,
      role: roleLabel(r.role),
      auth: authMethodLabel(r.authMethod),
    }))

    // Convention en cours (étape « convention »)
    const conventionStep = steps.find((s) => s.key === "convention")
    const convention = await ctx.db
      .query("conventions")
      .withIndex("by_organism_status", (q) =>
        q.eq("organismId", process.organismId),
      )
      .order("desc")
      .first()

    const currentStep = steps.find((s) => s.status === "active") ?? steps[0]
    const completedCount = steps.filter((s) => s.status === "done").length

    return {
      processId: process._id,
      organismId: process.organismId,
      initiatedAt: process.initiatedAt,
      initiatedBy: initiator?.name ?? "Plateforme",
      completedAt: process.completedAt,
      currentStepKey: process.currentStepKey,
      currentStepLabel: currentStep
        ? STEP_LABELS[currentStep.key]
        : "—",
      currentStepIndex: currentStep ? currentStep.order + 1 : 0,
      totalSteps: steps.length,
      completedCount,
      targetOrg: {
        denomination: targetOrg.name,
        acronym: targetOrg.shortName ?? "—",
        legalForm: categoryLegalForm(targetOrg.category),
        tutelage: targetOrg.tutelage ?? "—",
        decree: targetOrg.decretCreation ?? "—",
        headquarters: targetOrg.siege ?? "—",
        taxId: targetOrg.nif ?? "—",
        phone: targetOrg.phone ?? "—",
      },
      steps: stepsView,
      referents: referentsView,
      convention: convention
        ? {
            id: convention._id,
            version: convention.version,
            title: convention.title,
            status: convention.status,
            articleChecklist: convention.articleChecklist,
            generatedAt: convention.generatedAt,
          }
        : null,
      conventionStepActive: conventionStep?.status === "active",
    }
  },
})

export const validateOnboardingStep = mutation({
  args: { token: v.string(), stepId: v.id("onboardingSteps") },
  handler: async (ctx, { token, stepId }) => {
    const { actor, agent } = await requirePlatformAdmin(ctx, token)
    assertCan(actor, "organism.onboard_step")

    const step = await ctx.db.get(stepId)
    if (!step) throw new Error("Étape introuvable.")
    if (step.status === "done") {
      throw new Error("Étape déjà validée.")
    }

    const now = Date.now()
    await ctx.db.patch(stepId, {
      status: "done",
      completedAt: now,
      completedByAgentId: agent._id,
    })

    // Activer l'étape suivante (ordre +1) si elle existe
    const next = await ctx.db
      .query("onboardingSteps")
      .withIndex("by_process_order", (q) =>
        q.eq("processId", step.processId).eq("order", step.order + 1),
      )
      .first()

    const process = await ctx.db.get(step.processId)
    if (!process) throw new Error("Process introuvable.")

    if (next) {
      if (next.status === "pending") {
        await ctx.db.patch(next._id, { status: "active" })
      }
      await ctx.db.patch(process._id, { currentStepKey: next.key })
    } else {
      // Dernière étape : on complète le process + on active l'organisme
      await ctx.db.patch(process._id, {
        currentStepKey: STEP_ORDER[STEP_ORDER.length - 1],
        completedAt: now,
      })
      await ctx.db.patch(process.organismId, { status: "active" })
    }

    const targetOrg = await ctx.db.get(process.organismId)
    await logActivity(ctx, {
      actorAgentId: agent._id,
      actorDisplayName: agent.name,
      verb: "a validé l'étape",
      subjectKind: "onboardingSteps",
      subjectId: String(stepId),
      subjectLabel: `${STEP_LABELS[step.key]} · ${targetOrg?.shortName ?? targetOrg?.name ?? "Organisme"}`,
      linkTo: "/onboarding",
      iconKey: "checkCircle",
      organismId: process.organismId,
    })

    return { processCompleted: !next, nextStepKey: next?.key }
  },
})

export const startSignatureStep = mutation({
  args: { token: v.string(), processId: v.id("onboardingProcesses") },
  handler: async (ctx, { token, processId }) => {
    const { actor, agent } = await requirePlatformAdmin(ctx, token)
    assertCan(actor, "organism.onboard_step")

    const process = await ctx.db.get(processId)
    if (!process) throw new Error("Process introuvable.")

    const conventionStep = await ctx.db
      .query("onboardingSteps")
      .withIndex("by_process", (q) => q.eq("processId", processId))
      .filter((q) => q.eq(q.field("key"), "convention"))
      .first()
    if (!conventionStep) {
      throw new Error("Étape de convention introuvable.")
    }
    if (conventionStep.status !== "active") {
      throw new Error(
        "La signature ne peut être lancée que sur une étape de convention active.",
      )
    }

    // Marquer la convention liée comme pending_signature → en attente
    const convention = await ctx.db
      .query("conventions")
      .withIndex("by_organism_status", (q) =>
        q.eq("organismId", process.organismId),
      )
      .first()
    if (convention && convention.status === "draft") {
      await ctx.db.patch(convention._id, { status: "pending_signature" })
    }

    await logActivity(ctx, {
      actorAgentId: agent._id,
      actorDisplayName: agent.name,
      verb: "a lancé la signature de la convention",
      subjectKind: "onboardingProcesses",
      subjectId: String(processId),
      subjectLabel: convention?.title ?? "Convention d'adhésion",
      linkTo: "/onboarding",
      iconKey: "shieldCheck",
      organismId: process.organismId,
    })

    return { conventionId: convention?._id ?? null }
  },
})

export const addOnboardingReferent = mutation({
  args: {
    token: v.string(),
    processId: v.id("onboardingProcesses"),
    fullName: v.string(),
    functionTitle: v.string(),
    email: v.string(),
    role: agentRoleValidator,
    authMethod: authMethodValidator,
  },
  handler: async (ctx, args) => {
    const { actor, agent } = await requirePlatformAdmin(ctx, args.token)
    assertCan(actor, "organism.onboard_step")

    const process = await ctx.db.get(args.processId)
    if (!process) throw new Error("Process introuvable.")

    const fullName = args.fullName.trim()
    const email = args.email.trim().toLowerCase()
    if (!fullName || !email) {
      throw new Error("Nom et e-mail sont requis.")
    }

    const referentId = await ctx.db.insert("onboardingReferents", {
      processId: args.processId,
      fullName,
      functionTitle: args.functionTitle.trim(),
      email,
      role: args.role,
      authMethod: args.authMethod,
      createdAt: Date.now(),
    })

    await logActivity(ctx, {
      actorAgentId: agent._id,
      actorDisplayName: agent.name,
      verb: "a ajouté le référent",
      subjectKind: "onboardingReferents",
      subjectId: String(referentId),
      subjectLabel: fullName,
      linkTo: "/onboarding",
      iconKey: "userCheck",
      organismId: process.organismId,
    })

    return { referentId }
  },
})

// ────────── helpers ──────────

async function getProcessByOrganism(
  ctx: QueryCtx,
  organismId: Id<"organisms">,
) {
  return ctx.db
    .query("onboardingProcesses")
    .withIndex("by_organism", (q) => q.eq("organismId", organismId))
    .first()
}

function roleLabel(role: string): string {
  switch (role) {
    case "admin_organisme":
      return "Admin organisme"
    case "agent_superviseur":
      return "Agent superviseur"
    case "admin_technique":
      return "Admin technique (API)"
    case "chef_service":
      return "Chef de service"
    case "officier_signataire":
      return "Officier signataire"
    case "agent_instructeur":
      return "Agent instructeur"
    default:
      return role
  }
}

function authMethodLabel(m: string): string {
  switch (m) {
    case "nip_only":
      return "NIP seul"
    case "nip_carte_agent":
      return "NIP + carte agent"
    case "nip_cle_api":
      return "NIP + clé API"
    default:
      return m
  }
}

function categoryLegalForm(category: string): string {
  switch (category) {
    case "ministere":
      return "Ministère"
    case "direction_generale":
      return "Direction générale (rattachement ministériel)"
    case "etablissement_public":
      return "Établissement public"
    case "collectivite":
      return "Collectivité territoriale"
    case "autorite":
      return "Autorité administrative indépendante"
    case "institution":
      return "Institution"
    default:
      return category
  }
}

async function logActivity(
  ctx: MutationCtx,
  data: {
    actorAgentId: Id<"agents">
    actorDisplayName: string
    verb: string
    subjectKind: string
    subjectId: string
    subjectLabel: string
    linkTo?: string
    iconKey?: string
    organismId?: Id<"organisms">
  },
) {
  await ctx.db.insert("teamActivities", {
    ...data,
    occurredAt: Date.now(),
  })
}
