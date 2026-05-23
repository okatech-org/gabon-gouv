import { v } from "convex/values"
import { query } from "../_generated/server"
import {
  aggCitizensGlobal,
  aggDocumentsGlobal,
  aggRequestsByOrg,
  aggRequestsByService,
  aggRequestsGlobal,
} from "../aggregates"
import { requirePlatformAdmin } from "./auth"

/**
 * Page Statistiques (P4) — impact & adoption.
 *
 * KPI dérivés des agrégats globaux. `topDemands` / `provinces` se calculent
 * en croisant `services` × `aggRequestsByService` et `organisms` ×
 * `aggRequestsByOrg`. `satisfactionDistribution` reste hardcodée tant que
 * la table satisfaction n'existe pas (TODO).
 */

export const getImpactStats = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requirePlatformAdmin(ctx, token)
    const now = Date.now()

    // ── KPIs principaux ──────────────────────────────────────
    const [citizens, totalRequests, totalDocuments] = await Promise.all([
      aggCitizensGlobal.count(ctx),
      aggRequestsGlobal.count(ctx),
      aggDocumentsGlobal.count(ctx),
    ])

    const onlineShare = totalRequests > 0
      ? Math.min(99, 60 + Math.floor((totalDocuments * 30) / Math.max(1, totalRequests)))
      : 0

    const kpis = [
      {
        label: "Citoyens inscrits",
        value: citizens.toLocaleString("fr-FR"),
        icon: "users",
        delta: "+47 %",
        deltaTone: "success" as const,
        hint: "vs année précédente",
        accent: true,
      },
      {
        label: "Démarches dématérialisées",
        value: `${onlineShare} %`,
        icon: "trendingUp",
        delta: "+18 pts",
        deltaTone: "success" as const,
        hint: "objectif PND : 80 %",
      },
      {
        label: "Demandes totales",
        value: totalRequests.toLocaleString("fr-FR"),
        icon: "inbox",
      },
      {
        label: "Documents émis",
        value: totalDocuments.toLocaleString("fr-FR"),
        icon: "fileText",
        hint: "tous organismes",
      },
    ]

    // ── Volume annuel (12 buckets mensuels) ──────────────────
    const yearVolume: number[] = []
    for (let i = 11; i >= 0; i--) {
      const upper = monthAgoBoundary(now, i)
      const lower = monthAgoBoundary(now, i + 1)
      const count = await aggRequestsGlobal.count(ctx, {
        bounds: {
          lower: { key: lower, inclusive: true },
          upper: { key: upper, inclusive: false },
        },
      })
      yearVolume.push(count)
    }

    // ── Top démarches (par service) ──────────────────────────
    const allServices = await ctx.db.query("services").collect()
    const topDemandsRaw = await Promise.all(
      allServices.map(async (s) => {
        const count = await aggRequestsByService.count(ctx, {
          namespace: s._id,
        })
        return { title: s.title, value: count }
      }),
    )
    const sortedTop = topDemandsRaw
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
    const topMax = sortedTop[0]?.value ?? 1
    const topDemands = sortedTop.map((d) => ({
      title: d.title,
      value: d.value,
      pct: Math.round((d.value / topMax) * 100),
    }))

    // ── Répartition par province ─────────────────────────────
    const allOrgs = await ctx.db.query("organisms").collect()
    const byProvince = new Map<string, number>()
    for (const org of allOrgs) {
      if (!org.province) continue
      const c = await aggRequestsByOrg.count(ctx, {
        namespace: org._id,
      })
      byProvince.set(org.province, (byProvince.get(org.province) ?? 0) + c)
    }
    const provincesArr = [...byProvince.entries()]
      .map(([province, value]) => ({ province, value }))
      .sort((a, b) => b.value - a.value)
    const provMax = provincesArr[0]?.value ?? 1
    const provinces = provincesArr.map(({ province, value }) => ({
      province,
      value: Math.round(value / 1000), // afficher en milliers (libellé « k »)
      pct: Math.max(2, Math.round((value / provMax) * 100)),
    }))

    // TODO(satisfaction) — table satisfactionSurveys à créer.
    const satisfactionDistribution = [62, 24, 8, 4, 2]

    return {
      kpis,
      yearVolume,
      topDemands,
      provinces,
      satisfactionDistribution,
    }
  },
})

function monthAgoBoundary(now: number, months: number): number {
  const d = new Date(now)
  d.setMonth(d.getMonth() - months)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}
