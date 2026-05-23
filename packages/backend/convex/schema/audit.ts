import { defineTable } from "convex/server"
import { v } from "convex/values"
import {
  actorKindValidator,
  auditVerbValidator,
  componentStatusValidator,
} from "../lib/enums"

/**
 * Journal d'audit immuable scellé quotidiennement (NF Z42-013) ET feed
 * d'activité d'équipe pour l'UI — séparés (ADR-0012).
 * + Santé des composants d'infrastructure (P1).
 */
export const auditTables = {
  // Journal probant — append-only, scellé par lot quotidien
  auditLog: defineTable({
    verb: auditVerbValidator,
    actorKind: actorKindValidator,
    actorAgentId: v.optional(v.id("agents")),
    actorCitizenId: v.optional(v.id("citizens")),
    subjectKind: v.string(), // « requests » | « documents » | « archives »…
    subjectId: v.string(),
    organismId: v.optional(v.id("organisms")),
    occurredAt: v.number(),
    payloadHash: v.string(), // SHA-256 du payload pour intégrité
    payload: v.optional(v.any()), // détails non scellés (peut être stocké hors-ligne)
    dailySealId: v.optional(v.id("auditDailySeals")),
  })
    .index("by_subject", ["subjectKind", "subjectId"])
    .index("by_organism_time", ["organismId", "occurredAt"])
    .index("by_daily_seal", ["dailySealId"])
    .index("by_actor_agent_time", ["actorAgentId", "occurredAt"]),

  // Scellements quotidiens du journal (chaîne de hashes)
  auditDailySeals: defineTable({
    day: v.string(), // « 2026-05-23 »
    entryCount: v.number(),
    rangeStart: v.number(),
    rangeEnd: v.number(),
    sha256Chain: v.string(),
    previousSealId: v.optional(v.id("auditDailySeals")),
    sealedAt: v.number(),
    qualifiedTimestamp: v.optional(v.string()),
  }).index("by_day", ["day"]),

  // Feed d'activité pour l'UI (A1, P1) — modifiable, redécorable
  teamActivities: defineTable({
    organismId: v.optional(v.id("organisms")), // null = activité plateforme
    actorAgentId: v.optional(v.id("agents")),
    actorDisplayName: v.string(), // snapshot pour affichage rapide
    verb: v.string(), // verbe localisé (« a signé », « a versé », « a transféré »)
    subjectKind: v.string(),
    subjectId: v.optional(v.string()),
    subjectLabel: v.string(), // « Acte EC-LBV-2026-04812 », « 32 actes au SAE »
    linkTo: v.optional(v.string()),
    iconKey: v.optional(v.string()),
    occurredAt: v.number(),
  })
    .index("by_organism_time", ["organismId", "occurredAt"])
    .index("by_agent_time", ["actorAgentId", "occurredAt"]),

  // Composants d'infrastructure surveillés (P1)
  infrastructureComponents: defineTable({
    key: v.string(), // « api_public », « rgpp », « sae », « smime »…
    label: v.string(),
    description: v.optional(v.string()),
    currentStatus: componentStatusValidator,
    uptimePct30d: v.optional(v.number()),
    latencyMsP95: v.optional(v.number()),
    region: v.optional(v.string()),
    lastCheckedAt: v.optional(v.number()),
  }).index("by_key", ["key"]),
}
