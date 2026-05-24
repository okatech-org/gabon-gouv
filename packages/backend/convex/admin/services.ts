/**
 * Gestion du catalogue de services côté admin organisme (A8, Bloc 1).
 *
 * Couvre :
 *   - Lecture (list, getDetail, getPublicationChecklist, listRelatedRequests)
 *   - Cycle de vie (create, update, publish, unpublish, archive, duplicate)
 *
 * Les sous-entités (variants, requirements, templates) ont leurs propres
 * fichiers : voir admin/serviceVariants.ts, admin/serviceRequirements.ts,
 * admin/documentTemplates.ts.
 */

import { v } from "convex/values"
import type { Doc, Id } from "../_generated/dataModel"
import type { MutationCtx, QueryCtx } from "../_generated/server"
import { query } from "../_generated/server"
import { mutation } from "../lib/triggers"
import { requireAgent } from "../auth"
import { writeAudit } from "../lib/audit"
import {
  actorFromAgent,
  assertCan,
  requireSameOrganism,
} from "../lib/permissions"
import {
  serviceArchivedReasonKindValidator,
  serviceDeliveryModeValidator,
} from "../lib/enums"

/* ============================================================
   Query: liste services de l'organisme courant (existante,
   conservée car déjà câblée côté UI)
   ============================================================ */
