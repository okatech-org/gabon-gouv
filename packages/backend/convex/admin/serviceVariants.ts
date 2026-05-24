/**
 * CRUD des variantes de service (ADR-0005, Bloc 1.4).
 *
 * Une variante = un sous-cas métier d'un service (« Copie intégrale » vs
 * « Extrait avec filiation »). Chaque variante peut surcharger frais, délai,
 * public éligible, et porte ses propres templates de documents.
 *
 * Règle métier : un service doit avoir au moins UNE variante, et UNE ET UNE
 * SEULE marquée `isDefault: true`.
 */

import { v } from "convex/values"
import type { Doc, Id } from "../_generated/dataModel"
import type { MutationCtx, QueryCtx } from "../_generated/server"
import { mutation } from "../lib/triggers"
import { requireAgent } from "../auth"
import { writeAudit } from "../lib/audit"
import { actorFromAgent, assertCan } from "../lib/permissions"

/* ============================================================
   addVariant
   ============================================================ */
export const addVariant = mutation({
  args: {
    token: v.string(),
    serviceId: v.id("services"),
    key: v.string(),
    label: v.string(),
    description: v.optional(v.string()),
    whoCanApply: v.optional(v.string()),
    feeOverride: v.optional(v.string()),
    feeFcfaOverride: v.optional(v.number()),
    delayHoursOverride: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const me = await requireAgent(ctx, args.token)
    assertCan(actorFromAgent(me), "service.variant.crud")
    const service = await requireServiceOfMyOrg(ctx, args.serviceId, me.organismId)

    // Unicité du key au sein du service
    const existing = await ctx.db
      .query("serviceVariants")
      .withIndex("by_service_key", (q) =>
        q.eq("serviceId", service._id).eq("key", normalizeKey(args.key)),
      )
      .unique()
    if (existing) {
      throw new Error(`Une variante avec la clé « ${args.key} » existe déjà.`)
    }

    const peers = await ctx.db
      .query("serviceVariants")
      .withIndex("by_service", (q) => q.eq("serviceId", service._id))
      .collect()
    const nextOrder =
      peers.length === 0 ? 0 : Math.max(...peers.map((p) => p.order)) + 1
    const isDefault = peers.length === 0 // la 1re créée est par défaut

    const variantId = await ctx.db.insert("serviceVariants", {
      serviceId: service._id,
      key: normalizeKey(args.key),
      label: args.label.trim(),
      description: args.description?.trim(),
      whoCanApply: args.whoCanApply?.trim(),
      isDefault,
      feeOverride: args.feeOverride?.trim(),
      feeFcfaOverride: args.feeFcfaOverride,
      delayHoursOverride: args.delayHoursOverride,
      order: nextOrder,
    })

    await writeAudit({
      ctx,
      verb: "service.variant_added",
      actorKind: "agent",
      actorAgentId: me._id,
      actorAgentName: me.name,
      organismId: me.organismId,
      subjectKind: "serviceVariants",
      subjectId: variantId,
      subjectLabel: `${service.title} · ${args.label}`,
      uiVerb: "a ajouté une variante",
      linkTo: `/services/${service.slug}?onglet=variantes`,
      iconKey: "layers",
    })

    return { id: variantId }
  },
})

/* ============================================================
   updateVariant
   ============================================================ */
