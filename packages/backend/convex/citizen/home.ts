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

/**
 * Compteurs bruts pour le copywriting (sous-titres, phrases).
 * Séparé de getHomeStats qui renvoie un array de cards prêt à afficher.
 */
export const getHomeCounters = query({
  args: {},
  handler: async (ctx) => {
    const [active, allServices] = await Promise.all([
      aggOrgsByStatus.count(ctx, { namespace: "active" }),
      ctx.db.query("services").collect(),
    ])
    const totalServices = allServices.filter(
      (s) => s.status === "published",
    ).length
    return {
      totalServices,
      totalAdministrations: active,
    }
  },
})