export const list = query({
  args: { token: v.string(), status: v.optional(v.string()) },
  handler: async (ctx, { token, status }) => {
    const agent = await requireAgent(ctx, token)

    const rows = await ctx.db
      .query("services")
      .withIndex("by_organism_status", (q) => {
        if (status && status !== "all") {
          return q
            .eq("organismId", agent.organismId)
            .eq("status", status as "published" | "draft" | "archived")
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

    rows.sort(
      (a, b) =>
        (reqCountByService.get(b._id) ?? 0) -
        (reqCountByService.get(a._id) ?? 0),
    )

    return rows.map((s) => ({
      slug: s.slug,
      title: s.variant ? `${s.title} · ${s.variant}` : s.title,
      category: s.category,
      categorySlug: s.categorySlug,
      status: s.status,
      requests30d: reqCountByService.get(s._id) ?? 0,
      fee: s.fee,
      delayHours: s.delayHours,
      satisfaction: s.satisfaction,
      updatedAt: s._creationTime, // pas de updatedAt explicite, on prend la création
    }))
  },
})

/* ============================================================
   Query: détail d'un service par slug (Bloc 1.7)
   ============================================================ */
export const getDetail = query({
  args: { token: v.string(), slug: v.string() },
  handler: async (ctx, { token, slug }) => {
    const agent = await requireAgent(ctx, token)
    const actor = actorFromAgent(agent)
    assertCan(actor, "service.read")

    const service = await getServiceBySlugForAgent(ctx, slug, agent.organismId)

    const [variants, requirements] = await Promise.all([
      ctx.db
        .query("serviceVariants")
        .withIndex("by_service", (q) => q.eq("serviceId", service._id))
        .collect(),
      ctx.db
        .query("serviceRequirements")
        .withIndex("by_service", (q) => q.eq("serviceId", service._id))
        .collect(),
    ])

    // Templates par variante
    const templatesByVariant = await Promise.all(
      variants.map(async (variant) => {
        const templates = await ctx.db
          .query("documentTemplates")
          .withIndex("by_variant", (q) => q.eq("serviceVariantId", variant._id))
          .collect()
        return {
          variantId: variant._id,
          templates: templates
            .sort((a, b) => b._creationTime - a._creationTime)
            .map((t) => ({
              id: t._id,
              key: t.key,
              version: t.version,
              title: t.title,
              status: t.status,
              validatedByComite: t.validatedByComite ?? false,
              validatedAt: t.validatedAt ?? null,
            })),
        }
      }),
    )

    // Stats demandes 30j
    const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
    const allReqs = await ctx.db
      .query("requests")
      .withIndex("by_service_status", (q) => q.eq("serviceId", service._id))
      .collect()
    const requests30d = allReqs.filter((r) => r.depositedAt >= monthAgo).length

    return {
      id: service._id,
      slug: service.slug,
      title: service.title,
      categorySlug: service.categorySlug ?? null,
      category: service.category,
      description: service.description ?? "",
      longDescription: service.longDescription ?? "",
      legalReferences: service.legalReferences ?? [],
      whoCanApply: service.whoCanApply ?? "",
      deliveryMode: service.deliveryMode ?? null,
      online: service.online ?? true,
      fee: service.fee,
      feeFcfa: service.feeFcfa ?? null,
      delayHours: service.delayHours,
      status: service.status,
      satisfaction: service.satisfaction ?? null,
      publishedAt: service.publishedAt ?? null,
      archivedAt: service.archivedAt ?? null,
      archivedReason: service.archivedReason ?? null,
      archivedReasonKind: service.archivedReasonKind ?? null,
      requests30d,
      variants: variants
        .sort((a, b) => a.order - b.order)
        .map((vv) => ({
          id: vv._id,
          key: vv.key,
          label: vv.label,
          description: vv.description ?? "",
          whoCanApply: vv.whoCanApply ?? "",
          isDefault: vv.isDefault,
          feeOverride: vv.feeOverride ?? null,
          feeFcfaOverride: vv.feeFcfaOverride ?? null,
          delayHoursOverride: vv.delayHoursOverride ?? null,
          order: vv.order,
          requestsLast30d: vv.requestsLast30d ?? 0,
        })),
      requirements: requirements
        .sort((a, b) => a.order - b.order)
        .map((r) => ({
          id: r._id,
          label: r.label,
          description: r.description ?? "",
          required: r.required,
          acceptedDocTypes: r.acceptedDocTypes,
          autofillSource: r.autofillSource ?? null,
          order: r.order,
          variantOverrides: r.variantOverrides ?? [],
        })),
      templatesByVariant,
    }
  },
})

/* ============================================================
   Query: checklist de publication (Bloc 1.7)
   ============================================================ */
export const getPublicationChecklist = query({
  args: { token: v.string(), slug: v.string() },
  handler: async (ctx, { token, slug }) => {
    const agent = await requireAgent(ctx, token)
    const actor = actorFromAgent(agent)
    assertCan(actor, "service.read")

    const service = await getServiceBySlugForAgent(ctx, slug, agent.organismId)
    return computePublicationChecklist(ctx, service)
  },
})

/* ============================================================
   Query: demandes liées (Bloc 1.7)
   ============================================================ */
export const listRelatedRequests = query({
  args: {
    token: v.string(),
    slug: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { token, slug, limit }) => {
    const agent = await requireAgent(ctx, token)
    const actor = actorFromAgent(agent)
    assertCan(actor, "service.read")

    const service = await getServiceBySlugForAgent(ctx, slug, agent.organismId)

    const requests = await ctx.db
      .query("requests")
      .withIndex("by_service_status", (q) => q.eq("serviceId", service._id))
      .collect()

    requests.sort((a, b) => b.depositedAt - a.depositedAt)
    return requests.slice(0, limit ?? 20).map((r) => ({
      ref: r.ref,
      status: r.status,
      depositedAt: r.depositedAt,
      progressPct: r.progressPct,
    }))
  },
})

/* ============================================================
   Mutation: createService
   ============================================================ */
export const createService = mutation({
  args: {
    token: v.string(),
    title: v.string(),
    categorySlug: v.string(),
    description: v.optional(v.string()),
    fee: v.optional(v.string()),
    feeFcfa: v.optional(v.number()),
    delayHours: v.optional(v.number()),
    deliveryMode: v.optional(serviceDeliveryModeValidator),
  },
  handler: async (ctx, args) => {
    const me = await requireAgent(ctx, args.token)
    const actor = actorFromAgent(me)
    assertCan(actor, "service.create")

    const category = await ctx.db
      .query("serviceCategories")
      .withIndex("by_slug", (q) => q.eq("slug", args.categorySlug))
      .unique()
    if (!category) {
      throw new Error(`Catégorie inconnue : ${args.categorySlug}.`)
    }

    const slug = await reserveUniqueSlug(ctx, slugify(args.title))

    const serviceId = await ctx.db.insert("services", {
      organismId: me.organismId,
      categorySlug: category.slug,
      slug,
      title: args.title.trim(),
      category: category.label,
      description: args.description?.trim() ?? "",
      fee: args.fee?.trim() || "Gratuit",
      feeFcfa: args.feeFcfa ?? 0,
      delayHours: args.delayHours ?? 48,
      deliveryMode: args.deliveryMode ?? "online",
      online: (args.deliveryMode ?? "online") !== "in_person",
      status: "draft",
    })

    // Crée une variante par défaut implicite — l'agent pourra la renommer.
    await ctx.db.insert("serviceVariants", {
      serviceId,
      key: "standard",
      label: "Standard",
      isDefault: true,
      order: 0,
    })

    await writeAudit({
      ctx,
      verb: "service.created",
      actorKind: "agent",
      actorAgentId: me._id,
      actorAgentName: me.name,
      organismId: me.organismId,
      subjectKind: "services",
      subjectId: serviceId,
      subjectLabel: args.title,
      uiVerb: "a créé le service",
      linkTo: `/services/${slug}`,
      iconKey: "layers",
      payload: { categorySlug: args.categorySlug, deliveryMode: args.deliveryMode },
    })

    return { slug, id: serviceId }
  },
})

/* ============================================================
   Mutation: updateService (champs métier)
   ============================================================ */
export const updateService = mutation({
  args: {
    token: v.string(),
    slug: v.string(),
    patch: v.object({
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      longDescription: v.optional(v.string()),
      categorySlug: v.optional(v.string()),
      whoCanApply: v.optional(v.string()),
      deliveryMode: v.optional(serviceDeliveryModeValidator),
      fee: v.optional(v.string()),
      feeFcfa: v.optional(v.number()),
      delayHours: v.optional(v.number()),
      legalReferences: v.optional(v.array(v.string())),
    }),
  },
  handler: async (ctx, { token, slug, patch }) => {
    const me = await requireAgent(ctx, token)
    const actor = actorFromAgent(me)
    assertCan(actor, "service.update")

    const service = await getServiceBySlugForAgent(ctx, slug, me.organismId)

    const updatePayload: Partial<Doc<"services">> = {}
    if (patch.title !== undefined) updatePayload.title = patch.title.trim()
    if (patch.description !== undefined)
      updatePayload.description = patch.description.trim()
    if (patch.longDescription !== undefined)
      updatePayload.longDescription = patch.longDescription.trim()
    if (patch.whoCanApply !== undefined)
      updatePayload.whoCanApply = patch.whoCanApply.trim()
    if (patch.deliveryMode !== undefined) {
      updatePayload.deliveryMode = patch.deliveryMode
      updatePayload.online = patch.deliveryMode !== "in_person"
    }
    if (patch.fee !== undefined) updatePayload.fee = patch.fee.trim()
    if (patch.feeFcfa !== undefined) updatePayload.feeFcfa = patch.feeFcfa
    if (patch.delayHours !== undefined)
      updatePayload.delayHours = patch.delayHours
    if (patch.legalReferences !== undefined)
      updatePayload.legalReferences = patch.legalReferences
    if (patch.categorySlug !== undefined) {
      const cat = await ctx.db
        .query("serviceCategories")
        .withIndex("by_slug", (q) => q.eq("slug", patch.categorySlug!))
        .unique()
      if (!cat) throw new Error(`Catégorie inconnue : ${patch.categorySlug}.`)
      updatePayload.categorySlug = cat.slug
      updatePayload.category = cat.label
    }

    await ctx.db.patch(service._id, updatePayload)

    await writeAudit({
      ctx,
      verb: "service.updated",
      actorKind: "agent",
      actorAgentId: me._id,
      actorAgentName: me.name,
      organismId: me.organismId,
      subjectKind: "services",
      subjectId: service._id,
      subjectLabel: updatePayload.title ?? service.title,
      uiVerb: "a modifié le service",
      linkTo: `/services/${slug}`,
      iconKey: "edit",
      payload: { fields: Object.keys(updatePayload) },
    })
  },
})

/* ============================================================
   Mutation: publishService (avec checklist)
   ============================================================ */
export const publishService = mutation({
  args: { token: v.string(), slug: v.string() },
  handler: async (ctx, { token, slug }) => {
    const me = await requireAgent(ctx, token)
    const actor = actorFromAgent(me)
    assertCan(actor, "service.publish")

    const service = await getServiceBySlugForAgent(ctx, slug, me.organismId)
    if (service.status === "published") return // idempotent

    const checklist = await computePublicationChecklist(ctx, service)
    if (!checklist.ready) {
      throw new Error(
        `Publication bloquée — prérequis manquants : ${checklist.missing.join(" ; ")}.`,
      )
    }

    await ctx.db.patch(service._id, {
      status: "published",
      publishedAt: Date.now(),
      publishedByAgentId: me._id,
      // Si on republie un service précédemment archivé, on nettoie ces champs.
      archivedAt: undefined,
      archivedByAgentId: undefined,
      archivedReason: undefined,
      archivedReasonKind: undefined,
    })

    await writeAudit({
      ctx,
      verb: "service.published",
      actorKind: "agent",
      actorAgentId: me._id,
      actorAgentName: me.name,
      organismId: me.organismId,
      subjectKind: "services",
      subjectId: service._id,
      subjectLabel: service.title,
      uiVerb: "a publié le service",
      linkTo: `/services/${slug}`,
      iconKey: "checkCircle",
    })
  },
})

/* ============================================================
   Mutation: unpublishService (retour en draft)
   ============================================================ */
export const unpublishService = mutation({
  args: { token: v.string(), slug: v.string() },
  handler: async (ctx, { token, slug }) => {
    const me = await requireAgent(ctx, token)
    const actor = actorFromAgent(me)
    assertCan(actor, "service.unpublish")

    const service = await getServiceBySlugForAgent(ctx, slug, me.organismId)
    if (service.status !== "published") {
      throw new Error("Le service n'est pas publié.")
    }

    await ctx.db.patch(service._id, { status: "draft" })

    await writeAudit({
      ctx,
      verb: "service.unpublished",
      actorKind: "agent",
      actorAgentId: me._id,
      actorAgentName: me.name,
      organismId: me.organismId,
      subjectKind: "services",
      subjectId: service._id,
      subjectLabel: service.title,
      uiVerb: "a dépublié le service",
      linkTo: `/services/${slug}`,
      iconKey: "refresh",
    })
  },
})

/* ============================================================
   Mutation: archiveService (refuse si requests actives)
   ============================================================ */
export const archiveService = mutation({
  args: {
    token: v.string(),
    slug: v.string(),
    reasonKind: serviceArchivedReasonKindValidator,
    reason: v.string(),
  },
  handler: async (ctx, { token, slug, reasonKind, reason }) => {
    const me = await requireAgent(ctx, token)
    const actor = actorFromAgent(me)
    assertCan(actor, "service.archive")

    const service = await getServiceBySlugForAgent(ctx, slug, me.organismId)
    if (service.status === "archived") return // idempotent

    // Bloquer si demandes actives (non terminées)
    const activeRequests = await ctx.db
      .query("requests")
      .withIndex("by_service_status", (q) => q.eq("serviceId", service._id))
      .collect()
    const stillActive = activeRequests.filter(
      (r) =>
        r.status !== "issued" &&
        r.status !== "rejected" &&
        r.status !== "cancelled",
    )
    if (stillActive.length > 0) {
      throw new Error(
        `Archivage refusé : ${stillActive.length} demande(s) en cours. Terminez-les d'abord.`,
      )
    }

    await ctx.db.patch(service._id, {
      status: "archived",
      archivedAt: Date.now(),
      archivedByAgentId: me._id,
      archivedReason: reason.trim(),
      archivedReasonKind: reasonKind,
    })

    await writeAudit({
      ctx,
      verb: "service.archived",
      actorKind: "agent",
      actorAgentId: me._id,
      actorAgentName: me.name,
      organismId: me.organismId,
      subjectKind: "services",
      subjectId: service._id,
      subjectLabel: service.title,
      uiVerb: "a archivé le service",
      linkTo: `/services/${slug}`,
      iconKey: "archive",
      payload: { reasonKind, reason },
    })
  },
})

/* ============================================================
   Mutation: duplicateService (clone + variantes + requirements + templates)
   ============================================================ */
export const duplicateService = mutation({
  args: { token: v.string(), slug: v.string() },
  handler: async (ctx, { token, slug }) => {
    const me = await requireAgent(ctx, token)
    const actor = actorFromAgent(me)
    assertCan(actor, "service.duplicate")

    const source = await getServiceBySlugForAgent(ctx, slug, me.organismId)

    const newSlug = await reserveUniqueSlug(ctx, `${source.slug}-copie`)
    const newTitle = `${source.title} (copie)`

    const newServiceId = await ctx.db.insert("services", {
      organismId: source.organismId,
      categorySlug: source.categorySlug,
      slug: newSlug,
      title: newTitle,
      category: source.category,
      description: source.description,
      longDescription: source.longDescription,
      legalReferences: source.legalReferences,
      whoCanApply: source.whoCanApply,
      deliveryMode: source.deliveryMode,
      online: source.online,
      fee: source.fee,
      feeFcfa: source.feeFcfa,
      delayHours: source.delayHours,
      status: "draft",
      defaultSignatureCircuitTemplate: source.defaultSignatureCircuitTemplate,
    })

    // Cloner variantes (et mémoriser mapping ancien → nouveau pour requirements)
    const variants = await ctx.db
      .query("serviceVariants")
      .withIndex("by_service", (q) => q.eq("serviceId", source._id))
      .collect()
    const variantIdMap = new Map<Id<"serviceVariants">, Id<"serviceVariants">>()
    for (const variant of variants) {
      const newVariantId = await ctx.db.insert("serviceVariants", {
        serviceId: newServiceId,
        key: variant.key,
        label: variant.label,
        description: variant.description,
        whoCanApply: variant.whoCanApply,
        isDefault: variant.isDefault,
        feeOverride: variant.feeOverride,
        feeFcfaOverride: variant.feeFcfaOverride,
        delayHoursOverride: variant.delayHoursOverride,
        order: variant.order,
      })
      variantIdMap.set(variant._id, newVariantId)
    }

    // Cloner requirements (en remappant variantOverrides)
    const requirements = await ctx.db
      .query("serviceRequirements")
      .withIndex("by_service", (q) => q.eq("serviceId", source._id))
      .collect()
    for (const req of requirements) {
      const remappedOverrides = req.variantOverrides?.map((o) => ({
        variantId: variantIdMap.get(o.variantId)!,
        required: o.required,
        acceptedDocTypes: o.acceptedDocTypes,
      }))
      await ctx.db.insert("serviceRequirements", {
        serviceId: newServiceId,
        label: req.label,
        description: req.description,
        required: req.required,
        acceptedDocTypes: req.acceptedDocTypes,
        autofillSource: req.autofillSource,
        order: req.order,
        variantOverrides: remappedOverrides,
      })
    }

    // Cloner templates (en draft, validation comité remise à zéro)
    for (const [oldVariantId, newVariantId] of variantIdMap) {
      const templates = await ctx.db
        .query("documentTemplates")
        .withIndex("by_variant", (q) =>
          q.eq("serviceVariantId", oldVariantId),
        )
        .collect()
      for (const tpl of templates) {
        const newTemplateId = await ctx.db.insert("documentTemplates", {
          serviceVariantId: newVariantId,
          key: tpl.key,
          version: "v1",
          title: tpl.title,
          bodyTemplate: tpl.bodyTemplate,
          status: "draft",
          validatedByComite: false,
          legalReference: tpl.legalReference,
        })
        // Cloner variables
        const vars = await ctx.db
          .query("documentTemplateVariables")
          .withIndex("by_template", (q) => q.eq("templateId", tpl._id))
          .collect()
        for (const variable of vars) {
          await ctx.db.insert("documentTemplateVariables", {
            templateId: newTemplateId,
            key: variable.key,
            label: variable.label,
            source: variable.source,
            sourcePath: variable.sourcePath,
            required: variable.required,
            order: variable.order,
          })
        }
      }
    }

    await writeAudit({
      ctx,
      verb: "service.duplicated",
      actorKind: "agent",
      actorAgentId: me._id,
      actorAgentName: me.name,
      organismId: me.organismId,
      subjectKind: "services",
      subjectId: newServiceId,
      subjectLabel: newTitle,
      uiVerb: "a dupliqué le service",
      linkTo: `/services/${newSlug}`,
      iconKey: "copy",
      payload: { sourceSlug: source.slug },
    })

    return { slug: newSlug, id: newServiceId }
  },
})

/* ============================================================
   Helpers internes
   ============================================================ */

/** Récupère un service par slug en vérifiant qu'il appartient à l'organisme. */
async function getServiceBySlugForAgent(
  ctx: QueryCtx,
  slug: string,
  organismId: Id<"organisms">,
): Promise<Doc<"services">> {
  const service = await ctx.db
    .query("services")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique()
  if (!service) throw new Error(`Service introuvable : ${slug}.`)
  if (service.organismId !== organismId) {
    throw new Error("Ce service n'appartient pas à votre organisme.")
  }
  return service
}

/** Normalise un titre en slug URL-safe. */
function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "service"
}

/** Trouve un slug disponible (ajoute -2, -3… si collision). */
async function reserveUniqueSlug(
  ctx: MutationCtx,
  base: string,
): Promise<string> {
  let candidate = base
  let suffix = 2
  while (true) {
    const existing = await ctx.db
      .query("services")
      .withIndex("by_slug", (q) => q.eq("slug", candidate))
      .unique()
    if (!existing) return candidate
    candidate = `${base}-${suffix}`
    suffix += 1
  }
}

/**
 * Calcule la liste des prérequis manquants pour publier un service.
 * Renvoie `{ ready, missing }`. Aussi utilisé par `getPublicationChecklist`.
 */
export async function computePublicationChecklist(
  ctx: QueryCtx,
  service: Doc<"services">,
): Promise<{ ready: boolean; missing: string[] }> {
  const missing: string[] = []

  // Métadonnées
  if (!service.categorySlug) missing.push("catégorie non renseignée")
  if (!service.description || service.description.trim().length < 10)
    missing.push("description trop courte (10 caractères minimum)")
  if (!service.whoCanApply || service.whoCanApply.trim().length === 0)
    missing.push("public éligible (« qui peut demander ? ») non renseigné")
  if (!service.fee || service.fee.trim().length === 0)
    missing.push("frais non renseignés")
  if (!service.delayHours || service.delayHours <= 0)
    missing.push("délai non renseigné")

  // Variantes
  const variants = await ctx.db
    .query("serviceVariants")
    .withIndex("by_service", (q) => q.eq("serviceId", service._id))
    .collect()
  if (variants.length === 0) {
    missing.push("au moins une variante requise")
  } else if (!variants.some((vv) => vv.isDefault)) {
    missing.push("aucune variante marquée par défaut")
  }

  // Pièces requises (au moins une — exemption à venir via flag « sans pièce »)
  const requirements = await ctx.db
    .query("serviceRequirements")
    .withIndex("by_service", (q) => q.eq("serviceId", service._id))
    .collect()
  if (requirements.length === 0) {
    missing.push("au moins une pièce requise")
  }

  // Templates : 1 actif validé par variante
  for (const variant of variants) {
    const templates = await ctx.db
      .query("documentTemplates")
      .withIndex("by_variant", (q) => q.eq("serviceVariantId", variant._id))
      .collect()
    const active = templates.find((t) => t.status === "active")
    if (!active) {
      missing.push(`variante « ${variant.label} » : aucun template actif`)
      continue
    }
    if (!active.validatedByComite) {
      missing.push(
        `variante « ${variant.label} » : template non validé par le comité`,
      )
    }
  }

  return { ready: missing.length === 0, missing }
}