export const updateVariant = mutation({
  args: {
    token: v.string(),
    variantId: v.id("serviceVariants"),
    patch: v.object({
      label: v.optional(v.string()),
      description: v.optional(v.string()),
      whoCanApply: v.optional(v.string()),
      feeOverride: v.optional(v.string()),
      feeFcfaOverride: v.optional(v.number()),
      delayHoursOverride: v.optional(v.number()),
    }),
  },
  handler: async (ctx, { token, variantId, patch }) => {
    const me = await requireAgent(ctx, token)
    assertCan(actorFromAgent(me), "service.variant.crud")
    const { variant, service } = await requireVariantOfMyOrg(
      ctx,
      variantId,
      me.organismId,
    )

    const updatePayload: Partial<Doc<"serviceVariants">> = {}
    if (patch.label !== undefined) updatePayload.label = patch.label.trim()
    if (patch.description !== undefined)
      updatePayload.description = patch.description.trim()
    if (patch.whoCanApply !== undefined)
      updatePayload.whoCanApply = patch.whoCanApply.trim()
    if (patch.feeOverride !== undefined)
      updatePayload.feeOverride = patch.feeOverride.trim() || undefined
    if (patch.feeFcfaOverride !== undefined)
      updatePayload.feeFcfaOverride = patch.feeFcfaOverride
    if (patch.delayHoursOverride !== undefined)
      updatePayload.delayHoursOverride = patch.delayHoursOverride

    await ctx.db.patch(variantId, updatePayload)

    await writeAudit({
      ctx,
      verb: "service.variant_updated",
      actorKind: "agent",
      actorAgentId: me._id,
      actorAgentName: me.name,
      organismId: me.organismId,
      subjectKind: "serviceVariants",
      subjectId: variantId,
      subjectLabel: `${service.title} · ${updatePayload.label ?? variant.label}`,
      uiVerb: "a modifié une variante",
      linkTo: `/services/${service.slug}?onglet=variantes`,
      iconKey: "edit",
      payload: { fields: Object.keys(updatePayload) },
    })
  },
})

/* ============================================================
   reorderVariants
   ============================================================ */
export const reorderVariants = mutation({
  args: {
    token: v.string(),
    serviceId: v.id("services"),
    orderedVariantIds: v.array(v.id("serviceVariants")),
  },
  handler: async (ctx, { token, serviceId, orderedVariantIds }) => {
    const me = await requireAgent(ctx, token)
    assertCan(actorFromAgent(me), "service.variant.crud")
    const service = await requireServiceOfMyOrg(ctx, serviceId, me.organismId)

    const variants = await ctx.db
      .query("serviceVariants")
      .withIndex("by_service", (q) => q.eq("serviceId", service._id))
      .collect()

    // Vérifier que la liste contient exactement les mêmes IDs
    const provided = new Set(orderedVariantIds.map((id) => id.toString()))
    const actual = new Set(variants.map((v) => v._id.toString()))
    if (
      provided.size !== actual.size ||
      [...provided].some((id) => !actual.has(id))
    ) {
      throw new Error(
        "Liste de variantes incohérente avec celles du service.",
      )
    }

    for (let i = 0; i < orderedVariantIds.length; i++) {
      await ctx.db.patch(orderedVariantIds[i]!, { order: i })
    }

    await writeAudit({
      ctx,
      verb: "service.variants_reordered",
      actorKind: "agent",
      actorAgentId: me._id,
      actorAgentName: me.name,
      organismId: me.organismId,
      subjectKind: "services",
      subjectId: service._id,
      subjectLabel: service.title,
      uiVerb: "a réordonné les variantes",
      linkTo: `/services/${service.slug}?onglet=variantes`,
      iconKey: "moveVertical",
    })
  },
})

/* ============================================================
   setDefaultVariant
   ============================================================ */
export const setDefaultVariant = mutation({
  args: { token: v.string(), variantId: v.id("serviceVariants") },
  handler: async (ctx, { token, variantId }) => {
    const me = await requireAgent(ctx, token)
    assertCan(actorFromAgent(me), "service.variant.crud")
    const { variant, service } = await requireVariantOfMyOrg(
      ctx,
      variantId,
      me.organismId,
    )

    if (variant.isDefault) return // idempotent

    const peers = await ctx.db
      .query("serviceVariants")
      .withIndex("by_service", (q) => q.eq("serviceId", service._id))
      .collect()

    for (const peer of peers) {
      if (peer._id === variantId) {
        await ctx.db.patch(peer._id, { isDefault: true })
      } else if (peer.isDefault) {
        await ctx.db.patch(peer._id, { isDefault: false })
      }
    }

    await writeAudit({
      ctx,
      verb: "service.default_variant_set",
      actorKind: "agent",
      actorAgentId: me._id,
      actorAgentName: me.name,
      organismId: me.organismId,
      subjectKind: "serviceVariants",
      subjectId: variantId,
      subjectLabel: `${service.title} · ${variant.label}`,
      uiVerb: "a défini la variante par défaut",
      linkTo: `/services/${service.slug}?onglet=variantes`,
      iconKey: "star",
    })
  },
})

