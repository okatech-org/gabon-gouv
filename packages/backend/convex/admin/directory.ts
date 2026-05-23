import { v } from "convex/values"
import { query } from "../_generated/server"
import { requireAgent } from "../auth"

/* ---------- Annuaire A9 — autres organismes ---------- */
export const list = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const me = await requireAgent(ctx, token)

    const organisms = await ctx.db.query("organisms").collect()

    return Promise.all(
      organisms
        .filter((o) => o._id !== me.organismId && o.status === "active")
        .map(async (o) => {
          const services = await ctx.db
            .query("services")
            .withIndex("by_organism_status", (q) =>
              q.eq("organismId", o._id).eq("status", "published"),
            )
            .collect()
          const agents = await ctx.db
            .query("agents")
            .withIndex("by_organism", (q) => q.eq("organismId", o._id))
            .collect()
          const referent = agents.find((a) => a.role === "admin_organisme") ?? agents[0]
          return {
            name: o.name,
            shortName: o.shortName,
            category: o.category,
            tutelage: o.tutelage,
            province: o.province,
            servicesCount: services.length,
            connection: o.connection,
            referent: referent?.name ?? "—",
          }
        }),
    )
  },
})
