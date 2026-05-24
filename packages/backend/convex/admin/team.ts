import { v } from "convex/values"
import { query } from "../_generated/server"
import { requireAgent } from "../auth"
import { aggKeys, aggRequestsByOrgAgent } from "../aggregates"

/**
 * Liste des membres de l'équipe (agents) appartenant au même organisme
 * que l'agent connecté. Inclut le volume de demandes assignées par agent
 * (via `aggRequestsByOrgAgent`, ADR-0007).
 *
 * Source des données : table `agents` filtrée par `organismId`.
 */
export const listTeamMembers = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const me = await requireAgent(ctx, token)
    const orgId = me.organismId

    const agents = await ctx.db
      .query("agents")
      .withIndex("by_organism", (q) => q.eq("organismId", orgId))
      .collect()

    // Compteur de demandes assignées par agent (live via aggregate)
    const withCounts = await Promise.all(
      agents.map(async (a) => {
        const assignedCount = await aggRequestsByOrgAgent.count(ctx, {
          namespace: aggKeys.orgAgent(orgId, a._id),
        })
        return {
          id: a._id,
          name: a.name,
          email: a.email,
          nip: a.nip,
          role: a.role,
          roleLabel: roleLabel(a.role),
          function: a.function ?? "—",
          authMethod: a.authMethod ?? "nip_only",
          authMethodLabel: authMethodLabel(a.authMethod),
          active: a.active ?? true,
          assignedCount,
          isMe: a._id === me._id,
        }
      }),
    )

    // Tri : moi d'abord, puis par rôle (admin → instructeur), puis par nom
    const roleOrder: Record<string, number> = {
      admin_organisme: 0,
      officier_signataire: 1,
      chef_service: 2,
      agent_superviseur: 3,
      agent_instructeur: 4,
      admin_technique: 5,
      platform_admin: 6,
    }
    withCounts.sort((a, b) => {
      if (a.isMe !== b.isMe) return a.isMe ? -1 : 1
      const r = (roleOrder[a.role] ?? 99) - (roleOrder[b.role] ?? 99)
      if (r !== 0) return r
      return a.name.localeCompare(b.name)
    })

    // Stats globales pour KPI en tête
    const stats = {
      total: withCounts.length,
      active: withCounts.filter((a) => a.active).length,
      byRole: withCounts.reduce<Record<string, number>>((acc, a) => {
        acc[a.role] = (acc[a.role] ?? 0) + 1
        return acc
      }, {}),
    }

    return { members: withCounts, stats }
  },
})

function roleLabel(role: string): string {
  switch (role) {
    case "agent_instructeur":
      return "Agent instructeur"
    case "agent_superviseur":
      return "Agent superviseur"
    case "chef_service":
      return "Chef de service"
    case "officier_signataire":
      return "Officier signataire"
    case "admin_organisme":
      return "Admin organisme"
    case "admin_technique":
      return "Admin technique"
    case "platform_admin":
      return "Admin plateforme"
    default:
      return role
  }
}

function authMethodLabel(m: string | undefined): string {
  switch (m) {
    case "nip_only":
      return "NIP"
    case "nip_carte_agent":
      return "NIP + carte agent"
    case "nip_cle_api":
      return "NIP + clé API"
    default:
      return "—"
  }
}
