/**
 * CRUD des templates de documents générés et de leurs variables (Bloc 1.6).
 *
 * Règles de versionnage :
 *   - `upsertTemplate` crée une nouvelle version `draft` quand on édite un
 *     template `active` (snapshot pour les demandes en cours).
 *   - `validateTemplate` coche `validatedByComite=true` (workflow comité v1).
 *   - `activateTemplate` passe une version validée en `active` et déprécie
 *     la version `active` précédente (une seule active par variante).
 */

import { v } from "convex/values"
import type { Doc, Id } from "../_generated/dataModel"
import type { QueryCtx } from "../_generated/server"
import { mutation } from "../lib/triggers"
import { requireAgent } from "../auth"
import { writeAudit } from "../lib/audit"
import { actorFromAgent, assertCan } from "../lib/permissions"
import { templateVariableSourceValidator } from "../lib/enums"

/* ============================================================
   upsertTemplate
   ============================================================ */
export const upsertTemplate = mutation({
  args: {
    token: v.string(),
    serviceVariantId: v.id("serviceVariants"),
    key: v.string(),
    title: v.string(),
    bodyTemplate: v.string(),
    legalReference: v.optional(v.string()),
    /** Si fourni, on édite cette version. Sinon on crée une nouvelle v1 (ou v(N+1)). */
    templateId: v.optional(v.id("documentTemplates")),
  },
  handler: async (ctx, args) => {
    const me = await requireAgent(ctx, args.token)
    assertCan(actorFromAgent(me), "service.template.update")
    const { variant, service } = await requireVariantOfMyOrg(
      ctx,
      args.serviceVariantId,
      me.organismId,
    )

    // Cas 1 : édition d'un template existant
    if (args.templateId) {
      const existing = await ctx.db.get(args.templateId)
      if (!existing || existing.serviceVariantId !== args.serviceVariantId) {
        throw new Error("Template introuvable pour cette variante.")
      }

      if (existing.status === "active") {
        // Snapshot : on crée une nouvelle version draft plutôt que muter l'active
        const newVersion = bumpVersion(existing.version)
        const newId = await ctx.db.insert("documentTemplates", {
          serviceVariantId: args.serviceVariantId,
          key: existing.key,
          version: newVersion,
          title: args.title.trim(),
          bodyTemplate: args.bodyTemplate,
          status: "draft",
          validatedByComite: false,
          legalReference: args.legalReference?.trim(),
        })
        await writeAudit({
          ctx,
          verb: "service.template_drafted",
          actorKind: "agent",
          actorAgentId: me._id,
          actorAgentName: me.name,
          organismId: me.organismId,
          subjectKind: "documentTemplates",
          subjectId: newId,
          subjectLabel: `${service.title} · ${variant.label} · ${args.title} ${newVersion}`,
          uiVerb: "a créé une nouvelle version du template",
          linkTo: `/services/${service.slug}?onglet=templates`,
          iconKey: "fileText",
          payload: { fromVersion: existing.version, toVersion: newVersion },
        })
        return { id: newId, version: newVersion }
      }

      // Sinon (draft ou deprecated) : édition in-place
      await ctx.db.patch(args.templateId, {
        title: args.title.trim(),
        bodyTemplate: args.bodyTemplate,
        legalReference: args.legalReference?.trim(),
        // Toute édition invalide la validation comité précédente
        validatedByComite: false,
        validatedAt: undefined,
      })
      await writeAudit({
        ctx,
        verb: "service.template_drafted",
        actorKind: "agent",
        actorAgentId: me._id,
        actorAgentName: me.name,
        organismId: me.organismId,
        subjectKind: "documentTemplates",
        subjectId: args.templateId,
        subjectLabel: `${service.title} · ${variant.label} · ${args.title}`,
        uiVerb: "a modifié le template",
        linkTo: `/services/${service.slug}?onglet=templates`,
        iconKey: "edit",
      })
      return { id: args.templateId, version: existing.version }
    }

    // Cas 2 : création d'un nouveau template (nouvelle key)
    const existingKey = await ctx.db
      .query("documentTemplates")
      .withIndex("by_variant", (q) =>
        q.eq("serviceVariantId", args.serviceVariantId),
      )
      .collect()
    if (existingKey.some((t) => t.key === args.key)) {
      throw new Error(
        `Un template avec la clé « ${args.key} » existe déjà sur cette variante.`,
      )
    }

    const newId = await ctx.db.insert("documentTemplates", {
      serviceVariantId: args.serviceVariantId,
      key: args.key.trim(),
      version: "v1",
      title: args.title.trim(),
      bodyTemplate: args.bodyTemplate,
      status: "draft",
      validatedByComite: false,
      legalReference: args.legalReference?.trim(),
    })
    await writeAudit({
      ctx,
      verb: "service.template_drafted",
      actorKind: "agent",
      actorAgentId: me._id,
      actorAgentName: me.name,
      organismId: me.organismId,
      subjectKind: "documentTemplates",
      subjectId: newId,
      subjectLabel: `${service.title} · ${variant.label} · ${args.title} v1`,
      uiVerb: "a créé un template",
      linkTo: `/services/${service.slug}?onglet=templates`,
      iconKey: "filePlus",
    })
    return { id: newId, version: "v1" }
  },
})

