import { v } from "convex/values"
import { query } from "../_generated/server"
import { requireAgent } from "../auth"
import { actorFromAgent, assertCan } from "../lib/permissions"
import { getSaeProvider } from "../lib/saeProvider"

/* ---------- Liste archives SAE A7 ---------- */
export const list = query({
  args: { token: v.string(), status: v.optional(v.string()), limit: v.optional(v.number()) },
  handler: async (ctx, { token, status, limit }) => {
    const agent = await requireAgent(ctx, token)

    let rows = await ctx.db
      .query("archives")
      .withIndex("by_organism_status", (q) =>
        q.eq("producerOrganismId", agent.organismId),
      )
      .collect()

    if (status && status !== "all") {
      rows = rows.filter((r) => r.status === status)
    }

    rows.sort((a, b) => b.versedAt - a.versedAt)

    return rows.slice(0, limit ?? 50).map((r) => ({
      cote: r.cote,
      description: r.description,
      versedAt: r.versedAt,
      dua: r.dua,
      status: r.status,
      finalSort: r.finalSort,
      sha256: r.sha256,
    }))
  },
})

/* ---------- Stats archives (en-tête A7) ---------- */
export const stats = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const agent = await requireAgent(ctx, token)
    const rows = await ctx.db
      .query("archives")
      .withIndex("by_organism_status", (q) =>
        q.eq("producerOrganismId", agent.organismId),
      )
      .collect()

    const total = rows.length
    const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
    const versedThisMonth = rows.filter((r) => r.versedAt >= monthAgo).length
    const pendingDestruction = rows.filter(
      (r) => r.status === "scheduled_destruction",
    ).length

    return {
      versedThisMonth,
      total,
      pendingDestruction,
      integrityPct: 100, // calcul réel ultérieur
    }
  },
})

/* ============================================================
   Bloc 6 — queries enrichies (Option C hybride)
   ============================================================ */

/**
 * Liste paginée des archives de l'organisme avec scopes + search.
 *
 * Scopes :
 *   - `all` : toutes (défaut)
 *   - `active` : status=active
 *   - `dua_expired` : duaExpiresAt < now (à transmettre au SAE pour
 *     élimination)
 *   - `external_pending` : archives marquées externalStatus=pending_dispatch
 *     (à pousser quand le SAE national sera disponible)
 */
export const listForOrg = query({
  args: {
    token: v.string(),
    scope: v.optional(
      v.union(
        v.literal("all"),
        v.literal("active"),
        v.literal("dua_expired"),
        v.literal("external_pending"),
      ),
    ),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { token, scope, search, limit }) => {
    const agent = await requireAgent(ctx, token)
    assertCan(actorFromAgent(agent), "archive.read")
    const scopeFinal = scope ?? "all"

    let rows = await ctx.db
      .query("archives")
      .withIndex("by_organism_status", (q) =>
        q.eq("producerOrganismId", agent.organismId),
      )
      .collect()

    if (scopeFinal === "active") {
      rows = rows.filter((r) => r.status === "active")
    } else if (scopeFinal === "dua_expired") {
      const now = Date.now()
      rows = rows.filter(
        (r) =>
          r.duaExpiresAt !== undefined &&
          r.duaExpiresAt < now &&
          r.status === "active",
      )
    } else if (scopeFinal === "external_pending") {
      rows = rows.filter((r) => r.externalStatus === "pending_dispatch")
    }

    if (search) {
      const s = search.toLowerCase().trim()
      rows = rows.filter(
        (r) =>
          r.cote.toLowerCase().includes(s) ||
          r.description.toLowerCase().includes(s) ||
          r.sha256.startsWith(s),
      )
    }

    rows.sort((a, b) => b.versedAt - a.versedAt)
    return rows.slice(0, limit ?? 100).map(shape)
  },
})

/**
 * Détail d'une archive (consultation seule).
 */
