import { v } from "convex/values"
import { query } from "../_generated/server"

/**
 * Catalogue de services (vue citoyen) — toutes les queries sont publiques
 * (pas d'auth requise). Alimente la page d'accueil, la fiche service et
 * indirectement le wizard de dépôt.
 */

const TOP_SERVICES_HARDCODED_FALLBACK: Array<{ slug: string; categorySlug: string }> = []

export const getCategories = query({
  args: {},
  handler: async (ctx) => {
    const cats = await ctx.db.query("serviceCategories").collect()
    cats.sort((a, b) => a.order - b.order)
    const allServices = await ctx.db.query("services").collect()
    const countBySlug = new Map<string, number>()
    for (const s of allServices) {
      if (s.status !== "published") continue
      const k = s.categorySlug
      if (!k) continue
      countBySlug.set(k, (countBySlug.get(k) ?? 0) + 1)
    }
    return cats.map((c) => ({
      id: c.slug,
      label: c.label,
      icon: c.icon,
      color: c.color,
      count: countBySlug.get(c.slug) ?? 0,
    }))
  },
})

export const getTopServices = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 6 }) => {
    const services = await ctx.db.query("services").collect()
    const published = services.filter((s) => s.status === "published")
    // Tri par requestsLast30d desc puis par delayHours asc
    published.sort((a, b) => {
      const ra = a.requestsLast30d ?? 0
      const rb = b.requestsLast30d ?? 0
      if (rb !== ra) return rb - ra
      return a.delayHours - b.delayHours
    })
    const orgIds = new Set(published.slice(0, limit).map((s) => s.organismId))
    const orgs = await Promise.all([...orgIds].map((id) => ctx.db.get(id)))
    const orgMap = new Map(orgs.filter(Boolean).map((o) => [o!._id, o!]))

    return published.slice(0, limit).map((s) => {
      const org = orgMap.get(s.organismId)
      return {
        id: s.slug,
        slug: s.slug,
        cat: s.category,
        label: s.title,
        org: org?.shortName ?? org?.name ?? "—",
        delay: formatDelayHours(s.delayHours),
        online: s.online ?? s.deliveryMode === "online",
        fee: s.fee,
      }
    })
  },
})

export const getServiceDetail = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const service = await ctx.db
      .query("services")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first()
    if (!service) return null
    const [organism, variants, requirements] = await Promise.all([
      ctx.db.get(service.organismId),
      ctx.db
        .query("serviceVariants")
        .withIndex("by_service", (q) => q.eq("serviceId", service._id))
        .collect(),
      ctx.db
        .query("serviceRequirements")
        .withIndex("by_service", (q) => q.eq("serviceId", service._id))
        .collect(),
    ])
    variants.sort((a, b) => a.order - b.order)
    requirements.sort((a, b) => a.order - b.order)

    // Services proches (même catégorie, autres slugs)
    const related = (
      await ctx.db.query("services").collect()
    )
      .filter(
        (s) =>
          s._id !== service._id &&
          s.status === "published" &&
          (s.categorySlug === service.categorySlug ||
            s.category === service.category),
      )
      .slice(0, 4)
      .map((s) => s.title)

    return {
      slug: service.slug,
      category: service.category,
      title: service.title,
      description: service.description ?? "",
      org: organism?.name ?? "—",
      orgShort: organism?.shortName ?? organism?.name ?? "—",
      organismId: service.organismId,
      delay: formatDelayHours(service.delayHours),
      cost: service.fee,
      mode:
        service.deliveryMode === "online"
          ? "100% en ligne"
          : service.deliveryMode === "hybrid"
            ? "Démarche hybride"
            : "En présentiel",
      variants: variants.map((v_) => ({
        id: v_._id,
        key: v_.key,
        title: v_.label,
        description: v_.description ?? "",
        who: v_.whoCanApply ?? "",
        highlight: v_.isDefault,
        highlightLabel: v_.isDefault ? "Le plus demandé" : undefined,
      })),
      pieces: requirements.map((r) => ({
        title: r.label,
        description: r.description ?? "",
        required: r.required,
        auto: r.autofillSource !== undefined && r.autofillSource !== "none",
      })),
      faq: [
        { question: "Mon acte n'est pas trouvé, que faire ?", open: true },
        { question: "Combien de copies puis-je commander ?" },
        { question: "L'acte numérique a-t-il la même valeur que le papier ?" },
        { question: "Comment vérifier l'authenticité d'un acte ?" },
      ],
      related,
    }
  },
})

void TOP_SERVICES_HARDCODED_FALLBACK

function formatDelayHours(hours: number): string {
  if (hours < 24) return `${Math.round(hours)} h`
  const days = Math.floor(hours / 24)
  const remH = Math.round(hours - days * 24)
  return remH > 0 ? `${days} j ${remH} h` : `${days} j`
}
