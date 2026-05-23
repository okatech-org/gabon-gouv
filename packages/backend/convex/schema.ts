import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

/**
 * Schéma minimal — l'itération actuelle n'utilise pas le backend (données moquées
 * côté client via @workspace/mocks). Ce squelette permet de lancer Convex et
 * de structurer les tables sans bloquer le développement frontend.
 */
export default defineSchema({
  // Citoyens enregistrés (clé : NIP)
  citizens: defineTable({
    nip: v.string(),
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_nip", ["nip"]),

  // Administrations enregistrées
  organisms: defineTable({
    name: v.string(),
    category: v.string(),
    province: v.optional(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("onboarding"),
      v.literal("suspended"),
    ),
    createdAt: v.number(),
  }).index("by_status", ["status"]),

  // Services proposés par les administrations
  services: defineTable({
    organismId: v.id("organisms"),
    title: v.string(),
    category: v.string(),
    fee: v.string(),
    delayHours: v.number(),
    status: v.union(v.literal("published"), v.literal("draft"), v.literal("archived")),
  }).index("by_organism", ["organismId"]),

  // Demandes citoyennes
  requests: defineTable({
    ref: v.string(),
    citizenId: v.id("citizens"),
    serviceId: v.id("services"),
    organismId: v.id("organisms"),
    status: v.string(),
    progress: v.number(),
    depositedAt: v.number(),
    dueAt: v.optional(v.number()),
    assignedAgentId: v.optional(v.id("agents")),
  })
    .index("by_ref", ["ref"])
    .index("by_citizen", ["citizenId"])
    .index("by_organism", ["organismId"])
    .index("by_status", ["status"]),

  // Agents (membres d'une administration)
  agents: defineTable({
    organismId: v.id("organisms"),
    name: v.string(),
    email: v.string(),
    role: v.string(),
  }).index("by_organism", ["organismId"]),
})
