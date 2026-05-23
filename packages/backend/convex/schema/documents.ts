import { defineTable } from "convex/server"
import { v } from "convex/values"
import {
  documentStatusValidator,
  provinceCodeValidator,
  publicVerificationOutcomeValidator,
  registryAccuracyLevelValidator,
  registryKindValidator,
} from "../lib/enums"

/**
 * Documents délivrés (actes signés), entrées de registre civil (ADR-0011),
 * et journalisation des vérifications publiques (QR code).
 */
export const documentsTables = {
  // Documents émis avec valeur probante (A5 + C6)
  documents: defineTable({
    actNumber: v.string(), // EC-LBV-2026-04812
    requestId: v.id("requests"),
    citizenId: v.id("citizens"),
    issuedByAgentId: v.id("agents"),
    issuedByAgentNameSnapshot: v.optional(v.string()),
    organismId: v.id("organisms"),
    title: v.string(),
    templateId: v.optional(v.id("documentTemplates")),
    templateVersion: v.optional(v.string()),
    status: v.optional(documentStatusValidator),
    issuedAt: v.number(),
    revokedAt: v.optional(v.number()),
    revocationReason: v.optional(v.string()),
    sha256: v.string(),
    qualifiedTimestamp: v.string(),
    qrCode: v.string(),
    verificationCode: v.optional(v.string()), // « GC-EC-4812 » court
    legalReference: v.optional(v.string()),
    linkedRegistryEntryId: v.optional(v.id("registryEntries")),
    signatureCircuitId: v.optional(v.id("signatureCircuits")),
    payload: v.any(),
    pdfStorageKey: v.optional(v.string()),
  })
    .index("by_act_number", ["actNumber"])
    .index("by_verification_code", ["verificationCode"])
    .index("by_citizen", ["citizenId"])
    .index("by_request", ["requestId"])
    .index("by_organism", ["organismId"]),

  // Vérification publique d'un document via QR / code (C6)
  publicVerifications: defineTable({
    documentId: v.id("documents"),
    verificationCode: v.string(),
    verifiedAt: v.number(),
    outcome: publicVerificationOutcomeValidator,
    verifierIpHash: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  })
    .index("by_document_time", ["documentId", "verifiedAt"])
    .index("by_code", ["verificationCode"]),

  // Entrées de registre civil créées en lazy à la première consultation (ADR-0011)
  registryEntries: defineTable({
    registerCode: v.string(), // « EC-LBV-1992-N »
    kind: registryKindValidator,
    actNumber: v.string(), // « 04812 »
    pageNumber: v.optional(v.number()),
    orderNumber: v.optional(v.number()),
    year: v.number(),
    commune: v.string(),
    provinceCode: v.optional(provinceCodeValidator),
    transcription: v.optional(v.string()),
    marginalMentions: v.optional(v.array(v.string())),
    linkedCitizenId: v.optional(v.id("citizens")),
    accuracyLevel: registryAccuracyLevelValidator,
    verifiedAt: v.optional(v.number()),
    verifiedByAgentId: v.optional(v.id("agents")),
  })
    .index("by_register_act", ["registerCode", "actNumber"])
    .index("by_citizen", ["linkedCitizenId"]),
}
