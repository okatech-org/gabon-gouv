import { v } from "convex/values"
import { query, type MutationCtx } from "../_generated/server"
import { mutation } from "../lib/triggers" // wrapper trigger-aware (ADR-0007)
import type { Id } from "../_generated/dataModel"
import { aggRequestsByOrg } from "../aggregates"
import { assertCan } from "../lib/permissions"
import {
  organismCategoryValidator,
  organismConnectionValidator,
  provinceCodeValidator,
} from "../lib/enums"
import { requirePlatformAdmin } from "./auth"

/**
 * Registre des organismes pour la page P2 (lecture) + cycle de vie côté
 * plateforme : enregistrement d'un nouvel organisme, suspension, réactivation.
 *
 * L'enregistrement crée systématiquement l'organisme en `onboarding` et
 * démarre un `onboardingProcesses` avec ses 7 étapes (ADR-0009 onboarding).
 */
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

const ONBOARDING_STEPS = [
  "identification",
  "referents",
  "habilitations",
  "convention",
  "services_catalog",
  "integration_tests",
  "production",
] as const

export const listOrganisms = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requirePlatformAdmin(ctx, token)
    const now = Date.now()
    const thirtyDaysAgo = now - THIRTY_DAYS_MS

    const all = await ctx.db.query("organisms").collect()
    const allServices = await ctx.db.query("services").collect()
    const publishedByOrg = new Map<string, number>()
    for (const s of allServices) {
      if (s.status !== "published") continue
      publishedByOrg.set(s.organismId, (publishedByOrg.get(s.organismId) ?? 0) + 1)
    }

    const rows = await Promise.all(
      all.map(async (org) => {
        const volume30d = await aggRequestsByOrg.count(ctx, {
          namespace: org._id,
          bounds: { lower: { key: thirtyDaysAgo, inclusive: true } },
        })
        return {
          id: org._id,
          name: org.name,
          shortName: org.shortName,
          category: categoryLabel(org.category),
          province: org.province ?? "—",
          status: statusLabel(org.status),
          statusTone: statusTone(org.status),
          rawStatus: org.status,
          connection: connectionLabel(org.connection, org.connectionKind),
          services: publishedByOrg.get(org._id) ?? 0,
          volume: volume30d > 0 ? volume30d.toLocaleString("fr-FR") : "—",
          signedAt: org.signedAt ?? (org.status === "onboarding" ? "En cours" : "—"),
        }
      }),
    )

    // Tri : actives puis onboarding puis suspendues, et par volume décroissant.
    const rank: Record<string, number> = {
      active: 0,
      onboarding: 1,
      suspended: 2,
    }
    rows.sort((a, b) => {
      const r = rank[a.rawStatus] - rank[b.rawStatus]
      if (r !== 0) return r
      const va = a.volume === "—" ? 0 : Number(a.volume.replace(/\D/g, ""))
      const vb = b.volume === "—" ? 0 : Number(b.volume.replace(/\D/g, ""))
      return vb - va
    })
    return rows
  },
})

/** Compteurs StatCard de la page P2 (Total / Actives / Onboarding / Suspendues / Provinces). */
export const getRegistryStats = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requirePlatformAdmin(ctx, token)
    const all = await ctx.db.query("organisms").collect()
    const active = all.filter((o) => o.status === "active").length
    const onboarding = all.filter((o) => o.status === "onboarding").length
    const suspended = all.filter((o) => o.status === "suspended").length
    const provinces = new Set(all.map((o) => o.provinceCode).filter(Boolean)).size
    return {
      total: all.length,
      active,
      onboarding,
      suspended,
      provinces,
    }
  },
})

