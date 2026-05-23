import { defineTable } from "convex/server"
import { v } from "convex/values"
import {
  notificationKindValidator,
  notificationRecipientKindValidator,
  notificationSeverityValidator,
} from "../lib/enums"

/**
 * Table unifiée des notifications (ADR-0008) — couvre citoyens, agents et
 * platform admins. Les alertes opérationnelles plateforme (P1) sont
 * stockées ici avec un `recipientKind = "platform_admin"`.
 */
export const notificationsTables = {
  notifications: defineTable({
    recipientKind: notificationRecipientKindValidator,
    // ID polymorphe : citizens | agents | (futur) platform users.
    recipientId: v.string(),
    kind: notificationKindValidator,
    severity: notificationSeverityValidator,
    title: v.string(),
    body: v.optional(v.string()),
    linkTo: v.optional(v.string()),
    metadata: v.optional(v.any()),
    // Pour les alertes opérationnelles (P1)
    linkedOrganismId: v.optional(v.id("organisms")),
    linkedComponentId: v.optional(v.id("infrastructureComponents")),
    linkedRequestId: v.optional(v.id("requests")),
    acknowledgedByAgentId: v.optional(v.id("agents")),
    acknowledgedAt: v.optional(v.number()),
    resolvedAt: v.optional(v.number()),
    readAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_recipient_unread", ["recipientKind", "recipientId", "readAt"])
    .index("by_recipient_time", ["recipientKind", "recipientId", "createdAt"])
    .index("by_organism", ["linkedOrganismId"]),
}