/* ============================================================
   deleteVariant — refuse si requests ou si dernière variante
   ============================================================ */
export const deleteVariant = mutation({
  args: { token: v.string(), variantId: v.id("serviceVariants") },
  handler: async (ctx, { token, variantId }) => {
    const me = await requireAgent(ctx, token)
    assertCan(actorFromAgent(me), "service.variant.crud")
    const { variant, service } = await requireVariantOfMyOrg(
      ctx,
      variantId,
      me.organismId,
    )

    // Refuse si des demandes pointent vers cette variante
    const requests = await ctx.db.query("requests").collect()
    const usedByRequest = requests.find((r) => r.serviceVariantId === variantId)
    if (usedByRequest) {
      throw new Error(
        "Suppression refusée : cette variante est utilisée par au moins une demande.",
      )
    }

    // Refuse si c'est la dernière variante du service
    const peers = await ctx.db
      .query("serviceVariants")
      .withIndex("by_service", (q) => q.eq("serviceId", service._id))
      .collect()
    if (peers.length <= 1) {
      throw new Error(
        "Suppression refusée : un service doit toujours avoir au moins une variante.",
      )
    }

    // Si c'était la variante par défaut, en désigner une autre
    const wasDefault = variant.isDefault

    // Supprimer templates + variables associés
    const templates = await ctx.db
      .query("documentTemplates")
      .withIndex("by_variant", (q) => q.eq("serviceVariantId", variantId))
      .collect()
    for (const tpl of templates) {
      const vars = await ctx.db
        .query("documentTemplateVariables")
        .withIndex("by_template", (q) => q.eq("templateId", tpl._id))
        .collect()
      for (const vv of vars) {
        await ctx.db.delete(vv._id)
      }
      await ctx.db.delete(tpl._id)
    }

    // Nettoyer variantOverrides[] dans serviceRequirements
    const requirements = await ctx.db
      .query("serviceRequirements")
      .withIndex("by_service", (q) => q.eq("serviceId", service._id))
      .collect()
    for (const req of requirements) {
      if (!req.variantOverrides) continue
      const cleaned = req.variantOverrides.filter(
        (o) => o.variantId !== variantId,
      )
      if (cleaned.length !== req.variantOverrides.length) {
        await ctx.db.patch(req._id, {
          variantOverrides: cleaned.length === 0 ? undefined : cleaned,
        })
      }
    }

    await ctx.db.delete(variantId)

    if (wasDefault) {
      const remaining = peers.filter((p) => p._id !== variantId)
      const newDefault = remaining.sort((a, b) => a.order - b.order)[0]
      if (newDefault) {
        await ctx.db.patch(newDefault._id, { isDefault: true })
      }
    }

    await writeAudit({
      ctx,
      verb: "service.variant_deleted",
      actorKind: "agent",
      actorAgentId: me._id,
      actorAgentName: me.name,
      organismId: me.organismId,
      subjectKind: "serviceVariants",
      subjectId: variantId,
      subjectLabel: `${service.title} · ${variant.label}`,
      uiVerb: "a supprimé une variante",
      linkTo: `/services/${service.slug}?onglet=variantes`,
      iconKey: "trash",
    })
  },
})

/* ============================================================
   Helpers internes
   ============================================================ */

async function requireServiceOfMyOrg(
  ctx: QueryCtx,
  serviceId: Id<"services">,
  organismId: Id<"organisms">,
): Promise<Doc<"services">> {
  const service = await ctx.db.get(serviceId)
  if (!service) throw new Error("Service introuvable.")
  if (service.organismId !== organismId) {
    throw new Error("Ce service n'appartient pas à votre organisme.")
  }
  return service
}

async function requireVariantOfMyOrg(
  ctx: QueryCtx,
  variantId: Id<"serviceVariants">,
  organismId: Id<"organisms">,
): Promise<{ variant: Doc<"serviceVariants">; service: Doc<"services"> }> {
  const variant = await ctx.db.get(variantId)
  if (!variant) throw new Error("Variante introuvable.")
  const service = await requireServiceOfMyOrg(ctx, variant.serviceId, organismId)
  return { variant, service }
}

function normalizeKey(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60) || "variante"
}
