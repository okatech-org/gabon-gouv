/**
 * Queries et mutations internes liées aux documents émis.
 *
 * - `getRenderContext` (query publique mais idempotente) : agrège les
 *   données nécessaires au composant React-PDF en un seul appel, pour
 *   l'action Node qui rend le PDF.
 * - `applyPdfResult` (mutation interne) : applique le résultat du rendu
 *   (storageKey + sha256 réel + sizeBytes). Met aussi à jour le sha256
 *   de l'`archives` correspondante pour qu'elle reflète le hash final.
 */

import { v } from "convex/values"
import { query } from "../_generated/server"
import { internalMutation } from "../lib/triggers"
import { requireAgent } from "../auth"

/**
 * Contexte minimal pour rendre un PDF d'acte. Renvoie `null` si le doc
 * a été supprimé entre temps, ou un flag `pdfAlreadyGenerated=true` si
 * le PDF existe déjà (idempotence du scheduler).
 */
export const getRenderContext = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, { documentId }) => {
    const doc = await ctx.db.get(documentId)
    if (!doc) return null
    if (doc.pdfStorageKey) {
      return { pdfAlreadyGenerated: true as const }
    }

    const [request, organism, service, signatory] = await Promise.all([
      ctx.db.get(doc.requestId),
      ctx.db.get(doc.organismId),
      // Le service est attaché à la request, pas directement au document
      // (chacun ses tables) — on charge via la request.
      ctx.db.get(doc.requestId).then((r) =>
        r ? ctx.db.get(r.serviceId) : null,
      ),
      ctx.db.get(doc.issuedByAgentId),
    ])
    if (!request) return null

    // Référence légale prioritaire : du document, sinon du service
    const legalReference =
      doc.legalReference ?? service?.legalReferences?.[0] ?? undefined

    return {
      pdfAlreadyGenerated: false as const,
      actNumber: doc.actNumber,
      title: doc.title,
      organismName: organism?.shortName ?? organism?.name ?? "Organisme",
      category: service?.category ?? "—",
      issuedAt: doc.issuedAt,
      verificationCode: doc.verificationCode ?? doc.actNumber,
      legalReference,
      payload: (doc.payload as Record<string, unknown>) ?? {},
      signatoryName:
        doc.issuedByAgentNameSnapshot ?? signatory?.name ?? "Agent",
    }
  },
})

/**
 * Patch le document avec le résultat de la génération PDF. Idempotent :
 * si pdfStorageKey existe déjà, on ne fait rien (l'action a été lancée
 * deux fois, ce qui peut arriver si le scheduler retry).
 *
 * Met également à jour le sha256 de l'archive squelette créée par
 * `finalizeIssuance` pour qu'elle pointe sur le vrai hash du PDF.
 */
export const applyPdfResult = internalMutation({
  args: {
    documentId: v.id("documents"),
    pdfStorageKey: v.string(),
    sha256: v.string(),
    sizeBytes: v.number(),
  },
  handler: async (ctx, { documentId, pdfStorageKey, sha256, sizeBytes }) => {
    const doc = await ctx.db.get(documentId)
    if (!doc) return
    if (doc.pdfStorageKey) {
      // Déjà patché — supprimer le PDF orphelin pour ne pas polluer storage
      await ctx.storage.delete(pdfStorageKey)
      return
    }

    await ctx.db.patch(documentId, {
      pdfStorageKey,
      sha256,
    })

    // Mise à jour de l'archive squelette (le sha256 doit refléter le PDF émis)
    const archive = await ctx.db
      .query("archives")
      .withIndex("by_organism_status", (q) =>
        q.eq("producerOrganismId", doc.organismId).eq("status", "active"),
      )
      .filter((q) => q.eq(q.field("linkedDocumentId"), doc._id))
      .first()
    if (archive) {
      await ctx.db.patch(archive._id, { sha256, sizeBytes })
    }
  },
})

/* ---------- Liste de la file de génération PDF ---------- */
/**
 * Documents en cours de préparation / signature / récemment émis dans
 * l'organisme. Utilisée par la page `/generation` (B3 — précédemment,
 * la sidebar pointait vers une ref de demande hardcodée).
 *
 * Tri : status (draft → prepared → signed → issued → revoked) puis date.
 */
export const listGenerationQueue = query({
  args: {
    token: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { token, limit }) => {
    const me = await requireAgent(ctx, token)
    const docs = await ctx.db
      .query("documents")
      .withIndex("by_organism", (q) => q.eq("organismId", me.organismId))
      .collect()

    const enriched = await Promise.all(
      docs.map(async (d) => {
        const request = await ctx.db.get(d.requestId)
        const citizen = await ctx.db.get(d.citizenId)
        return {
          documentId: d._id,
          actNumber: d.actNumber,
          title: d.title,
          status: d.status ?? "draft",
          issuedAt: d.issuedAt,
          requestRef: request?.ref ?? "—",
          citizenName: citizen?.name ?? "—",
          hasPdf: Boolean(d.pdfStorageKey),
          revokedAt: d.revokedAt,
        }
      }),
    )

    const statusOrder: Record<string, number> = {
      draft: 0,
      prepared: 1,
      signed: 2,
      issued: 3,
      revoked: 4,
    }
    enriched.sort((a, b) => {
      const so = statusOrder[a.status] - statusOrder[b.status]
      if (so !== 0) return so
      return b.issuedAt - a.issuedAt
    })

    const inFlightCount = enriched.filter(
      (d) => d.status === "draft" || d.status === "prepared" || d.status === "signed",
    ).length
    const issuedCount = enriched.filter((d) => d.status === "issued").length
    const revokedCount = enriched.filter((d) => d.status === "revoked").length

    return {
      stats: {
        total: enriched.length,
        inFlight: inFlightCount,
        issued: issuedCount,
        revoked: revokedCount,
      },
      rows: enriched.slice(0, limit ?? 100),
    }
  },
})
