/**
 * CRUD des pièces justificatives requises pour un service (Bloc 1.5).
 *
 * `variantOverrides[]` permet de définir des règles spécifiques par variante
 * (ex. « Extrait sans filiation » ne demande pas le justificatif de filiation).
 */

import { v } from "convex/values"
import type { Doc, Id } from "../_generated/dataModel"
import type { QueryCtx } from "../_generated/server"
import { mutation } from "../lib/triggers"
import { requireAgent } from "../auth"
import { writeAudit } from "../lib/audit"
import { actorFromAgent, assertCan } from "../lib/permissions"
import {
  pieceDocTypeValidator,
  requirementAutofillSourceValidator,
} from "../lib/enums"

/* ============================================================
   addRequirement
   ============================================================ */
export const addRequirement = mutation({
  args: {
    token: v.string(),
    serviceId: v.id("services"),
    label: v.string(),
    description: v.optional(v.string()),
    required: v.boolean(),
    acceptedDocTypes: v.array(pieceDocTypeValidator),
    autofillSource: v.optional(requirementAutofillSourceValidator),
  },
  handler: async (ctx, args) => {
    const me = await requireAgent(ctx, args.token)
    assertCan(actorFromAgent(me), "service.requirement.crud")
    const service = await requireServiceOfMyOrg(
      ctx,
      args.serviceId,
      me.organismId,
    )

    if (args.acceptedDocTypes.length === 0) {
      throw new Error("Au moins un type de document doit être accepté.")
    }

    const peers = await ctx.db
      .query("serviceRequirements")
      .withIndex("by_service", (q) => q.eq("serviceId", service._id))
      .collect()
    const nextOrder =
      peers.length === 0 ? 0 : Math.max(...peers.map((p) => p.order)) + 1

    const reqId = await ctx.db.insert("serviceRequirements", {
      serviceId: service._id,
      label: args.label.trim(),
      description: args.description?.trim(),
      required: args.required,
      acceptedDocTypes: args.acceptedDocTypes,
      autofillSource: args.autofillSource,
      order: nextOrder,
    })

    await writeAudit({
      ctx,
      verb: "service.requirement_added",
      actorKind: "agent",
      actorAgentId: me._id,
      actorAgentName: me.name,
      organismId: me.organismId,
      subjectKind: "serviceRequirements",
      subjectId: reqId,
      subjectLabel: `${service.title} · ${args.label}`,
      uiVerb: "a ajouté une pièce requise",
      linkTo: `/services/${service.slug}?onglet=pieces`,
      iconKey: "paperclip",
    })

    return { id: reqId }
  },
})

/* ============================================================
   updateRequirement
   ============================================================ */
export const updateRequirement = mutation({
  args: {
    token: v.string(),
    requirementId: v.id("serviceRequirements"),
    patch: v.object({
      label: v.optional(v.string()),
      description: v.optional(v.string()),
      required: v.optional(v.boolean()),
      acceptedDocTypes: v.optional(v.array(pieceDocTypeValidator)),
      autofillSource: v.optional(requirementAutofillSourceValidator),
      variantOverrides: v.optional(
        v.array(
          v.object({
            variantId: v.id("serviceVariants"),
            required: v.boolean(),
            acceptedDocTypes: v.optional(v.array(pieceDocTypeValidator)),
          }),
        ),
      ),
    }),
  },
  handler: async (ctx, { token, requirementId, patch }) => {
    const me = await requireAgent(ctx, token)
    assertCan(actorFromAgent(me), "service.requirement.crud")
    const { requirement, service } = await requireRequirementOfMyOrg(
      ctx,
      requirementId,
      me.organismId,
    )

    const updatePayload: Partial<Doc<"serviceRequirements">> = {}
    if (patch.label !== undefined) updatePayload.label = patch.label.trim()
    if (patch.description !== undefined)
      updatePayload.description = patch.description.trim()
    if (patch.required !== undefined) updatePayload.required = patch.required
    if (patch.acceptedDocTypes !== undefined) {
      if (patch.acceptedDocTypes.length === 0) {
        throw new Error("Au moins un type de document doit être accepté.")
      }
      updatePayload.acceptedDocTypes = patch.acceptedDocTypes
    }
    if (patch.autofillSource !== undefined)
      updatePayload.autofillSource = patch.autofillSource

    if (patch.variantOverrides !== undefined) {
      // Vérifier que toutes les variantes citées appartiennent au même service
      const variants = await ctx.db
        .query("serviceVariants")
        .withIndex("by_service", (q) => q.eq("serviceId", service._id))
        .collect()
      const validVariantIds = new Set(variants.map((v) => v._id.toString()))
      for (const override of patch.variantOverrides) {
        if (!validVariantIds.has(override.variantId.toString())) {
          throw new Error(
            "Override fait référence à une variante hors du service.",
          )
        }
      }
      updatePayload.variantOverrides =
        patch.variantOverrides.length === 0 ? undefined : patch.variantOverrides
    }

    await ctx.db.patch(requirementId, updatePayload)

    await writeAudit({
      ctx,
      verb: "service.requirement_updated",
      actorKind: "agent",
      actorAgentId: me._id,
      actorAgentName: me.name,
      organismId: me.organismId,
      subjectKind: "serviceRequirements",
      subjectId: requirementId,
      subjectLabel: `${service.title} · ${updatePayload.label ?? requirement.label}`,
      uiVerb: "a modifié une pièce requise",
      linkTo: `/services/${service.slug}?onglet=pieces`,
      iconKey: "edit",
      payload: { fields: Object.keys(updatePayload) },
    })
  },
})

