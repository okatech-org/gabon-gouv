import { defineTable } from "convex/server"
import { v } from "convex/values"
import {
  agentRoleValidator,
  authMethodValidator,
  conventionStatusValidator,
  onboardingStepKeyValidator,
  onboardingStepStatusValidator,
  organismCategoryValidator,
  organismConnectionValidator,
  organismStatusValidator,
  provinceCodeValidator,
} from "../lib/enums"

/**
 * Organismes, agents, processus d'onboarding, conventions, provinces.
 */
export const organismsTables = {
  // ───────────────────────────────────────────────────────────
  // Provinces (référentiel)
  // ───────────────────────────────────────────────────────────
  provinces: defineTable({
    code: provinceCodeValidator,
    name: v.string(),
    order: v.number(),
  }).index("by_code", ["code"]),

  // ───────────────────────────────────────────────────────────
  // Organismes / administrations
  // ───────────────────────────────────────────────────────────
  organisms: defineTable({
    name: v.string(),
    shortName: v.optional(v.string()),
    slug: v.optional(v.string()),
    category: organismCategoryValidator,
    tutelage: v.optional(v.string()),
    tutelageOrganismId: v.optional(v.id("organisms")),
    province: v.optional(v.string()),
    provinceCode: v.optional(provinceCodeValidator),
    status: organismStatusValidator,
    // Legacy : "API + SSO" | "Portail" | "—". Nouveau : connectionKind typé.
    connection: v.optional(v.string()),
    connectionKind: v.optional(organismConnectionValidator),
    signedAt: v.optional(v.string()),
    // Identité officielle
    siege: v.optional(v.string()),
    nif: v.optional(v.string()),
    phone: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    decretCreation: v.optional(v.string()),
    // UI (vitrine et catalogue)
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    // Caches stats (entretenus via aggregate component — ADR-0007)
    volume30d: v.optional(v.number()),
    capacityPct: v.optional(v.number()),
    avgDelayHours: v.optional(v.number()),
    avgSatisfaction: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_category", ["category"])
    .index("by_slug", ["slug"]),

  // ───────────────────────────────────────────────────────────
  // Agents des organismes (back-office)
  // ───────────────────────────────────────────────────────────
  agents: defineTable({
    organismId: v.id("organisms"),
    nip: v.string(),
    name: v.string(),
    email: v.string(),
    role: agentRoleValidator,
    function: v.optional(v.string()), // « DG », « Chef de service juridique »…
    authMethod: v.optional(authMethodValidator),
    active: v.optional(v.boolean()),
  })
    .index("by_nip", ["nip"])
    .index("by_organism", ["organismId"])
    .index("by_email", ["email"])
    .index("by_organism_role", ["organismId", "role"]),

  // ───────────────────────────────────────────────────────────
  // Onboarding d'un organisme (P3) — stepper 7 étapes
  // ───────────────────────────────────────────────────────────
  onboardingProcesses: defineTable({
    organismId: v.id("organisms"),
    currentStepKey: onboardingStepKeyValidator,
    initiatedByAgentId: v.id("agents"),
    initiatedAt: v.number(),
    completedAt: v.optional(v.number()),
  }).index("by_organism", ["organismId"]),

  onboardingSteps: defineTable({
    processId: v.id("onboardingProcesses"),
    key: onboardingStepKeyValidator,
    order: v.number(),
    status: onboardingStepStatusValidator,
    completedAt: v.optional(v.number()),
    completedByAgentId: v.optional(v.id("agents")),
    notes: v.optional(v.string()),
  })
    .index("by_process", ["processId"])
    .index("by_process_order", ["processId", "order"]),

  // Référents désignés pendant l'onboarding (P3 - bloc « Référents »)
  onboardingReferents: defineTable({
    processId: v.id("onboardingProcesses"),
    fullName: v.string(),
    functionTitle: v.string(), // « Directeur général », « DSI »…
    email: v.string(),
    role: agentRoleValidator, // rôle Gabon Connect prévu pour ce référent
    authMethod: authMethodValidator,
    createdAt: v.number(),
  }).index("by_process", ["processId"]),

  // ───────────────────────────────────────────────────────────
  // Conventions d'adhésion (P3 signature)
  // ───────────────────────────────────────────────────────────
  conventions: defineTable({
    organismId: v.id("organisms"),
    version: v.string(),
    title: v.string(),
    pdfStorageKey: v.optional(v.string()),
    articleChecklist: v.array(
      v.object({
        articleNumber: v.string(),
        label: v.string(),
        accepted: v.boolean(),
      }),
    ),
    status: conventionStatusValidator,
    generatedAt: v.number(),
    fullySignedAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
  }).index("by_organism_status", ["organismId", "status"]),
}