/* ============================================================
   validateTemplate (validation comité — case à cocher v1)
   ============================================================ */
export const validateTemplate = mutation({
  args: { token: v.string(), templateId: v.id("documentTemplates") },
  handler: async (ctx, { token, templateId }) => {
    const me = await requireAgent(ctx, token)
    assertCan(actorFromAgent(me), "service.template.validate")
    const { template, variant, service } = await requireTemplateOfMyOrg(
      ctx,
      templateId,
      me.organismId,
    )

    if (template.status === "deprecated") {
      throw new Error(
        "Impossible de valider un template déprécié — repartez d'une nouvelle version.",
      )
    }

    await ctx.db.patch(templateId, {
      validatedByComite: true,
      validatedAt: new Date().toISOString().slice(0, 10),
    })

    await writeAudit({
      ctx,
      verb: "service.template_validated",
      actorKind: "agent",
      actorAgentId: me._id,
      actorAgentName: me.name,
      organismId: me.organismId,
      subjectKind: "documentTemplates",
      subjectId: templateId,
      subjectLabel: `${service.title} · ${variant.label} · ${template.title} ${template.version}`,
      uiVerb: "a validé le template",
      linkTo: `/services/${service.slug}?onglet=templates`,
      iconKey: "checkCircle",
    })
  },
})

/* ============================================================
   activateTemplate (déprécie l'ancien active)
   ============================================================ */
export const activateTemplate = mutation({
  args: { token: v.string(), templateId: v.id("documentTemplates") },
  handler: async (ctx, { token, templateId }) => {
    const me = await requireAgent(ctx, token)
    assertCan(actorFromAgent(me), "service.template.activate")
    const { template, variant, service } = await requireTemplateOfMyOrg(
      ctx,
      templateId,
      me.organismId,
    )

    if (template.status === "active") return // idempotent
    if (!template.validatedByComite) {
      throw new Error(
        "Activation refusée : le template doit être validé par le comité.",
      )
    }

    // Déprécier toutes les autres versions actives sur la même variante + même key
    const siblings = await ctx.db
      .query("documentTemplates")
      .withIndex("by_variant", (q) =>
        q.eq("serviceVariantId", template.serviceVariantId),
      )
      .collect()
    for (const s of siblings) {
      if (s.key !== template.key) continue
      if (s._id === templateId) continue
      if (s.status === "active") {
        await ctx.db.patch(s._id, { status: "deprecated" })
      }
    }

    await ctx.db.patch(templateId, { status: "active" })

    await writeAudit({
      ctx,
      verb: "service.template_activated",
      actorKind: "agent",
      actorAgentId: me._id,
      actorAgentName: me.name,
      organismId: me.organismId,
      subjectKind: "documentTemplates",
      subjectId: templateId,
      subjectLabel: `${service.title} · ${variant.label} · ${template.title} ${template.version}`,
      uiVerb: "a activé le template",
      linkTo: `/services/${service.slug}?onglet=templates`,
      iconKey: "rocket",
    })
  },
})

/* ============================================================
   CRUD variables de template
   ============================================================ */

export const addTemplateVariable = mutation({
  args: {
    token: v.string(),
    templateId: v.id("documentTemplates"),
    key: v.string(),
    label: v.string(),
    source: templateVariableSourceValidator,
    sourcePath: v.optional(v.string()),
    required: v.boolean(),
  },
  handler: async (ctx, args) => {
    const me = await requireAgent(ctx, args.token)
    assertCan(actorFromAgent(me), "service.template.update")
    const { template, service, variant } = await requireTemplateOfMyOrg(
      ctx,
      args.templateId,
      me.organismId,
    )

    if (template.status === "active") {
      throw new Error(
        "Impossible d'éditer un template actif — créez une nouvelle version.",
      )
    }

    const peers = await ctx.db
      .query("documentTemplateVariables")
      .withIndex("by_template", (q) => q.eq("templateId", args.templateId))
      .collect()
    if (peers.some((p) => p.key === args.key)) {
      throw new Error(`Une variable « ${args.key} » existe déjà.`)
    }
    const nextOrder =
      peers.length === 0 ? 0 : Math.max(...peers.map((p) => p.order)) + 1

    const id = await ctx.db.insert("documentTemplateVariables", {
      templateId: args.templateId,
      key: args.key.trim(),
      label: args.label.trim(),
      source: args.source,
      sourcePath: args.sourcePath?.trim(),
      required: args.required,
      order: nextOrder,
    })

    await writeAudit({
      ctx,
      verb: "service.template_var_added",
      actorKind: "agent",
      actorAgentId: me._id,
      actorAgentName: me.name,
      organismId: me.organismId,
      subjectKind: "documentTemplateVariables",
      subjectId: id,
      subjectLabel: `${service.title} · ${variant.label} · {{${args.key}}}`,
      uiVerb: "a ajouté une variable de template",
      linkTo: `/services/${service.slug}?onglet=templates`,
      iconKey: "code",
    })

    return { id }
  },
})

