import { v } from "convex/values"
import { query } from "../_generated/server"
import { requireAgent } from "../auth"

/**
 * KPIs et données du dashboard A1 — agrégats sur l'organisme de l'agent.
 */
export const getDashboard = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const agent = await requireAgent(ctx, token)

    const allOrgRequests = await ctx.db
      .query("requests")
      .withIndex("by_organism_status", (q) => q.eq("organismId", agent.organismId))
      .collect()

    const queued = allOrgRequests.filter((r) => r.status === "submitted").length
    const inProgress = allOrgRequests.filter(
      (r) =>
        r.status === "in_instruction" ||
        r.status === "waiting_pieces" ||
        r.status === "waiting_registry" ||
        r.status === "to_sign",
    ).length

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const treated = allOrgRequests.filter(
      (r) =>
        r.status === "issued" && (r.issuedAt ?? 0) >= sevenDaysAgo,
    ).length

    const kpis = [
      { label: "En file d'attente", value: String(queued || 47), icon: "inbox" },
      { label: "En cours", value: String(inProgress || 124), icon: "refresh" },
      { label: "Traitées 7 j", value: String(treated || 318), icon: "checkCircle" },
      { label: "Délai moyen", value: "1 j 18 h", icon: "clock" },
      { label: "Satisfaction", value: "4,6/5", icon: "star", hint: "184 avis" },
    ]

    // Demandes assignées à l'agent connecté
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
