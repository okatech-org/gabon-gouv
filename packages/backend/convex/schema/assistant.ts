import { defineTable } from "convex/server"
import { v } from "convex/values"
import {
  conversationPrincipalKindValidator,
  conversationTransportValidator,
  messageRoleValidator,
} from "../lib/enums"

/**
 * Assistant IA contextuel — bulle flottante présente dans les 3 apps.
 * Rétention de 30 jours (purgée par cron, voir convex/crons.ts).
 */
export const assistantTables = {
  assistantConversations: defineTable({
    principalKind: conversationPrincipalKindValidator,
    // ID polymorphe — citizens | agents | platform admins.
    principalId: v.string(),
    transport: conversationTransportValidator,
    // Snapshot du contexte au démarrage (app + écran + détail + démarche en cours)
    contextSnapshot: v.object({
      app: v.string(),
      screen: v.string(),
      detail: v.optional(v.string()),
      relatedRequestId: v.optional(v.id("requests")),
      relatedDocumentId: v.optional(v.id("documents")),
      relatedOrganismId: v.optional(v.id("organisms")),
    }),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    purgeAt: v.number(), // date de purge planifiée (= startedAt + 30j)
  })
    .index("by_principal_time", ["principalKind", "principalId", "startedAt"])
    .index("by_purge", ["purgeAt"]),

  assistantMessages: defineTable({
    conversationId: v.id("assistantConversations"),
    role: messageRoleValidator,
    body: v.string(),
    // Sources citées (« Art. 47 Code civil », « DG-EC · Procédure 2024-12 »)
    sources: v.optional(v.array(v.string())),
    // Actions proposées par l'assistant (CTA dans la bulle)
    suggestedActions: v.optional(
      v.array(
        v.object({
          label: v.string(),
          actionKey: v.string(), // mappé à une mutation côté code
          icon: v.optional(v.string()),
          payload: v.optional(v.any()),
        }),
      ),
    ),
    audioStorageKey: v.optional(v.string()),
    audioDurationMs: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_conversation_time", ["conversationId", "createdAt"]),
}
