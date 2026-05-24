import { v } from "convex/values"
import { query } from "../_generated/server"
import { requirePlatformAdmin } from "./auth"
import { aggRequestsByService } from "../aggregates"

/**
 * Vue cross-organismes du catalogue de services (page /catalogue côté
 * console plateforme). Liste tous les services publiés avec stats live
 * (volume 30j via `aggRequestsByService`).
 */
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

export const listAllServices = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requirePlatformAdmin(ctx, token)
    const services = await ctx.db.query("services").collect()
    const orgs = await Promise.all(services.map((s) => ctx.db.get(s.organismId)))
    const now = Date.now()
    const thirtyDaysAgo = now - THIRTY_DAYS_MS

    const rows = await Promise.all(
      services.map(async (s, i) => {
        const org = orgs[i]
        const requests30d = await aggRequestsByService.count(ctx, {
          namespace: s._id,
          bounds: { lower: { key: thirtyDaysAgo, inclusive: true } },
        })
        return {
          id: s._id,
          slug: s.slug,
          title: s.title,
          category: s.category,
          categorySlug: s.categorySlug ?? "",
          orgName: org?.name ?? "—",
          orgShort: org?.shortName ?? org?.name ?? "—",
          status: s.status,
          fee: s.fee,
          delayHours: s.delayHours,
          delay: formatDelayHours(s.delayHours),
          satisfaction: s.satisfaction ?? null,
          requestsLast30d: requests30d,
          online: s.online ?? s.deliveryMode === "online",
        }
      }),
    )

    rows.sort((a, b) => b.requestsLast30d - a.requestsLast30d)

    // Facettes pour filtres
    const categories = [...new Set(rows.map((r) => r.category))].sort()
    const organisms = [...new Set(rows.map((r) => r.orgShort))].sort()
    const stats = {
      total: rows.length,
      published: rows.filter((r) => r.status === "published").length,
      draft: rows.filter((r) => r.status === "draft").length,
      archived: rows.filter((r) => r.status === "archived").length,
    }
    return { services: rows, facets: { categories, organisms }, stats }
  },
})

function formatDelayHours(hours: number): string {
  if (hours < 24) return `${Math.round(hours)} h`
  const days = Math.floor(hours / 24)
  const remH = Math.round(hours - days * 24)
  return remH > 0 ? `${days} j ${remH} h` : `${days} j`
}
