import { query } from "../_generated/server"
import {
  aggOrgsByStatus,
  aggRequestsGlobal,
} from "../aggregates"

/**
 * Stats publiques affichées sur la home citoyen — calculées depuis les
 * agrégats globaux. Pas d'auth requise.
 */
export const getHomeStats = query({
  args: {},
  handler: async (ctx) => {
    const [active, totalRequests, allServices] = await Promise.all([
      aggOrgsByStatus.count(ctx, { namespace: "active" }),
      aggRequestsGlobal.count(ctx),
      ctx.db.query("services").collect(),
    ])
    const published = allServices.filter((s) => s.status === "published").length
    return [
      { value: String(published), label: "Services disponibles" },
      { value: String(active), label: "Administrations" },
      {
        value: totalRequests.toLocaleString("fr-FR"),
        label: "Demandes traitées",
      },
      { value: "2 j 14 h", label: "Délai moyen de traitement" },
    ]
  },
})