export const updateTemplateVariable = mutation({
  args: {
    token: v.string(),
    variableId: v.id("documentTemplateVariables"),
    patch: v.object({
      label: v.optional(v.string()),
      source: v.optional(templateVariableSourceValidator),
      sourcePath: v.optional(v.string()),
      required: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, { token, variableId, patch }) => {
    const me = await requireAgent(ctx, token)
    assertCan(actorFromAgent(me), "service.template.update")
    const { variable, template, service, variant } =
      await requireTemplateVariableOfMyOrg(ctx, variableId, me.organismId)

    if (template.status === "active") {
      throw new Error(
        "Impossible d'éditer un template actif — créez une nouvelle version.",
      )
    }

    const updatePayload: Partial<Doc<"documentTemplateVariables">> = {}
    if (patch.label !== undefined) updatePayload.label = patch.label.trim()
    if (patch.source !== undefined) updatePayload.source = patch.source
    if (patch.sourcePath !== undefined)
      updatePayload.sourcePath = patch.sourcePath.trim() || undefined
    if (patch.required !== undefined) updatePayload.required = patch.required

    await ctx.db.patch(variableId, updatePayload)

    await writeAudit({
      ctx,
      verb: "service.template_var_updated",
      actorKind: "agent",
      actorAgentId: me._id,
      actorAgentName: me.name,
      organismId: me.organismId,
      subjectKind: "documentTemplateVariables",
      subjectId: variableId,
      subjectLabel: `${service.title} · ${variant.label} · {{${variable.key}}}`,
      uiVerb: "a modifié une variable de template",
      linkTo: `/services/${service.slug}?onglet=templates`,
      iconKey: "edit",
    })
  },
})

export const deleteTemplateVariable = mutation({
  args: {
    token: v.string(),
    variableId: v.id("documentTemplateVariables"),
  },
  handler: async (ctx, { token, variableId }) => {
    const me = await requireAgent(ctx, token)
    assertCan(actorFromAgent(me), "service.template.update")
    const { variable, template, service, variant } =
      await requireTemplateVariableOfMyOrg(ctx, variableId, me.organismId)

    if (template.status === "active") {
      throw new Error(
        "Impossible d'éditer un template actif — créez une nouvelle version.",
      )
    }

    await ctx.db.delete(variableId)

    await writeAudit({
      ctx,
      verb: "service.template_var_deleted",
      actorKind: "agent",
      actorAgentId: me._id,
      actorAgentName: me.name,
      organismId: me.organismId,
      subjectKind: "documentTemplateVariables",
      subjectId: variableId,
      subjectLabel: `${service.title} · ${variant.label} · {{${variable.key}}}`,
      uiVerb: "a supprimé une variable de template",
      linkTo: `/services/${service.slug}?onglet=templates`,
      iconKey: "trash",
    })
  },
})

/* ============================================================
   Helpers internes
   ============================================================ */

function bumpVersion(current: string): string {
  // « v3 » → « v4 », « v3.2 » → « v3.3 », fallback « v2 »
  const m = current.match(/^v(\d+)(?:\.(\d+))?$/i)
  if (!m) return "v2"
  if (m[2] !== undefined) {
    return `v${m[1]}.${Number(m[2]) + 1}`
  }
  return `v${Number(m[1]) + 1}`
}

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

async function requireTemplateOfMyOrg(
  ctx: QueryCtx,
  templateId: Id<"documentTemplates">,
  organismId: Id<"organisms">,
): Promise<{
  template: Doc<"documentTemplates">
  variant: Doc<"serviceVariants">
  service: Doc<"services">
}> {
  const template = await ctx.db.get(templateId)
  if (!template) throw new Error("Template introuvable.")
  const { variant, service } = await requireVariantOfMyOrg(
    ctx,
    template.serviceVariantId,
    organismId,
  )
  return { template, variant, service }
}

async function requireTemplateVariableOfMyOrg(
  ctx: QueryCtx,
  variableId: Id<"documentTemplateVariables">,
  organismId: Id<"organisms">,
): Promise<{
  variable: Doc<"documentTemplateVariables">
  template: Doc<"documentTemplates">
  variant: Doc<"serviceVariants">
  service: Doc<"services">
}> {
  const variable = await ctx.db.get(variableId)
  if (!variable) throw new Error("Variable introuvable.")
  const { template, variant, service } = await requireTemplateOfMyOrg(
    ctx,
    variable.templateId,
    organismId,
  )
  return { variable, template, variant, service }
}
