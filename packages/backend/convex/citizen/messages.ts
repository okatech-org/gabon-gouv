import { v } from "convex/values"
import { query } from "../_generated/server"
import { mutation } from "../lib/triggers"
import { requireCitizen } from "./auth"

/**
 * Agrégateur de messagerie citoyen :
 *   - notifications système (table `notifications` filtrée par recipient)
 *   - messages d'agent dans le cadre d'une demande (`requestMessages`,
 *     ADR-0010, `fromKind === "agent"`)
 *
 * Le flux est trié récent en premier ; chaque entrée porte un `linkTo`
 * vers la demande / document source quand pertinent.
 */
export const listMyMessages = query({
  args: { idnSub: v.string() },
  handler: async (ctx, { idnSub }) => {
    const { citizen } = await requireCitizen(ctx, idnSub)

    // 1) Notifications system / admin
    const notifs = (await ctx.db.query("notifications").collect()).filter(
      (n) => n.recipientKind === "citizen" && n.recipientId === citizen._id,
    )

    // 2) Messages d'agent — on remonte depuis les demandes du citoyen
    const myRequests = await ctx.db
      .query("requests")
      .withIndex("by_citizen", (q) => q.eq("citizenId", citizen._id))
      .collect()
    const requestById = new Map(myRequests.map((r) => [r._id, r]))

    const messageBuckets = await Promise.all(
      myRequests.map((r) =>
        ctx.db
          .query("requestMessages")
          .withIndex("by_request_time", (q) => q.eq("requestId", r._id))
          .collect(),
      ),
    )
    const agentMessages = messageBuckets
      .flat()
      .filter((m) => m.fromKind === "agent")

    // Hydrate les organismes / agents pour affichage
    const agentIds = new Set(agentMessages.map((m) => m.fromAgentId).filter(Boolean))
    const agents = await Promise.all(
      [...agentIds].map((id) => (id ? ctx.db.get(id) : Promise.resolve(null))),
    )
    const agentById = new Map(
      agents.filter(Boolean).map((a) => [a!._id, a!] as const),
    )
    const orgIds = new Set(
      [...agentById.values()].map((a) => a.organismId),
    )
    const orgs = await Promise.all([...orgIds].map((id) => ctx.db.get(id)))
    const orgById = new Map(orgs.filter(Boolean).map((o) => [o!._id, o!] as const))

    // 3) Unification
    type Entry = {
      id: string
      source: "notification" | "agent_message"
      who: string
      whoSub: string | null
      title: string
      body: string
      createdAt: number
      readable: string
      unread: boolean
      severity: "info" | "warning" | "danger" | "success" | null
      linkTo: string | null
      kind: string | null
    }

    const fromNotifs: Entry[] = notifs.map((n) => ({
      id: String(n._id),
      source: "notification",
      who:
        n.kind === "request_status_change" ||
        n.kind === "piece_requested" ||
        n.kind === "document_ready"
          ? "Administration"
          : "Gabon Connect",
      whoSub: notifKindLabel(n.kind),
      title: n.title,
      body: n.body ?? "",
      createdAt: n.createdAt,
      readable: relativeShort(n.createdAt, Date.now()),
      unread: n.readAt === undefined,
      severity: n.severity ?? null,
      linkTo: n.linkTo ?? null,
      kind: n.kind,
    }))

    const fromAgents: Entry[] = agentMessages.map((m) => {
      const agent = m.fromAgentId ? agentById.get(m.fromAgentId) : null
      const org = agent ? orgById.get(agent.organismId) : null
      const req = requestById.get(m.requestId)
      return {
        id: String(m._id),
        source: "agent_message",
        who: agent?.name ?? "Agent",
        whoSub: org?.shortName ?? org?.name ?? null,
        title: req
          ? `Message · ${req.ref}`
          : "Message d'agent",
        body: m.body,
        createdAt: m.sentAt,
        readable: relativeShort(m.sentAt, Date.now()),
        unread: m.readAtByCounterparty === undefined,
        severity: null,
        linkTo: req ? `/mon-espace/demarches/${req.ref}` : null,
        kind: "agent_message",
      }
    })

    const all = [...fromNotifs, ...fromAgents].sort(
      (a, b) => b.createdAt - a.createdAt,
    )
    return {
      messages: all,
      stats: {
        total: all.length,
        unread: all.filter((m) => m.unread).length,
        notifications: fromNotifs.length,
        agentMessages: fromAgents.length,
      },
    }
  },
})

/** Marque une notification comme lue. */
export const markNotificationRead = mutation({
  args: { idnSub: v.string(), notificationId: v.id("notifications") },
  handler: async (ctx, { idnSub, notificationId }) => {
    const { citizen } = await requireCitizen(ctx, idnSub)
    const n = await ctx.db.get(notificationId)
    if (!n) throw new Error("Notification introuvable.")
    if (n.recipientKind !== "citizen" || n.recipientId !== citizen._id) {
      throw new Error("Cette notification ne vous appartient pas.")
    }
    if (!n.readAt) {
      await ctx.db.patch(notificationId, { readAt: Date.now() })
    }
  },
})

/** Marque un message d'agent comme lu (côté citoyen). */
export const markAgentMessageRead = mutation({
  args: { idnSub: v.string(), messageId: v.id("requestMessages") },
  handler: async (ctx, { idnSub, messageId }) => {
    const { citizen } = await requireCitizen(ctx, idnSub)
    const m = await ctx.db.get(messageId)
    if (!m) throw new Error("Message introuvable.")
    const req = await ctx.db.get(m.requestId)
    if (!req || req.citizenId !== citizen._id) {
      throw new Error("Ce message ne vous appartient pas.")
    }
    if (m.fromKind === "agent" && !m.readAtByCounterparty) {
      await ctx.db.patch(messageId, { readAtByCounterparty: Date.now() })
    }
  },
})

// ────────── helpers ──────────

function notifKindLabel(kind: string): string {
  switch (kind) {
    case "request_status_change":
      return "Mise à jour de demande"
    case "piece_requested":
      return "Pièce demandée"
    case "document_ready":
      return "Document prêt"
    case "message_received":
      return "Nouveau message"
    default:
      return ""
  }
}

function relativeShort(ms: number, ref: number): string {
  const diff = Math.max(0, ref - ms)
  const min = Math.round(diff / 60_000)
  if (min < 1) return "à l'instant"
  if (min < 60) return `il y a ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `il y a ${h} h`
  const d = Math.round(h / 24)
  if (d === 1) return "hier"
  return `il y a ${d} j`
}
