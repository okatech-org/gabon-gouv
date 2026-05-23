import { defineTable } from "convex/server"
import { v } from "convex/values"
import { dossierAccessLevelValidator } from "../lib/enums"

/**
 * Authentification (NIP simulée v1, IdP réel plus tard) et habilitations
 * d'accès aux dossiers citoyens entre organismes (A4).
 */
export const authTables = {
  // Sessions NIP simulées (à remplacer par un IdP type Keycloak plus tard)
  authSessions: defineTable({
    token: v.string(),
    agentId: v.id("agents"),
    issuedAt: v.number(),
    expiresAt: v.number(),
    revokedAt: v.optional(v.number()),
    userAgent: v.optional(v.string()),
    ipHash: v.optional(v.string()),
  })
    .index("by_token", ["token"])
    .index("by_agent", ["agentId"]),

  // Habilitations d'un organisme sur le dossier d'un citoyen (A4)
  dossierAccessGrants: defineTable({
    citizenId: v.id("citizens"),
    organismId: v.id("organisms"),
    level: dossierAccessLevelValidator,
    scope: v.optional(v.string()), // « B3 », « revenus », « état civil »
    grantedByAgentId: v.id("agents"),
    grantedAt: v.number(),
    expiresAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
    revokedByAgentId: v.optional(v.id("agents")),
    reason: v.optional(v.string()),
  })
    .index("by_citizen", ["citizenId"])
    .index("by_citizen_organism", ["citizenId", "organismId"])
    .index("by_organism", ["organismId"]),
}
