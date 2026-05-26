import { defineTable } from "convex/server"
import { v } from "convex/values"
import {
  agentRoleValidator,
  confidentialityLevelValidator,
  correspondenceAttachmentKindValidator,
  correspondenceKindValidator,
  correspondenceMessageFromKindValidator,
  correspondencePartyKindValidator,
  correspondenceRecipientRoleValidator,
  correspondenceStatusValidator,
  correspondenceTemplateStatusValidator,
  externalPartyKindValidator,
  messageBodyFormatValidator,
  signatureCircuitStatusValidator,
  signatureStepStatusValidator,
  signatureSubjectKindValidator,
} from "../lib/enums"

/**
 * Correspondance inter-administrations (Bloc 5) — refonte maximaliste.
 *
 * Refonte vs v1 :
 *   - émetteur polymorphe (senderKind: organism|citizen|external|platform)
 *   - destinataires sortis dans `correspondenceRecipients` (To/CC/BCC)
 *   - AR formels sortis dans `correspondenceAcks` (action distincte du
 *     simple "ouvert" tracé par `correspondenceReads`)
 *   - pièces jointes sorties dans `correspondenceAttachments` (table avec
 *     sha256, mime, lien optionnel vers un acte officiel)
 *   - thread cross-corres via `threadId` UUID + `parentCorrespondenceId`
 *   - liens multi (linkedRequestIds, linkedCitizenIds, etc.)
 *   - kind enum (16 valeurs, 6 familles — cf §4 spec)
 *   - DUA spécifique (`duaCode`, `duaExpiresAt`) + table de règles par kind
 *   - confidentialité 4 niveaux (ajout "secret")
 *
 * Inclut aussi les circuits de signature polymorphes (ADR-0009) qui
 * couvrent documents (Bloc 3), correspondance (Bloc 5), conventions (P3).
 */