export const registerOrganism = mutation({
  args: {
    token: v.string(),
    name: v.string(),
    shortName: v.optional(v.string()),
    category: organismCategoryValidator,
    province: v.optional(v.string()),
    provinceCode: v.optional(provinceCodeValidator),
    siege: v.optional(v.string()),
    nif: v.optional(v.string()),
    phone: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    decretCreation: v.optional(v.string()),
    connectionKind: v.optional(organismConnectionValidator),
  },
  handler: async (ctx, args) => {
    const { actor, agent } = await requirePlatformAdmin(ctx, args.token)
    assertCan(actor, "organism.register")

    const trimmedName = args.name.trim()
    if (!trimmedName) throw new Error("Le nom de l'organisme est requis.")

    const slug = slugify(args.shortName ?? trimmedName)
    const existing = await ctx.db
      .query("organisms")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first()
    if (existing) {
      throw new Error(
        "Un organisme avec un slug équivalent existe déjà — vérifiez le nom.",
      )
    }

    const organismId = await ctx.db.insert("organisms", {
      name: trimmedName,
      shortName: args.shortName?.trim(),
      slug,
      category: args.category,
      province: args.province,
      provinceCode: args.provinceCode,
      status: "onboarding",
      connection: args.connectionKind === "api_sso" ? "API + SSO" : "—",
      connectionKind: args.connectionKind ?? "none",
      siege: args.siege,
      nif: args.nif,
      phone: args.phone,
      contactEmail: args.contactEmail,
      decretCreation: args.decretCreation,
      icon: "building",
    })

    const processId = await ctx.db.insert("onboardingProcesses", {
      organismId,
      currentStepKey: ONBOARDING_STEPS[0],
      initiatedByAgentId: agent._id,
      initiatedAt: Date.now(),
    })
    for (let i = 0; i < ONBOARDING_STEPS.length; i++) {
      await ctx.db.insert("onboardingSteps", {
        processId,
        key: ONBOARDING_STEPS[i],
        order: i,
        status: i === 0 ? "active" : "pending",
      })
    }

    await logActivity(ctx, {
      actorAgentId: agent._id,
      actorDisplayName: agent.name,
      verb: "a enregistré",
      subjectKind: "organisms",
      subjectId: String(organismId),
      subjectLabel: trimmedName,
      linkTo: "/organisations",
      iconKey: "plus",
      organismId,
    })

    return { organismId, processId }
  },
})

export const suspendOrganism = mutation({
  args: {
    token: v.string(),
    organismId: v.id("organisms"),
    reason: v.string(),
  },
  handler: async (ctx, { token, organismId, reason }) => {
    const { actor, agent } = await requirePlatformAdmin(ctx, token)
    assertCan(actor, "organism.suspend")
    const trimmedReason = reason.trim()
    if (!trimmedReason) throw new Error("Un motif est requis pour suspendre.")

    const org = await ctx.db.get(organismId)
    if (!org) throw new Error("Organisme introuvable.")
    if (org.status === "suspended") {
      throw new Error("Organisme déjà suspendu.")
    }

    await ctx.db.patch(organismId, { status: "suspended" })
    await logActivity(ctx, {
      actorAgentId: agent._id,
      actorDisplayName: agent.name,
      verb: "a suspendu",
      subjectKind: "organisms",
      subjectId: String(organismId),
      subjectLabel: org.shortName ?? org.name,
      linkTo: "/organisations",
      iconKey: "alertTriangle",
      organismId,
    })
    return { organismId, reason: trimmedReason }
  },
})

export const reactivateOrganism = mutation({
  args: { token: v.string(), organismId: v.id("organisms") },
  handler: async (ctx, { token, organismId }) => {
    const { actor, agent } = await requirePlatformAdmin(ctx, token)
    assertCan(actor, "organism.activate")

    const org = await ctx.db.get(organismId)
    if (!org) throw new Error("Organisme introuvable.")
    if (org.status === "active") {
      throw new Error("Organisme déjà actif.")
    }

    await ctx.db.patch(organismId, { status: "active" })
    await logActivity(ctx, {
      actorAgentId: agent._id,
      actorDisplayName: agent.name,
      verb: "a réactivé",
      subjectKind: "organisms",
      subjectId: String(organismId),
      subjectLabel: org.shortName ?? org.name,
      linkTo: "/organisations",
      iconKey: "checkCircle",
      organismId,
    })
    return { organismId }
  },
})

// ────────── helpers locaux ──────────

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

function statusLabel(status: string): string {
  switch (status) {
    case "active":
      return "Active"
    case "onboarding":
      return "Onboarding"
    case "suspended":
      return "Suspendue"
    default:
      return status
  }
}

function statusTone(status: string): "archived" | "warning" | "danger" {
  switch (status) {
    case "active":
      return "archived"
    case "onboarding":
      return "warning"
    case "suspended":
      return "danger"
    default:
      return "archived"
  }
}

function connectionLabel(
  legacy: string | undefined,
  kind: string | undefined,
): string {
  if (legacy && legacy !== "—") return legacy
  if (kind === "api_sso") return "API + SSO"
  if (kind === "portal") return "Portail"
  return "—"
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
}

async function logActivity(
  ctx: MutationCtx,
  data: {
    actorAgentId: Id<"agents">
    actorDisplayName: string
    verb: string
    subjectKind: string
    subjectId: string
    subjectLabel: string
    linkTo?: string
    iconKey?: string
    organismId?: Id<"organisms">
  },
) {
  await ctx.db.insert("teamActivities", {
    ...data,
    occurredAt: Date.now(),
  })
}