export const getDetail = query({
  args: { token: v.string(), cote: v.string() },
  handler: async (ctx, { token, cote }) => {
    const agent = await requireAgent(ctx, token)
    assertCan(actorFromAgent(agent), "archive.read")
    const archive = await ctx.db
      .query("archives")
      .withIndex("by_cote", (q) => q.eq("cote", cote))
      .first()
    if (!archive) return null
    if (archive.producerOrganismId !== agent.organismId) {
      throw new Error("Archive hors de votre périmètre.")
    }
    // Enrichit avec les liens (request, document, correspondance)
    const [linkedRequest, linkedDocument, linkedCorrespondence] =
      await Promise.all([
        archive.linkedRequestId
          ? ctx.db.get(archive.linkedRequestId)
          : Promise.resolve(null),
        archive.linkedDocumentId
          ? ctx.db.get(archive.linkedDocumentId)
          : Promise.resolve(null),
        archive.linkedCorrespondenceId
          ? ctx.db.get(archive.linkedCorrespondenceId)
          : Promise.resolve(null),
      ])
    return {
      ...shape(archive),
      sha256: archive.sha256, // full pour la page détail
      qualifiedTimestamp: archive.qualifiedTimestamp,
      sizeBytes: archive.sizeBytes,
      storageReplicas: archive.storageReplicas,
      lastIntegrityCheckAt: archive.lastIntegrityCheckAt,
      lastIntegrityCheckOutcome: archive.lastIntegrityCheckOutcome,
      externalSaeId: archive.externalSaeId,
      externalSaeKind: archive.externalSaeKind,
      externalStatus: archive.externalStatus,
      externalStatusUpdatedAt: archive.externalStatusUpdatedAt,
      linkedRequest: linkedRequest
        ? { ref: linkedRequest.ref, status: linkedRequest.status }
        : null,
      linkedDocument: linkedDocument
        ? { actNumber: linkedDocument.actNumber, status: linkedDocument.status }
        : null,
      linkedCorrespondence: linkedCorrespondence
        ? {
            ref: linkedCorrespondence.ref,
            subject: linkedCorrespondence.subject,
          }
        : null,
    }
  },
})

/**
 * Stats détaillées pour la page /archives (Bloc 6).
 *
 * Inclut :
 *   - total des archives
 *   - archives actives
 *   - archives à DUA expirée (à éliminer via SAE)
 *   - archives en attente de push externe (si organisme avec SAE distant)
 *   - kind du provider configuré
 */
export const getStatsForOrg = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const agent = await requireAgent(ctx, token)
    assertCan(actorFromAgent(agent), "archive.read")
    const rows = await ctx.db
      .query("archives")
      .withIndex("by_organism_status", (q) =>
        q.eq("producerOrganismId", agent.organismId),
      )
      .collect()
    const now = Date.now()
    const provider = await getSaeProvider(ctx, agent.organismId)
    return {
      total: rows.length,
      active: rows.filter((r) => r.status === "active").length,
      duaExpired: rows.filter(
        (r) =>
          r.duaExpiresAt !== undefined &&
          r.duaExpiresAt < now &&
          r.status === "active",
      ).length,
      externalPending: rows.filter(
        (r) => r.externalStatus === "pending_dispatch",
      ).length,
      providerKind: provider.kind,
    }
  },
})

/* ============================================================
   Helpers
   ============================================================ */

function shape(r: {
  _id: string
  cote: string
  description: string
  versedAt: number
  dua: string
  duaExpiresAt?: number
  status: string
  finalSort: string
  sha256: string
  linkedRequestId?: string
  linkedDocumentId?: string
  linkedCorrespondenceId?: string
  externalSaeId?: string
  externalSaeKind?: string
  externalStatus?: string
}) {
  return {
    id: r._id,
    cote: r.cote,
    description: r.description,
    versedAt: r.versedAt,
    dua: r.dua,
    duaExpiresAt: r.duaExpiresAt,
    status: r.status,
    finalSort: r.finalSort,
    sha256Short: r.sha256.slice(0, 12),
    linkedRequestId: r.linkedRequestId,
    linkedDocumentId: r.linkedDocumentId,
    linkedCorrespondenceId: r.linkedCorrespondenceId,
    externalSaeId: r.externalSaeId,
    externalSaeKind: r.externalSaeKind,
    externalStatus: r.externalStatus,
  }
}