export const correspondenceTables = {
  /* ============================================================
     correspondences — table principale
     ============================================================ */
  correspondences: defineTable({
    ref: v.string(), // CR-2026-NNNNN

    // Émetteur polymorphe — senderKind + senderId (id opaque)
    // Optionnel pendant la phase de migration (Phase B refactorera les
    // anciennes mutations pour remplir systématiquement). Toute nouvelle
    // corres créée par les mutations Bloc 5 a senderKind = obligatoire.
    senderKind: v.optional(correspondencePartyKindValidator),
    senderId: v.optional(v.string()),
    // Caches pour les requêtes rapides — au moins UN des deux est défini
    // selon senderKind. Pour external/platform, ces deux sont null.
    fromOrganismId: v.optional(v.id("organisms")),
    fromCitizenId: v.optional(v.id("citizens")),
    // Rétrocompat v1 — destinataire unique organism. Les nouvelles corres
    // utilisent correspondenceRecipients (To/CC/BCC). Supprimable en Phase B
    // une fois les mutations refactorées.
    toOrganismId: v.optional(v.id("organisms")),

    // Classification métier — kind optional pendant migration (Phase B)
    kind: v.optional(correspondenceKindValidator),
    subject: v.string(),
    body: v.string(),
    bodyFormat: v.optional(messageBodyFormatValidator),
    urgent: v.boolean(),
    confidentiality: confidentialityLevelValidator,

    // DUA spécifique (résolue depuis correspondenceKindRules au send)
    duaCode: v.optional(v.string()), // "5y", "30y", "indef", "1y"…
    duaExpiresAt: v.optional(v.number()),
    // Champ texte rétrocompat (v1 stockait juste "2 ans" en libre)
    archivePolicy: v.optional(v.string()),

    // Cycle de vie
    status: correspondenceStatusValidator,
    sentAt: v.optional(v.number()),
    // Rétrocompat v1 — champ générique. Remplacé par dueAckAt/dueReplyAt
    // pour les nouvelles corres. À retirer en Phase B après migration.
    dueAt: v.optional(v.number()),
    dueAckAt: v.optional(v.number()),
    dueReplyAt: v.optional(v.number()),
    closedAt: v.optional(v.number()),
    closedReason: v.optional(v.string()),
    recalledAt: v.optional(v.number()),
    recalledReason: v.optional(v.string()),
    archivedAt: v.optional(v.number()),

    // Thread cross-corres — threadId optional pendant migration
    threadId: v.optional(v.string()),
    parentCorrespondenceId: v.optional(v.id("correspondences")),

    // Liens multi (refonte des linkedRequestId/linkedCitizenId singuliers)
    linkedRequestIds: v.optional(v.array(v.id("requests"))),
    linkedCitizenIds: v.optional(v.array(v.id("citizens"))),
    linkedDocumentIds: v.optional(v.array(v.id("documents"))),
    linkedCorrespondenceIds: v.optional(v.array(v.id("correspondences"))),

    // Compat rétrocompat avec v1 (singuliers — à retirer dans une migration future)
    linkedRequestId: v.optional(v.id("requests")),
    linkedCitizenId: v.optional(v.id("citizens")),

    // Circuit de signature polymorphe (Bloc 3 réutilisé)
    signatureCircuitId: v.optional(v.id("signatureCircuits")),

    // Caches d'agrégation
    participantsCount: v.optional(v.number()),
    messagesCount: v.optional(v.number()),
    attachmentsCount: v.optional(v.number()),
    // Compat v1 (à retirer après migration data)
    attachmentStorageKeys: v.optional(v.array(v.string())),

    // Audit
    createdByAgentId: v.optional(v.id("agents")),
    createdByCitizenId: v.optional(v.id("citizens")),
  })
    .index("by_ref", ["ref"])
    .index("by_thread", ["threadId"])
    .index("by_from_organism", ["fromOrganismId"])
    .index("by_from_organism_status", ["fromOrganismId", "status"])
    .index("by_from_citizen", ["fromCitizenId"])
    .index("by_kind_status", ["kind", "status"])
    // Compat v1 — pointent sur toOrganismId (champ rétrocompat).
    // À supprimer en Phase B une fois `listInbox` refactorée pour utiliser
    // correspondenceRecipients.
    .index("by_to_organism", ["toOrganismId"])
    .index("by_to_organism_status", ["toOrganismId", "status"]),

  /* ============================================================
     correspondenceRecipients — destinataires To/CC/BCC polymorphes
     ============================================================ */
  correspondenceRecipients: defineTable({
    correspondenceId: v.id("correspondences"),
    role: correspondenceRecipientRoleValidator, // to | cc | bcc

    // Récepteur polymorphe
    recipientKind: correspondencePartyKindValidator,
    recipientId: v.string(),
    // Caches pour requêtes rapides
    recipientOrganismId: v.optional(v.id("organisms")),
    recipientCitizenId: v.optional(v.id("citizens")),
    recipientExternalPartyId: v.optional(v.id("externalParties")),

    // Snapshot au moment de l'envoi (nom + email pour externals)
    recipientNameSnapshot: v.string(),
    recipientEmailSnapshot: v.optional(v.string()),

    // Tracking
    notifiedAt: v.optional(v.number()),
    firstReadAt: v.optional(v.number()),
  })
    .index("by_correspondence", ["correspondenceId"])
    .index("by_correspondence_role", ["correspondenceId", "role"])
    .index("by_organism_role", ["recipientOrganismId", "role"])
    .index("by_citizen", ["recipientCitizenId"]),

  /* ============================================================
     correspondenceAcks — accusés de réception formels (action explicite)
     ============================================================ */
  correspondenceAcks: defineTable({
    correspondenceId: v.id("correspondences"),
    recipientId: v.id("correspondenceRecipients"),
    ackedByAgentId: v.optional(v.id("agents")), // si org-receiver
    ackedByCitizenId: v.optional(v.id("citizens")), // si citizen-receiver
    ackedAt: v.number(),
    note: v.optional(v.string()),
  })
    .index("by_correspondence", ["correspondenceId"])
    .index("by_recipient", ["recipientId"]),

  /* ============================================================
     correspondenceMessages — fil dans une corres
     ============================================================ */
  correspondenceMessages: defineTable({
    correspondenceId: v.id("correspondences"),

    // Émetteur polymorphe (agent | citoyen | système) — optional pendant
    // migration (Phase B refactorera les mutations existantes pour le remplir).
    fromKind: v.optional(correspondenceMessageFromKindValidator),
    fromAgentId: v.optional(v.id("agents")),
    fromCitizenId: v.optional(v.id("citizens")),
    fromOrganismIdSnapshot: v.optional(v.id("organisms")),

    body: v.string(),
    bodyFormat: v.optional(messageBodyFormatValidator),

    // S/MIME (stub v1 — interface prête pour vraie PKI)
    signed: v.boolean(),
    signatureFingerprint: v.optional(v.string()),
    signatureAlgorithm: v.optional(v.string()),
    signedAt: v.optional(v.number()),

    sentAt: v.number(),
    editedAt: v.optional(v.number()),
    isSystem: v.optional(v.boolean()),

    // Compat v1 — à retirer après migration
    attachmentStorageKeys: v.optional(v.array(v.string())),
  })
    .index("by_correspondence", ["correspondenceId"])
    .index("by_correspondence_time", ["correspondenceId", "sentAt"]),

  /* ============================================================
     correspondenceReads — track passif d'ouverture (per agent)
     Distinct des AR formels (correspondenceAcks).
     ============================================================ */
  correspondenceReads: defineTable({
    correspondenceId: v.id("correspondences"),
    agentId: v.id("agents"),
    readAt: v.number(),
  })
    .index("by_correspondence_agent", ["correspondenceId", "agentId"])
    .index("by_agent", ["agentId"]),

  /* ============================================================
     correspondenceAttachments — table dédiée (refactor de l'array inline)
     ============================================================ */
  correspondenceAttachments: defineTable({
    correspondenceId: v.id("correspondences"),
    messageId: v.optional(v.id("correspondenceMessages")),
    filename: v.string(),
    mimeType: v.string(),
    sizeBytes: v.number(),
    storageKey: v.string(),
    sha256: v.string(),
    kind: correspondenceAttachmentKindValidator,
    linkedDocumentId: v.optional(v.id("documents")),
    // Surcharge confidentialité si plus restrictive que la corres
    confidentiality: v.optional(confidentialityLevelValidator),
    // S/MIME au niveau PJ
    signed: v.boolean(),
    signatureFingerprint: v.optional(v.string()),
    uploadedByAgentId: v.optional(v.id("agents")),
    uploadedByCitizenId: v.optional(v.id("citizens")),
    uploadedAt: v.number(),
  })
    .index("by_correspondence", ["correspondenceId"])
    .index("by_message", ["messageId"])
    .index("by_linked_document", ["linkedDocumentId"]),

  /* ============================================================
     externalParties — partenaires externes (notaires, ambassades…)
     ============================================================ */
  externalParties: defineTable({
    kind: externalPartyKindValidator,
    name: v.string(),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    country: v.optional(v.string()),
    createdByAgentId: v.optional(v.id("agents")),
    createdAt: v.number(),
  })
    .index("by_name", ["name"])
    .index("by_kind", ["kind"]),

  /* ============================================================
     correspondenceTemplates — modèles de lettres par kind
     ============================================================ */
  correspondenceTemplates: defineTable({
    // null = template global Gabon Connect ; sinon = template spécifique à l'org
    organismId: v.optional(v.id("organisms")),
    kind: correspondenceKindValidator,
    slug: v.string(),
    title: v.string(),
    bodyTemplate: v.string(),
    status: correspondenceTemplateStatusValidator,
    version: v.string(),
    createdAt: v.number(),
    createdByAgentId: v.optional(v.id("agents")),
  })
    .index("by_organism_kind", ["organismId", "kind"])
    .index("by_kind_status", ["kind", "status"])
    .index("by_slug", ["slug"]),

  /* ============================================================
     correspondenceKindRules — règles métier par kind
     Ajustables par admin technique (pas hardcodé).
     ============================================================ */
  correspondenceKindRules: defineTable({
    kind: correspondenceKindValidator,
    requiresCircuit: v.boolean(),
    requiresAttachment: v.boolean(),
    duaCode: v.string(),
    // null = pas d'échéance applicable
    ackDeadlineDays: v.optional(v.number()),
    replyDeadlineDays: v.optional(v.number()),
    // Délai d'inactivité avant clôture automatique (cron mensuel)
    autoCloseAfterDays: v.optional(v.number()),
    defaultConfidentiality: confidentialityLevelValidator,
  }).index("by_kind", ["kind"]),

  /* ============================================================
     Circuits de signature polymorphes (ADR-0009) — inchangés
     Couvrent : documents (Bloc 3), correspondance (Bloc 5), conventions (P3).
     ============================================================ */
  signatureCircuits: defineTable({
    subjectKind: signatureSubjectKindValidator,
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
    assigneeRoleSnapshot: agentRoleValidator,
    status: signatureStepStatusValidator,
    decidedAt: v.optional(v.number()),
    comment: v.optional(v.string()),
  })
    .index("by_circuit_order", ["circuitId", "order"])
    .index("by_assignee_status", ["assigneeAgentId", "status"]),
}
