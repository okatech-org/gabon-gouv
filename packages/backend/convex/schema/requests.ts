import { defineTable } from "convex/server"
import { v } from "convex/values"
import {
  messageFromKindValidator,
  pieceDocTypeValidator,
  pieceStatusValidator,
  requestBeneficiaryKindValidator,
  requestEventKindValidator,
  requestStatusValidator,
  verificationKindValidator,
  verificationStatusValidator,
} from "../lib/enums"

/**
 * Cycle de vie d'une demande citoyen : brouillon → dépôt → instruction →
 * signature → délivrance. Inclut les pièces, les vérifications, le
 * timeline d'événements et les messages 1:1 citoyen↔agent (ADR-0010).
 */
export const requestsTables = {
  // Brouillons sauvegardés pendant le wizard (C4) — séparés de `requests`
  // pour ne pas polluer les statuts métier.
  requestDrafts: defineTable({
    citizenId: v.id("citizens"),
    serviceId: v.id("services"),
    serviceVariantId: v.optional(v.id("serviceVariants")),
    currentStep: v.number(),
    payload: v.any(),
    updatedAt: v.number(),
  }).index("by_citizen", ["citizenId"]),

  // Demandes déposées
  requests: defineTable({
    ref: v.string(), // GC-2026-EC-002841
    citizenId: v.id("citizens"),
    serviceId: v.id("services"),
    serviceVariantId: v.optional(v.id("serviceVariants")),
    organismId: v.id("organisms"),
    assignedAgentId: v.optional(v.id("agents")),
    status: requestStatusValidator,
    progressPct: v.number(),
    progressStepName: v.optional(v.string()),
    depositedAt: v.number(),
    dueAt: v.optional(v.number()),
    issuedAt: v.optional(v.number()),
    rejectedAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),
    numberOfCopies: v.optional(v.number()),
    recipientEmail: v.optional(v.string()),
    beneficiaryKind: v.optional(requestBeneficiaryKindValidator),
    urgent: v.optional(v.boolean()),
    payload: v.optional(v.any()),
    internalNote: v.optional(v.string()),
    // Snapshots consentements RGPD/honneur capturés au dépôt
    consents: v.optional(
      v.object({
        honor: v.boolean(),
        rgpd: v.boolean(),
        consentedAt: v.number(),
      }),
    ),
  })
    .index("by_ref", ["ref"])
    .index("by_organism_status", ["organismId", "status"])
    .index("by_citizen", ["citizenId"])
    .index("by_assigned_agent", ["assignedAgentId"])
    .index("by_service_status", ["serviceId", "status"]),

  // Pièces justificatives téléversées
  pieces: defineTable({
    requestId: v.id("requests"),
    label: v.string(),
    docType: v.optional(pieceDocTypeValidator),
    filename: v.optional(v.string()),
    storageKey: v.optional(v.string()), // ref dans Convex storage
    mimeType: v.optional(v.string()),
    sizeBytes: v.optional(v.number()),
    status: pieceStatusValidator,
    ocrConfidence: v.optional(v.number()),
    ocrExtractedFields: v.optional(v.any()),
    detectedDocType: v.optional(pieceDocTypeValidator),
    required: v.boolean(),
    uploadedAt: v.optional(v.number()),
    validatedAt: v.optional(v.number()),
    validatedByAgentId: v.optional(v.id("agents")),
    rejectionReason: v.optional(v.string()),
  })
    .index("by_request", ["requestId"])
    .index("by_request_status", ["requestId", "status"]),

  // Vérifications automatiques exécutées sur une demande (A3)
  verifications: defineTable({
    requestId: v.id("requests"),
    title: v.string(),
    kind: v.optional(verificationKindValidator),
    status: verificationStatusValidator,
    description: v.string(),
    evidence: v.optional(v.string()), // source de la vérif (« RGPP », « registre LBV »)
    automated: v.optional(v.boolean()),
    performedAt: v.optional(v.number()),
    performedByAgentId: v.optional(v.id("agents")),
    order: v.number(),
  }).index("by_request", ["requestId"]),

  // Événements du timeline d'une demande
  requestEvents: defineTable({
    requestId: v.id("requests"),
    title: v.string(),
    description: v.optional(v.string()),
    // Legacy : champ texte libre ; conservé pour compat avec admin/* existant.
    actor: v.optional(v.string()),
    actorAgentId: v.optional(v.id("agents")),
    actorOrganismId: v.optional(v.id("organisms")),
    occurredAt: v.number(),
    kind: requestEventKindValidator,
  }).index("by_request_time", ["requestId", "occurredAt"]),

  // Messages 1:1 citoyen↔agent attachés à une demande (C5, ADR-0010)
  requestMessages: defineTable({
    requestId: v.id("requests"),
    fromKind: messageFromKindValidator,
    fromCitizenId: v.optional(v.id("citizens")),
    fromAgentId: v.optional(v.id("agents")),
    body: v.string(),
    attachmentStorageKeys: v.optional(v.array(v.string())),
    sentAt: v.number(),
    readAtByCounterparty: v.optional(v.number()),
  })
    .index("by_request_time", ["requestId", "sentAt"])
    .index("by_request_unread", ["requestId", "readAtByCounterparty"]),
}
