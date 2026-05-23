import { defineTable } from "convex/server"
import { v } from "convex/values"
import {
  agentRoleValidator,
  confidentialityLevelValidator,
  correspondenceStatusValidator,
  signatureCircuitStatusValidator,
  signatureStepStatusValidator,
  signatureSubjectKindValidator,
} from "../lib/enums"

/**
 * Correspondance inter-administrations (A6) + circuits de signature
 * polymorphes (ADR-0009) qui couvrent documents, correspondance et conventions.
 */
export const correspondenceTables = {
  correspondences: defineTable({
    ref: v.string(), // CR-2026-1842
    fromOrganismId: v.id("organisms"),
    toOrganismId: v.id("organisms"),
    subject: v.string(),
    body: v.string(),
    urgent: v.boolean(),
    confidentiality: confidentialityLevelValidator,
    archivePolicy: v.string(), // « 2 ans », « Indéf. »
    status: v.optional(correspondenceStatusValidator),
    sentAt: v.number(),
    dueAt: v.optional(v.number()),
    closedAt: v.optional(v.number()),
    linkedCitizenId: v.optional(v.id("citizens")),
    linkedRequestId: v.optional(v.id("requests")),
    signatureCircuitId: v.optional(v.id("signatureCircuits")),
    participantsCount: v.optional(v.number()),
    attachmentStorageKeys: v.optional(v.array(v.string())),
  })
    .index("by_ref", ["ref"])
    .index("by_to_organism", ["toOrganismId"])
    .index("by_from_organism", ["fromOrganismId"])
    .index("by_to_organism_status", ["toOrganismId", "status"]),

  correspondenceMessages: defineTable({
    correspondenceId: v.id("correspondences"),
    fromAgentId: v.id("agents"),
    body: v.string(),
    signed: v.boolean(), // S/MIME
    sentAt: v.number(),
    attachmentStorageKeys: v.optional(v.array(v.string())),
  }).index("by_correspondence", ["correspondenceId"]),

  correspondenceReads: defineTable({
    correspondenceId: v.id("correspondences"),
    agentId: v.id("agents"),
    readAt: v.number(),
  })
    .index("by_correspondence_agent", ["correspondenceId", "agentId"])
    .index("by_agent", ["agentId"]),

  // ───────────────────────────────────────────────────────────
  // Circuits de signature polymorphes (ADR-0009)
  // Couvrent : documents (A3 « Valider & signer »), correspondances (A6),
  // conventions d'onboarding (P3).
  // ───────────────────────────────────────────────────────────
  signatureCircuits: defineTable({
    subjectKind: signatureSubjectKindValidator,
    // ID polymorphe : pointeur vers documents | correspondences | conventions.
    // Stocké en string parce que Convex ne supporte pas v.union(v.id(...), v.id(...)).
    // Les helpers `convex/lib/signatureCircuit.ts` valident la cohérence.
    subjectId: v.string(),
    status: signatureCircuitStatusValidator,
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    cancelledAt: v.optional(v.number()),
    cancellationReason: v.optional(v.string()),
  })
    .index("by_subject", ["subjectKind", "subjectId"])
    .index("by_status", ["status"]),

  signatureCircuitSteps: defineTable({
    circuitId: v.id("signatureCircuits"),
    order: v.number(),
    assigneeAgentId: v.id("agents"),
    assigneeRoleSnapshot: agentRoleValidator, // rôle au moment de la création
    status: signatureStepStatusValidator,
    decidedAt: v.optional(v.number()),
    comment: v.optional(v.string()),
  })
    .index("by_circuit_order", ["circuitId", "order"])
    .index("by_assignee_status", ["assigneeAgentId", "status"]),
}
