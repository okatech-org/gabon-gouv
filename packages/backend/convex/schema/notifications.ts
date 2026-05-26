import { defineTable } from "convex/server"
import { v } from "convex/values"
import {
  notificationChannelValidator,
  notificationKindValidator,
  notificationOutboxStatusValidator,
  notificationRecipientKindValidator,
  notificationSeverityValidator,
} from "../lib/enums"

/**
 * Table unifiée des notifications (ADR-0008) — couvre citoyens, agents et
 * platform admins. Les alertes opérationnelles plateforme (P1) sont
 * stockées ici avec un `recipientKind = "platform_admin"`.
 *
 * **`notificationOutbox`** (Phase Trous A) : file d'envoi pour les canaux
 * externes (email, sms). Le `NotificationProvider` insère dans `notifications`
 * (in-app, toujours) ET dans `notificationOutbox` quand les préférences du
 * destinataire demandent un canal externe. Un worker (Phase 2) videra
 * la file en appelant les providers réels.
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

  notificationOutbox: defineTable({
    notificationId: v.optional(v.id("notifications")),
    recipientKind: notificationRecipientKindValidator,
    recipientId: v.string(),
    channel: notificationChannelValidator, // "email" | "sms" (in_app => insert direct)
    // Adresse résolue au moment du queue (email/téléphone)
    address: v.string(),
    kind: notificationKindValidator,
    severity: notificationSeverityValidator,
    subject: v.string(), // ligne de sujet email ou résumé SMS
    body: v.string(), // corps texte (templates v1 inline)
    linkTo: v.optional(v.string()),
    // Lifecycle
    status: notificationOutboxStatusValidator,
    attempts: v.number(),
    lastError: v.optional(v.string()),
    dispatchedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_status_created", ["status", "createdAt"])
    .index("by_recipient", ["recipientKind", "recipientId"]),
}

/**
 * Préférences de notification persistées par citoyen/agent. Format inline
 * pour éviter une table dédiée (le volume tient en quelques kilo-octets).
 * `undefined` = défaut (in_app uniquement).
 */
export const notificationPreferencesValidator = v.object({
  email: v.optional(v.boolean()),
  sms: v.optional(v.boolean()),
  // Catégories à mute (kind de notification). Vide = tout reçu.
  muteKinds: v.optional(v.array(notificationKindValidator)),
})
