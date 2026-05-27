/**
 * Notifications agent — liste + marquer lue.
 *
 * Page `/notifications` admin (fix B4 — précédemment la cloche du
 * header était inerte alors qu'elle affichait un badge non-lu).
 */
import { v } from "convex/values"
import { query } from "../_generated/server"
import { mutation } from "../lib/triggers"
import { requireAgent } from "../auth"

export const listForAgent = query({
  args: {
    token: v.string(),
    scope: v.optional(v.union(v.literal("all"), v.literal("unread"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { token, scope, limit }) => {
    const me = await requireAgent(ctx, token)
    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_recipient_time", (q) =>
        q.eq("recipientKind", "agent").eq("recipientId", String(me._id)),
      )
      .order("desc")
      .collect()

    const filtered =
      scope === "unread" ? rows.filter((n) => n.readAt === undefined) : rows

    const sliced = filtered.slice(0, limit ?? 100)
    return {
      total: filtered.length,
      unreadCount: rows.filter((n) => n.readAt === undefined).length,
      rows: sliced.map((n) => ({
        id: n._id,
        kind: n.kind,
        severity: n.severity,
        title: n.title,
        body: n.body ?? null,
        linkTo: n.linkTo ?? null,
        createdAt: n.createdAt,
        readAt: n.readAt ?? null,
      })),
    }
  },
})

export const markRead = mutation({
  args: { token: v.string(), notificationId: v.id("notifications") },
  handler: async (ctx, { token, notificationId }) => {
    const me = await requireAgent(ctx, token)
    const notif = await ctx.db.get(notificationId)
    if (!notif) throw new Error("Notification introuvable.")
    // Sécurité : on vérifie que la notif appartient bien à l'agent connecté
    if (notif.recipientKind !== "agent" || notif.recipientId !== String(me._id)) {
      throw new Error("Cette notification ne vous appartient pas.")
    }
    if (notif.readAt) return { already: true as const }
    await ctx.db.patch(notificationId, { readAt: Date.now() })
    return { already: false as const }
  },
})

export const markAllRead = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const me = await requireAgent(ctx, token)
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_recipient_unread", (q) =>
        q.eq("recipientKind", "agent").eq("recipientId", String(me._id)),
      )
      .collect()
    const filtered = unread.filter((n) => n.readAt === undefined)
    const now = Date.now()
    for (const n of filtered) {
      await ctx.db.patch(n._id, { readAt: now })
    }
    return { markedCount: filtered.length }
  },
})
