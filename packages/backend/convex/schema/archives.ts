import { defineTable } from "convex/server"
import { v } from "convex/values"
import {
  archiveStatusValidator,
  eliminationBatchStatusValidator,
  finalDispositionValidator,
  integrityCheckOutcomeValidator,
} from "../lib/enums"

/**
 * Système d'Archivage Électronique (SAE — A7), conforme NF Z42-013.
 * Bordereaux d'élimination réglementaire à visa DGAN.
 */
export const archivesTables = {
  // Unités d'archives à valeur probante
  archives: defineTable({
    cote: v.string(), // GA/EC/2026/04812
    description: v.string(),
    producerOrganismId: v.id("organisms"),
    versedAt: v.number(),
    dua: v.string(), // durée d'utilité administrative — « Indéf. », « 75 ans »
    duaExpiresAt: v.optional(v.number()), // date calculée pour le plan d'élimination
    status: archiveStatusValidator,
    finalSort: v.string(), // legacy : champ texte
    finalDisposition: v.optional(finalDispositionValidator),
    sha256: v.string(),
    qualifiedTimestamp: v.optional(v.string()),
    sizeBytes: v.optional(v.number()),
    storageReplicas: v.optional(v.array(v.string())), // « Owendo », « Mvengue »…
    lastIntegrityCheckAt: v.optional(v.number()),
    lastIntegrityCheckOutcome: v.optional(integrityCheckOutcomeValidator),
    linkedDocumentId: v.optional(v.id("documents")),
    linkedRequestId: v.optional(v.id("requests")),
    linkedCorrespondenceId: v.optional(v.id("correspondences")),
    // ─── Bloc 6 — adapter SAE externe (Option C hybride) ───
    // Identifiant et type du SAE externe qui détient l'archive probante.
    // Vides pour les archives gérées localement (LocalSaeProvider).
    externalSaeId: v.optional(v.string()),
    externalSaeKind: v.optional(v.string()), // "digitalium" | "vitam" | …
    externalStatus: v.optional(v.string()),
    externalStatusUpdatedAt: v.optional(v.number()),
  })
    .index("by_cote", ["cote"])
    .index("by_organism_status", ["producerOrganismId", "status"])
    .index("by_dua_expiry", ["duaExpiresAt"])
    .index("by_external_id", ["externalSaeId"]),

  // Lots d'élimination réglementaire (A7) — visa DGAN obligatoire
  eliminationBatches: defineTable({
    producerOrganismId: v.id("organisms"),
    label: v.string(),
    archiveCount: v.number(),
    archiveIds: v.optional(v.array(v.id("archives"))),
    disposition: finalDispositionValidator,
    status: eliminationBatchStatusValidator,
    bordereauStorageKey: v.optional(v.string()),
    requestedAt: v.number(),
    requestedByAgentId: v.id("agents"),
    dganVisaedAt: v.optional(v.number()),
    dganVisaedByAgentId: v.optional(v.id("agents")),
    dganRefusalReason: v.optional(v.string()),
    executedAt: v.optional(v.number()),
  })
    .index("by_organism_status", ["producerOrganismId", "status"])
    .index("by_status", ["status"]),
}