/* ============================================================
   reorderRequirements
   ============================================================ */
export const reorderRequirements = mutation({
  args: {
    token: v.string(),
    serviceId: v.id("services"),
    orderedRequirementIds: v.array(v.id("serviceRequirements")),
  },
  handler: async (ctx, { token, serviceId, orderedRequirementIds }) => {
    const me = await requireAgent(ctx, token)
    assertCan(actorFromAgent(me), "service.requirement.crud")
    const service = await requireServiceOfMyOrg(ctx, serviceId, me.organismId)

    const requirements = await ctx.db
      .query("serviceRequirements")
      .withIndex("by_service", (q) => q.eq("serviceId", service._id))
      .collect()

    const provided = new Set(orderedRequirementIds.map((id) => id.toString()))
    const actual = new Set(requirements.map((r) => r._id.toString()))
    if (
      provided.size !== actual.size ||
      [...provided].some((id) => !actual.has(id))
    ) {
      throw new Error(
        "Liste de pièces incohérente avec celles du service.",
      )
    }

    for (let i = 0; i < orderedRequirementIds.length; i++) {
      await ctx.db.patch(orderedRequirementIds[i]!, { order: i })
    }

    await writeAudit({
      ctx,
      verb: "service.requirements_reordered",
      actorKind: "agent",
      actorAgentId: me._id,
      actorAgentName: me.name,
      organismId: me.organismId,
      subjectKind: "services",
      subjectId: service._id,
      subjectLabel: service.title,
      uiVerb: "a réordonné les pièces requises",
      linkTo: `/services/${service.slug}?onglet=pieces`,
      iconKey: "moveVertical",
    })
  },
})

/* ============================================================
   deleteRequirement
   ============================================================ */
export const deleteRequirement = mutation({
  args: { token: v.string(), requirementId: v.id("serviceRequirements") },
  handler: async (ctx, { token, requirementId }) => {
    const me = await requireAgent(ctx, token)
    assertCan(actorFromAgent(me), "service.requirement.crud")
    const { requirement, service } = await requireRequirementOfMyOrg(
      ctx,
      requirementId,
      me.organismId,
    )

    await ctx.db.delete(requirementId)

    await writeAudit({
      ctx,
      verb: "service.requirement_deleted",
      actorKind: "agent",
      actorAgentId: me._id,
      actorAgentName: me.name,
      organismId: me.organismId,
      subjectKind: "serviceRequirements",
      subjectId: requirementId,
      subjectLabel: `${service.title} · ${requirement.label}`,
      uiVerb: "a supprimé une pièce requise",
      linkTo: `/services/${service.slug}?onglet=pieces`,
      iconKey: "trash",
    })
  },
})

/* ============================================================
   Helpers
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

async function requireRequirementOfMyOrg(
  ctx: QueryCtx,
  requirementId: Id<"serviceRequirements">,
  organismId: Id<"organisms">,
): Promise<{
  requirement: Doc<"serviceRequirements">
  service: Doc<"services">
}> {
  const requirement = await ctx.db.get(requirementId)
  if (!requirement) throw new Error("Pièce requise introuvable.")
  const service = await requireServiceOfMyOrg(
    ctx,
    requirement.serviceId,
    organismId,
  )
  return { requirement, service }
}
