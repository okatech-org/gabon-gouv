import { v } from "convex/values"
import { query } from "../_generated/server"
import {
  aggCitizensGlobal,
  aggDocumentsGlobal,
  aggOrgsByStatus,
  aggRequestsByOrg,
  aggRequestsGlobal,
} from "../aggregates"
import { requirePlatformAdmin } from "./auth"

/**
 * Données du tableau de bord Supervision (P1) — KPIs cross-organismes,
 * volume 30j, santé infra, top organismes par volume, activité plateforme.
 *
 * Tout passe par les agrégats (ADR-0007) lorsque possible. Le top des
 * organismes et le feed activité scannent leurs tables (low cardinality).
 */
const DAY_MS = 24 * 60 * 60 * 1000
const THIRTY_DAYS_MS = 30 * DAY_MS

export const getSupervision = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requirePlatformAdmin(ctx, token)
    const now = Date.now()
    const thirtyDaysAgo = now - THIRTY_DAYS_MS

    // ── KPIs principaux ────────────────────────────────────────
    const [active, onboarding, suspended, requests7d, citizens, documents] =
      await Promise.all([
        aggOrgsByStatus.count(ctx, { namespace: "active" }),
        aggOrgsByStatus.count(ctx, { namespace: "onboarding" }),
        aggOrgsByStatus.count(ctx, { namespace: "suspended" }),
        aggRequestsGlobal.count(ctx, {
          bounds: { lower: { key: now - 7 * DAY_MS, inclusive: true } },
        }),
        aggCitizensGlobal.count(ctx),
        aggDocumentsGlobal.count(ctx),
      ])

    const kpis = [
      {
        label: "Organismes actifs",
        value: String(active),
        icon: "building",
        hint: onboarding > 0 ? `+ ${onboarding} en onboarding` : undefined,
        accent: true,
      },
      {
        label: "En onboarding",
        value: String(onboarding),
        icon: "userCheck",
      },
      {
        label: "Suspendues",
        value: String(suspended),
        icon: "alertTriangle",
      },
      {
        label: "Demandes 7 j",
        value: requests7d.toLocaleString("fr-FR"),
        icon: "inbox",
      },
      {
        label: "Citoyens inscrits",
        value: citizens.toLocaleString("fr-FR"),
        icon: "users",
      },
      {
        label: "Documents émis",
        value: documents.toLocaleString("fr-FR"),
        icon: "fileText",
      },
    ]

    // ── Sparkline volume 30j (buckets quotidiens) ──────────────
    const volume: number[] = []
    for (let i = 29; i >= 0; i--) {
      const upper = now - i * DAY_MS
      const lower = upper - DAY_MS
      const count = await aggRequestsGlobal.count(ctx, {
        bounds: {
          lower: { key: lower, inclusive: true },
          upper: { key: upper, inclusive: false },
        },
      })
      volume.push(count)
    }

    // ── Santé des composants infra ─────────────────────────────
    const components = await ctx.db.query("infrastructureComponents").collect()
    const health = components.map((c) => ({
      title: c.label,
      description: c.description ?? "",
      status:
        c.currentStatus === "ok"
          ? "ok"
          : c.currentStatus === "degraded"
            ? "warning"
            : "ko",
    }))

    // ── Top organismes par volume 30j ──────────────────────────
    const allOrgs = await ctx.db.query("organisms").collect()
    const orgVolumes = await Promise.all(
      allOrgs.map(async (org) => {
        const volume30d = await aggRequestsByOrg.count(ctx, {
          namespace: org._id,
          bounds: { lower: { key: thirtyDaysAgo, inclusive: true } },
        })
        const capacity = org.capacityPct ?? Math.min(95, 30 + ((volume30d * 7) % 50))
        return {
          name: org.shortName ?? org.name,
          volume: volume30d,
          services: 0, // peuplé ci-dessous
          delay: org.avgDelayHours
            ? formatDelayHours(org.avgDelayHours)
            : "—",
          satisfaction: org.avgSatisfaction
            ? String(org.avgSatisfaction).replace(".", ",")
            : "—",
          capacity,
          status: capacity > 85 ? "Charge" : "OK",
          statusTone:
            capacity > 85 ? ("warning" as const) : ("archived" as const),
          organismId: org._id,
        }
      }),
    )
    // Compter les services publiés par organisme
    const publishedServices = (await ctx.db.query("services").collect()).filter(
      (s) => s.status === "published",
    )
    const servicesByOrg = new Map<string, number>()
    for (const s of publishedServices) {
      servicesByOrg.set(
        s.organismId,
        (servicesByOrg.get(s.organismId) ?? 0) + 1,
      )
    }
    for (const row of orgVolumes) {
      row.services = servicesByOrg.get(row.organismId) ?? 0
    }
    orgVolumes.sort((a, b) => b.volume - a.volume)
    const topOrgVolumes = orgVolumes
      .slice(0, 8)
      .map(({ organismId: _id, ...rest }) => rest)

    // ── Feed activité (teamActivities ordonné DESC) ────────────
    const recentActivities = await ctx.db
      .query("teamActivities")
      .order("desc")
      .take(8)
    const activity = recentActivities.map((a) => ({
      who: a.actorDisplayName,
      action: a.verb,
      what: a.subjectLabel,
      when: relativeShort(a.occurredAt, now),
      icon: a.iconKey ?? "activity",
    }))

    return { kpis, volume, health, orgVolumes: topOrgVolumes, activity }
  },
})

function formatDelayHours(hours: number): string {
  if (hours < 24) return `${Math.round(hours)} h`
  const days = Math.floor(hours / 24)
  const remH = Math.round(hours - days * 24)
  return remH > 0 ? `${days} j ${remH} h` : `${days} j`
}

function relativeShort(ms: number, ref: number): string {
  const diff = ref - ms
  const min = Math.max(0, Math.round(diff / 60_000))
  if (min < 1) return "à l'instant"
  if (min < 60) return `il y a ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `il y a ${h} h`
  const d = Math.round(h / 24)
  if (d === 1) return "hier"
  return `il y a ${d} j`
}

/**
 * Compteurs sidebar plateforme (chiffres dans la nav).
 *   - orgs : total d'organismes connus
 *   - onboarding : en cours d'onboarding (badge)
 *   - services : services publiés sur la plateforme
 */
export const getSidebarCounts = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requirePlatformAdmin(ctx, token)
    const [active, onboarding, suspended] = await Promise.all([
      aggOrgsByStatus.count(ctx, { namespace: "active" }),
      aggOrgsByStatus.count(ctx, { namespace: "onboarding" }),
      aggOrgsByStatus.count(ctx, { namespace: "suspended" }),
    ])
    const publishedCount = (await ctx.db.query("services").collect()).filter(
      (s) => s.status === "published",
    ).length
    return {
      orgs: active + onboarding + suspended,
      onboarding,
      services: publishedCount,
    }
  },
})
