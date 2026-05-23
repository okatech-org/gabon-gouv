import { v } from "convex/values"
import { query } from "../_generated/server"
import { requireAgent } from "../auth"

/* ---------- Catalogue services A8 ---------- */
export const list = query({
  args: { token: v.string(), status: v.optional(v.string()) },
  handler: async (ctx, { token, status }) => {
    const agent = await requireAgent(ctx, token)

    let rows = await ctx.db
      .query("services")
      .withIndex("by_organism_status", (q) => {
        if (status && status !== "all") {
          return q
            .eq("organismId", agent.organismId)
            .eq(
              "status",
              status as "published" | "draft" | "archived",
            )
        }
        return q.eq("organismId", agent.organismId)
      })
      .collect()

    // Compter les demandes 30j par service
    const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
    const allReq = await ctx.db
      .query("requests")
      .withIndex("by_organism_status", (q) =>
        q.eq("organismId", agent.organismId),
      )
      .collect()

    const reqCountByService = new Map<string, number>()
    for (const r of allReq) {
      if (r.depositedAt < monthAgo) continue
      reqCountByService.set(
        r.serviceId,
        (reqCountByService.get(r.serviceId) ?? 0) + 1,
      )
    }

    rows.sort((a, b) =>
      (reqCountByService.get(b._id) ?? 0) - (reqCountByService.get(a._id) ?? 0),
    )

    return rows.map((s) => ({
      slug: s.slug,
      title: s.variant ? `${s.title} · ${s.variant}` : s.title,
      category: s.category,
      status: s.status,
      requests30d: reqCountByService.get(s._id) ?? 0,
      fee: s.fee,
      delayHours: s.delayHours,
      satisfaction: s.satisfaction,
    }))
  },
})
