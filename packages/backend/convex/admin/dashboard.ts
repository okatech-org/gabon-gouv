import { v } from "convex/values"
import { query, type QueryCtx } from "../_generated/server"
import { requireAgent } from "../auth"
import type { Id } from "../_generated/dataModel"
import { aggKeys, aggRequestsByOrgAgent, aggRequestsByOrgStatus } from "../aggregates"
import type { RequestStatus } from "../lib/enums"

/**
 * KPIs et données du dashboard A1 — agrégats sur l'organisme de l'agent.
 *
 * Les compteurs « En file d'attente » / « En cours » / « Mes demandes »
 * passent par les agrégats Convex (O(log n), ADR-0007). « Traitées 7j »
 * reste sur un scan indexé restreint au statut `issued` faute d'un
 * agrégat avec sortKey=issuedAt — bornable à terme avec un agrégat dédié.
 */
const IN_PROGRESS_STATUSES: RequestStatus[] = [
  "in_instruction",
  "waiting_pieces",
  "waiting_registry",
  "to_sign",
  "prepared",
]

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export const getDashboard = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const agent = await requireAgent(ctx, token)
    const orgId = agent.organismId

    // ── KPIs via agrégats ────────────────────────────────────
    const [queued, ...inProgressByStatus] = await Promise.all([
      aggRequestsByOrgStatus.count(ctx, {
        namespace: aggKeys.orgStatus(orgId, "submitted"),
      }),
      ...IN_PROGRESS_STATUSES.map((status) =>
        aggRequestsByOrgStatus.count(ctx, {
          namespace: aggKeys.orgStatus(orgId, status),
        }),
      ),
    ])
    const inProgress = inProgressByStatus.reduce((s, n) => s + n, 0)

    // « Traitées 7j » — scan indexé sur (organism, status=issued)
    // borné dans le temps. Volumineux à terme : justifie un agrégat dédié.
    const sevenDaysAgo = Date.now() - SEVEN_DAYS_MS
    const issuedRecent = await ctx.db
      .query("requests")
      .withIndex("by_organism_status", (q) =>
        q.eq("organismId", orgId).eq("status", "issued"),
      )
      .collect()
    const treated = issuedRecent.filter(
      (r) => (r.issuedAt ?? 0) >= sevenDaysAgo,
    ).length

    const kpis = [
      { label: "En file d'attente", value: String(queued), icon: "inbox" },
      { label: "En cours", value: String(inProgress), icon: "refresh" },
      { label: "Traitées 7 j", value: String(treated), icon: "checkCircle" },
      { label: "Délai moyen", value: "1 j 18 h", icon: "clock" },
      { label: "Satisfaction", value: "4,6/5", icon: "star", hint: "184 avis" },
    ]

    // ── Mes demandes assignées (top 5) ────────────────────────
    const myAssigned = await ctx.db
      .query("requests")
      .withIndex("by_assigned_agent", (q) => q.eq("assignedAgentId", agent._id))
      .collect()

    const assignedDetailed = await Promise.all(
      myAssigned.slice(0, 5).map(async (r) => {
        const citizen = await ctx.db.get(r.citizenId)
        const service = await ctx.db.get(r.serviceId)
        return {
          ref: r.ref,
          title: service ? formatServiceTitle(service) : "Service inconnu",
          citizen: citizen?.name ?? "Inconnu",
          status: mapStatus(r.status),
          statusKey: r.status,
          dueAt: r.dueAt,
          depositedAt: r.depositedAt,
          progressPct: r.progressPct,
        }
      }),
    )

    return { kpis, assigned: assignedDetailed }
  },
})

/**
 * Compteurs légers pour la sidebar et les badges header — appelé fréquemment.
 *   - `queue` : file d'attente de l'organisme (badge sidebar)
 *   - `assignedToMe` : demandes assignées à moi (sous-titre du dashboard)
 *   - `correspondenceUnread` : à câbler quand l'agrégat correspondance existera
 */
