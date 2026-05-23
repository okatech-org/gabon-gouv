import { v } from "convex/values"
import { query } from "../_generated/server"
import { requireAgent } from "../auth"

/* ---------- Liste archives SAE A7 ---------- */
export const list = query({
  args: { token: v.string(), status: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, { token, status, limit }) => {
    const agent = await requireAgent(ctx, token)

    let rows = await ctx.db
      .query("archives")
      .withIndex("by_organism_status", (q) =>
        q.eq("producerOrganismId", agent.organismId),
      )
      .collect()

    if (status && status !== "all") {
      rows = rows.filter((r) => r.status === status)
    }

    rows.sort((a, b) => b.versedAt - a.versedAt)

    return rows.slice(0, limit ?? 50).map((r) => ({
      cote: r.cote,
      description: r.description,
      versedAt: r.versedAt,
      dua: r.dua,
      status: r.status,
      finalSort: r.finalSort,
      sha256: r.sha256,
    }))
  },
})

/* ---------- Stats archives (en-tête A7) ---------- */
export const stats = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const agent = await requireAgent(ctx, token)
    const rows = await ctx.db
      .query("archives")
      .withIndex("by_organism_status", (q) =>
        q.eq("producerOrganismId", agent.organismId),
      )
      .collect()

    const total = rows.length
    const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
    const versedThisMonth = rows.filter((r) => r.versedAt >= monthAgo).length
    const pendingDestruction = rows.filter(
      (r) => r.status === "scheduled_destruction",
    ).length

    return {
      versedThisMonth,
      total,
      pendingDestruction,
      integrityPct: 100, // calcul réel ultérieur
    }
  },
})
