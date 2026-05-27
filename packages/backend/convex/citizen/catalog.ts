import { v } from "convex/values"
import { query } from "../_generated/server"
import { requireCitizen } from "./auth"

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

/**
 * Liste TOUS les services publiés du catalogue, regroupés par catégorie.
 * Utilisée par la page `/services` côté citoyen (catalogue complet).
 */
export const listAllPublished = query({
  args: {},
  handler: async (ctx) => {
    const [services, orgs, cats] = await Promise.all([
      ctx.db.query("services").collect(),
      ctx.db.query("organisms").collect(),
      ctx.db.query("serviceCategories").collect(),
    ])
    cats.sort((a, b) => a.order - b.order)
    const orgMap = new Map(orgs.map((o) => [o._id, o]))
    const published = services.filter((s) => s.status === "published")

    const byCategory = new Map<
      string,
      {
        slug: string
        title: string
        organismShortName: string
        organismName: string
        delayHours: number
        delayLabel: string
        fee: string
        online: boolean
      }[]
    >()
    for (const s of published) {
      const org = orgMap.get(s.organismId)
      const arr = byCategory.get(s.categorySlug ?? "autre") ?? []
      arr.push({
        slug: s.slug,
        title: s.title,
        organismShortName: org?.shortName ?? org?.name ?? "—",
        organismName: org?.name ?? "—",
        delayHours: s.delayHours,
        delayLabel: formatDelayHours(s.delayHours),
        fee: s.fee,
        online: s.online ?? s.deliveryMode === "online",
      })
      byCategory.set(s.categorySlug ?? "autre", arr)
    }

    return {
      total: published.length,
      categories: cats
        .map((c) => ({
          slug: c.slug,
          label: c.label,
          icon: c.icon,
          color: c.color,
          services: (byCategory.get(c.slug) ?? []).sort((a, b) =>
            a.title.localeCompare(b.title),
          ),
        }))
        .filter((c) => c.services.length > 0),
    }
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

/**
 * Query dédiée au wizard de dépôt : renvoie le service avec ses variantes
 * publiées, ses pièces requises (avec variantOverrides résolus par variante),
 * et les valeurs d'autofill pré-calculées depuis le profil du citoyen courant.
 *
 * Nécessite l'authentification citoyen (idnSub) — contrairement à
 * getServiceDetail qui est public — parce qu'on injecte des données personnelles.
 */
export const getServiceForWizard = query({
  args: { idnSub: v.string(), slug: v.string() },
  handler: async (ctx, { idnSub, slug }) => {
    const { citizen } = await requireCitizen(ctx, idnSub)

    const service = await ctx.db
      .query("services")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first()
    if (!service) return null
    if (service.status !== "published") {
      throw new Error(
        "Ce service n'est plus disponible (brouillon ou archivé).",
      )
    }

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

    // Pré-calcul de l'autofill : champs déjà connus depuis le citoyen courant
    // (et son IDN sub). À enrichir quand on aura les claims IDN persistés.
    const autofillValues = resolveAutofillValues(citizen)

    return {
      service: {
        id: service._id,
        slug: service.slug,
        title: service.title,
        category: service.category,
        organism: organism?.shortName ?? organism?.name ?? "—",
        organismId: service.organismId,
        delayHours: service.delayHours,
        fee: service.fee,
        feeFcfa: service.feeFcfa ?? 0,
        deliveryMode: service.deliveryMode ?? "online",
        legalReferences: service.legalReferences ?? [],
        whoCanApply: service.whoCanApply ?? "",
      },
      variants: variants.map((vv) => ({
        id: vv._id,
        key: vv.key,
        label: vv.label,
        description: vv.description ?? "",
        whoCanApply: vv.whoCanApply ?? "",
        isDefault: vv.isDefault,
        // overrides effectifs pour affichage
        feeOverride: vv.feeOverride ?? null,
        feeFcfaOverride: vv.feeFcfaOverride ?? null,
        delayHoursOverride: vv.delayHoursOverride ?? null,
      })),
      requirements: requirements.map((r) => ({
        id: r._id,
        label: r.label,
        description: r.description ?? "",
        // Règle générale
        required: r.required,
        acceptedDocTypes: r.acceptedDocTypes,
        autofillSource: r.autofillSource ?? "none",
        // Map des overrides par variante : pour que le front puisse filtrer
        // côté UI en fonction de la variante sélectionnée
        variantOverrides: r.variantOverrides ?? [],
      })),
      autofillValues,
    }
  },
})

/**
 * Renvoie les valeurs disponibles dans le profil citoyen pour pré-remplir
 * les champs identifiables d'une demande. Lit le doc citoyen.
 * Les sources "third_party_api" et "previous_request" sont aujourd'hui stubs.
 */
function resolveAutofillValues(citizen: {
  name: string
  nip: string
  email?: string
  phone?: string
  birthDate?: string
  birthPlace?: string
  birthProvinceCode?: string
  address?: string
  addressProvinceCode?: string
  fatherName?: string
  motherName?: string
}) {
  return {
    // identité de base (toujours présente)
    nom: extractLastName(citizen.name),
    prenoms: extractFirstNames(citizen.name),
    nip: citizen.nip,
    // contact
    email: citizen.email ?? "",
    telephone: citizen.phone ?? "",
    // état civil étendu (depuis le seed ou IDN)
    date_naissance: citizen.birthDate ?? "",
    lieu_naissance: citizen.birthPlace ?? "",
    province_naissance: citizen.birthProvinceCode ?? "",
    adresse: citizen.address ?? "",
    province_residence: citizen.addressProvinceCode ?? "",
    pere: citizen.fatherName ?? "",
    mere: citizen.motherName ?? "",
  }
}

function extractLastName(fullName: string): string {
  // Convention seed : "NOM Prénom1 Prénom2" — le nom est en majuscules
  const tokens = fullName.trim().split(/\s+/)
  const upperOnly = tokens.filter((t) => t === t.toUpperCase() && t.length > 1)
  return upperOnly.length > 0 ? upperOnly.join(" ") : tokens[0] ?? ""
}

function extractFirstNames(fullName: string): string {
  const tokens = fullName.trim().split(/\s+/)
  const firsts = tokens.filter((t) => t !== t.toUpperCase() || t.length <= 1)
  return firsts.join(" ")
}

function formatDelayHours(hours: number): string {
  if (hours < 24) return `${Math.round(hours)} h`
  const days = Math.floor(hours / 24)
  const remH = Math.round(hours - days * 24)
  return remH > 0 ? `${days} j ${remH} h` : `${days} j`
}