export const getSidebarCounts = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const agent = await requireAgent(ctx, token)
    const orgId = agent.organismId

    const [
      queue,
      assignedToMe,
      lateOverdue,
      correspondenceUnread,
      signaturesPending,
      notificationsUnread,
    ] = await Promise.all([
      aggRequestsByOrgStatus.count(ctx, {
        namespace: aggKeys.orgStatus(orgId, "submitted"),
      }),
      aggRequestsByOrgAgent.count(ctx, {
        namespace: aggKeys.orgAgent(orgId, agent._id),
      }),
      countLate(ctx, orgId),
      countCorrespondenceUnread(ctx, orgId, agent._id),
      countMySignaturesPending(ctx, agent._id),
      countMyUnreadNotifications(ctx, agent._id),
    ])

    return {
      queue,
      assignedToMe,
      lateOverdue,
      correspondenceUnread,
      signaturesPending,
      notificationsUnread,
    }
  },
})

/** Count des notifications non lues pour l'agent (badge cloche header). */
async function countMyUnreadNotifications(
  ctx: QueryCtx,
  agentId: Id<"agents">,
): Promise<number> {
  const rows = await ctx.db
    .query("notifications")
    .withIndex("by_recipient_unread", (q) =>
      q.eq("recipientKind", "agent").eq("recipientId", String(agentId)),
    )
    .collect()
  return rows.filter((n) => n.readAt === undefined).length
}

/** Count des steps `active` assignés à l'agent (badge sidebar /signatures). */
async function countMySignaturesPending(
  ctx: QueryCtx,
  agentId: Id<"agents">,
): Promise<number> {
  const rows = await ctx.db
    .query("signatureCircuitSteps")
    .withIndex("by_assignee_status", (q) =>
      q.eq("assigneeAgentId", agentId).eq("status", "active"),
    )
    .collect()
  return rows.length
}

async function countLate(
  ctx: QueryCtx,
  orgId: Id<"organisms">,
): Promise<number> {
  const now = Date.now()
  // Toutes les demandes non terminées dont dueAt est dépassé.
  // À remplacer par un agrégat custom si la volumétrie l'exige.
  const open = await ctx.db
    .query("requests")
    .withIndex("by_organism_status", (q) => q.eq("organismId", orgId))
    .collect()
  return open.filter(
    (r) =>
      r.dueAt !== undefined &&
      r.dueAt < now &&
      r.status !== "issued" &&
      r.status !== "rejected" &&
      r.status !== "cancelled",
  ).length
}

async function countCorrespondenceUnread(
  ctx: QueryCtx,
  orgId: Id<"organisms">,
  agentId: Id<"agents">,
): Promise<number> {
  // Aligné sur listInboxV2 (Bloc 5) : on lit les correspondenceRecipients
  // dont recipientOrganismId = mon org, puis on déduplique les corresIds.
  // Avant : on lisait l'index legacy `by_to_organism` (champ toOrganismId v1)
  // ce qui décalait le compteur de la vue → bug B9.
  const recipientRows = await ctx.db
    .query("correspondenceRecipients")
    .withIndex("by_organism_role", (q) =>
      q.eq("recipientOrganismId", orgId),
    )
    .collect()
  const corresIds = new Set(recipientRows.map((r) => r.correspondenceId))
  if (corresIds.size === 0) return 0

  // Filtre : non lu = pas de correspondenceReads pour cet agent
  const reads = await ctx.db
    .query("correspondenceReads")
    .withIndex("by_agent", (q) => q.eq("agentId", agentId))
    .collect()
  const readIds = new Set(reads.map((r) => r.correspondenceId))
  let count = 0
  for (const id of corresIds) {
    if (!readIds.has(id)) count++
  }
  return count
}

function formatServiceTitle(service: { title: string; variant?: string }) {
  return service.variant ? `${service.title} · ${service.variant}` : service.title
}

function mapStatus(status: string): string {
  switch (status) {
    case "submitted":
      return "À traiter"
    case "in_instruction":
      return "En instruction"
    case "waiting_pieces":
      return "Pièces demandées"
    case "waiting_registry":
      return "En attente registre"
    case "prepared":
      return "Préparé"
    case "to_sign":
      return "À signer"
    case "issued":
      return "Signé"
    case "rejected":
      return "Rejeté"
    case "cancelled":
      return "Annulé"
    default:
      return status
  }
}
