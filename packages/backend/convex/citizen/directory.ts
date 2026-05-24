import { query } from "../_generated/server"

/**
 * Annuaire des administrations (vue citoyen) — public.
 * Liste les organismes actifs (publiés au catalogue, status=active).
 */
export const listOrganisms = query({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.db.query("organisms").collect()
    const services = await ctx.db.query("services").collect()
    const publishedByOrg = new Map<string, number>()
    for (const s of services) {
      if (s.status !== "published") continue
      publishedByOrg.set(s.organismId, (publishedByOrg.get(s.organismId) ?? 0) + 1)
    }

    return orgs
      .filter((o) => o.status === "active")
      .map((o) => ({
        id: o._id,
        name: o.name,
        category: categoryLabel(o.category),
        servicesCount: publishedByOrg.get(o._id) ?? 0,
        theme: themeFromCategory(o.category),
        icon: o.icon ?? "building",
        delay: o.avgDelayHours ? formatDelayHours(o.avgDelayHours) : "—",
        tone: o.color ?? "#1a4480",
      }))
      .sort((a, b) => b.servicesCount - a.servicesCount)
  },
})

function categoryLabel(category: string): string {
  switch (category) {
    case "ministere":
      return "Ministère"
    case "direction_generale":
      return "Direction générale"
    case "etablissement_public":
      return "Établissement public"
    case "collectivite":
      return "Collectivité"
    case "autorite":
      return "Autorité"
    case "institution":
      return "Institution"
    default:
      return category
  }
}

function themeFromCategory(category: string): string {
  switch (category) {
    case "direction_generale":
      return "Démarches centrales"
    case "ministere":
      return "Politique publique"
    case "collectivite":
      return "Vie locale"
    case "etablissement_public":
      return "Service public"
    case "autorite":
      return "Régulation"
    case "institution":
      return "Institution"
    default:
      return category
  }
}

function formatDelayHours(hours: number): string {
  if (hours < 24) return `${Math.round(hours)} h`
  const days = Math.floor(hours / 24)
  return `${days} j`
}
