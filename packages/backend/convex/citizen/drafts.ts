/**
 * Brouillons de demandes citoyennes (table `requestDrafts`).
 *
 * Sauvegarde incrémentale du wizard de dépôt (autosave côté client toutes
 * les ~2 secondes) pour qu'un citoyen puisse fermer la fenêtre, revenir
 * plus tard, et reprendre là où il s'est arrêté.
 *
 * Convention :
 *   - 1 seul brouillon par (citoyen, service) — pas de variante imbriquée
 *     dans la clé d'unicité, le citoyen peut changer de variante dans son
 *     brouillon en cours
 *   - upsert idempotent : si un brouillon existe, on patch ; sinon on insert
 *   - le brouillon est supprimé automatiquement lors de submitRequest (cf
 *     citizen/requests.ts)
 */

import { v } from "convex/values"
import { query } from "../_generated/server"
import { mutation } from "../lib/triggers"
import { requireCitizen } from "./auth"

/* ============================================================
   saveDraft — upsert
   ============================================================ */
export const saveDraft = mutation({
  args: {
    idnSub: v.string(),
    serviceId: v.id("services"),
    serviceVariantId: v.optional(v.id("serviceVariants")),
    currentStep: v.number(),
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    const { citizen } = await requireCitizen(ctx, args.idnSub)

    // Vérifie que le service existe et est publié (pas de brouillon sur
    // service archivé/draft côté agent)
    const service = await ctx.db.get(args.serviceId)
    if (!service) throw new Error("Service introuvable.")
    if (service.status !== "published") {
      throw new Error("Ce service n'accepte plus de nouvelles demandes.")
    }
    if (args.serviceVariantId) {
      const variant = await ctx.db.get(args.serviceVariantId)
      if (!variant || variant.serviceId !== service._id) {
        throw new Error("Variante invalide pour ce service.")
      }
    }

    // Cherche un brouillon existant pour (citoyen, service)
    const existing = await ctx.db
      .query("requestDrafts")
      .withIndex("by_citizen", (q) => q.eq("citizenId", citizen._id))
      .collect()
    const match = existing.find((d) => d.serviceId === args.serviceId)

    const now = Date.now()
    if (match) {
      await ctx.db.patch(match._id, {
        serviceVariantId: args.serviceVariantId,
        currentStep: args.currentStep,
        payload: args.payload,
        updatedAt: now,
      })
      return { id: match._id, created: false }
    }

    const id = await ctx.db.insert("requestDrafts", {
      citizenId: citizen._id,
      serviceId: args.serviceId,
      serviceVariantId: args.serviceVariantId,
      currentStep: args.currentStep,
      payload: args.payload,
      updatedAt: now,
    })
    return { id, created: true }
  },
})

/* ============================================================
   getMyDraft — par service (pour reprise)
   ============================================================ */
export const getMyDraft = query({
  args: { idnSub: v.string(), serviceSlug: v.string() },
  handler: async (ctx, { idnSub, serviceSlug }) => {
    const { citizen } = await requireCitizen(ctx, idnSub)
    const service = await ctx.db
      .query("services")
      .withIndex("by_slug", (q) => q.eq("slug", serviceSlug))
      .first()
    if (!service) return null

    const drafts = await ctx.db
      .query("requestDrafts")
      .withIndex("by_citizen", (q) => q.eq("citizenId", citizen._id))
      .collect()
    const match = drafts.find((d) => d.serviceId === service._id)
    if (!match) return null

    return {
      id: match._id,
      serviceVariantId: match.serviceVariantId ?? null,
      currentStep: match.currentStep,
      payload: match.payload,
      updatedAt: match.updatedAt,
    }
  },
})

/* ============================================================
   listMyDrafts — page « Mes brouillons » (vue d'ensemble)
   ============================================================ */
export const listMyDrafts = query({
  args: { idnSub: v.string() },
  handler: async (ctx, { idnSub }) => {
    const { citizen } = await requireCitizen(ctx, idnSub)
    const drafts = await ctx.db
      .query("requestDrafts")
      .withIndex("by_citizen", (q) => q.eq("citizenId", citizen._id))
      .collect()
    drafts.sort((a, b) => b.updatedAt - a.updatedAt)

    const items = await Promise.all(
      drafts.map(async (d) => {
        const service = await ctx.db.get(d.serviceId)
        const variant = d.serviceVariantId
          ? await ctx.db.get(d.serviceVariantId)
          : null
        const organism = service ? await ctx.db.get(service.organismId) : null
        return {
          id: d._id,
          serviceSlug: service?.slug ?? "",
          serviceTitle: service?.title ?? "Service inconnu",
          variantLabel: variant?.label ?? null,
          organism: organism?.shortName ?? organism?.name ?? "—",
          category: service?.category ?? "—",
          currentStep: d.currentStep,
          updatedAt: d.updatedAt,
        }
      }),
    )
    // Filtre les brouillons orphelins (service supprimé) — au cas où
    return items.filter((d) => d.serviceSlug !== "")
  },
})

/* ============================================================
   discardDraft — explicite (« annuler la reprise »)
   ============================================================ */
export const discardDraft = mutation({
  args: { idnSub: v.string(), draftId: v.id("requestDrafts") },
  handler: async (ctx, { idnSub, draftId }) => {
    const { citizen } = await requireCitizen(ctx, idnSub)
    const draft = await ctx.db.get(draftId)
    if (!draft) return // idempotent
    if (draft.citizenId !== citizen._id) {
      throw new Error("Ce brouillon ne vous appartient pas.")
    }
    await ctx.db.delete(draftId)
  },
})
