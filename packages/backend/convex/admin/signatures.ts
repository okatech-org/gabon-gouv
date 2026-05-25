/**
 * Queries dédiées à la page `/signatures` côté agent (Bloc 3).
 *
 * Permet à un officier signataire (ou tout agent susceptible d'être assignee
 * d'un step) d'avoir un écran d'entrée listant ses signatures en attente et
 * son historique récent de décisions.
 */

import { v } from "convex/values"
import { query } from "../_generated/server"
import type { Doc, Id } from "../_generated/dataModel"
import { requireAgent } from "../auth"

/**
 * Liste les signatures concernées par l'agent connecté.
 *
 * `scope` :
 *   - `"pending"` (défaut) → steps `active` assignés à moi (= action requise)
 *   - `"recent"` → mes 30 dernières décisions (steps `done` ou `refused`),
 *      les plus récentes d'abord
 *
 * Chaque entrée enrichit le step avec :
 *   - le document sujet (actNumber, titre)
 *   - la demande liée (ref, citoyen, service)
 *   - l'ordre + total de steps du circuit (pour afficher « étape 2/3 »)
 */
export const listMine = query({
  args: {
    token: v.string(),
    scope: v.optional(
      v.union(v.literal("pending"), v.literal("recent")),
    ),
  },
  handler: async (ctx, { token, scope }) => {
    const me = await requireAgent(ctx, token)
    const targetScope = scope ?? "pending"

    // Index by_assignee_status : on charge selon le scope avec une seule range.
    const targetStatuses: Array<Doc<"signatureCircuitSteps">["status"]> =
      targetScope === "pending" ? ["active"] : ["done", "refused"]

    const allSteps: Doc<"signatureCircuitSteps">[] = []
    for (const status of targetStatuses) {
      const rows = await ctx.db
        .query("signatureCircuitSteps")
        .withIndex("by_assignee_status", (q) =>
          q.eq("assigneeAgentId", me._id).eq("status", status),
        )
        .collect()
      allSteps.push(...rows)
    }

    // Tri : `pending` par date de création asc (FIFO), `recent` par décision desc
    if (targetScope === "pending") {
      allSteps.sort((a, b) => a._creationTime - b._creationTime)
    } else {
      allSteps.sort((a, b) => (b.decidedAt ?? 0) - (a.decidedAt ?? 0))
    }
    const limited = allSteps.slice(0, targetScope === "recent" ? 30 : 100)

    // Enrichissement : charge en parallèle circuits, documents, requests, citoyens
    const enriched = await Promise.all(
      limited.map(async (step) => {
        const circuit = await ctx.db.get(step.circuitId)
        if (!circuit) return null
        // Pour v1 on ne sert que les circuits "document" — les
        // correspondances/conventions auront leur propre page si besoin.
        if (circuit.subjectKind !== "document") return null

        const doc = await ctx.db.get(circuit.subjectId as Id<"documents">)
        if (!doc) return null
        // Filtrage de sécurité : un agent ne doit voir que les signatures
        // de son organisme (le step lui est assigné mais on est défensif).
        if (doc.organismId !== me.organismId) return null

        const [request, allSteps] = await Promise.all([
          ctx.db.get(doc.requestId),
          ctx.db
            .query("signatureCircuitSteps")
            .withIndex("by_circuit_order", (q) =>
              q.eq("circuitId", step.circuitId),
            )
            .collect(),
        ])
        if (!request) return null
        const citizen = await ctx.db.get(request.citizenId)
        const service = await ctx.db.get(request.serviceId)

        return {
          stepId: step._id,
          circuitId: circuit._id,
          stepOrder: step.order,
          stepsTotal: allSteps.length,
          stepStatus: step.status,
          decidedAt: step.decidedAt,
          comment: step.comment,
          document: {
            id: doc._id,
            actNumber: doc.actNumber,
            title: doc.title,
            status: doc.status,
            hasPdf: Boolean(doc.pdfStorageKey),
          },
          request: {
            ref: request.ref,
            urgent: request.urgent ?? false,
            depositedAt: request.depositedAt,
            dueAt: request.dueAt,
          },
          citizen: citizen && {
            name: citizen.name,
            nip: citizen.nip,
          },
          service: service && {
            title: service.title,
            category: service.category,
          },
        }
      }),
    )

    return enriched.filter((e): e is NonNullable<typeof e> => e !== null)
  },
})

/**
 * Compte rapide des signatures en attente pour le badge sidebar.
 * Plus léger que listMine — uniquement les IDs et le count.
 */
export const countMyPending = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const me = await requireAgent(ctx, token)
    const rows = await ctx.db
      .query("signatureCircuitSteps")
      .withIndex("by_assignee_status", (q) =>
        q.eq("assigneeAgentId", me._id).eq("status", "active"),
      )
      .collect()
    return rows.length
  },
})
