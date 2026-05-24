import { v } from "convex/values"
import { query } from "../_generated/server"
import { requirePlatformAdmin } from "./auth"

/**
 * Vue détaillée des composants d'infrastructure (page /infrastructure
 * côté console plateforme). Lit la table `infrastructureComponents`.
 */
export const listInfrastructure = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requirePlatformAdmin(ctx, token)
    const components = await ctx.db
      .query("infrastructureComponents")
      .collect()
    components.sort((a, b) => a.label.localeCompare(b.label))

    const view = components.map((c) => ({
      id: c._id,
      key: c.key,
      label: c.label,
      description: c.description ?? "",
      currentStatus: c.currentStatus,
      statusLabel: statusLabel(c.currentStatus),
      uptimePct30d: c.uptimePct30d ?? null,
      latencyMsP95: c.latencyMsP95 ?? null,
      region: c.region ?? null,
      lastCheckedAt: c.lastCheckedAt ?? null,
      lastCheckedRelative: c.lastCheckedAt
        ? relativeShort(c.lastCheckedAt, Date.now())
        : "—",
    }))

    const stats = {
      total: view.length,
      ok: view.filter((c) => c.currentStatus === "ok").length,
      degraded: view.filter((c) => c.currentStatus === "degraded").length,
      down: view.filter((c) => c.currentStatus === "down").length,
      maintenance: view.filter((c) => c.currentStatus === "maintenance").length,
      avgUptime:
        view.reduce((s, c) => s + (c.uptimePct30d ?? 0), 0) /
        Math.max(1, view.filter((c) => c.uptimePct30d != null).length),
    }
    return { components: view, stats }
  },
})

function statusLabel(s: string): string {
  switch (s) {
    case "ok":
      return "Opérationnel"
    case "degraded":
      return "Dégradé"
    case "down":
      return "Indisponible"
    case "maintenance":
      return "Maintenance"
    default:
      return s
  }
}

function relativeShort(ms: number, ref: number): string {
  const diff = Math.max(0, ref - ms)
  const sec = Math.round(diff / 1000)
  if (sec < 60) return `il y a ${sec} sec`
  const min = Math.round(sec / 60)
  if (min < 60) return `il y a ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `il y a ${h} h`
  const d = Math.round(h / 24)
  return `il y a ${d} j`
}
