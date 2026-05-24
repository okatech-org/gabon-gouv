import { v } from "convex/values"
import { query } from "../_generated/server"
import { requireCitizen } from "./auth"

/**
 * Documents reçus (vue citoyen) — détail d'un document signé/émis et
 * liste agrégée pour la page /mon-espace/documents.
 */

export const listMyDocuments = query({
  args: { idnSub: v.string() },
  handler: async (ctx, { idnSub }) => {
    const { citizen } = await requireCitizen(ctx, idnSub)
    const docs = await ctx.db
      .query("documents")
      .withIndex("by_citizen", (q) => q.eq("citizenId", citizen._id))
      .collect()
    docs.sort((a, b) => b.issuedAt - a.issuedAt)

    const orgs = await Promise.all(docs.map((d) => ctx.db.get(d.organismId)))
    const requests = await Promise.all(
      docs.map((d) => ctx.db.get(d.requestId)),
    )

    const enriched = docs.map((d, i) => {
      const org = orgs[i]
      const year = new Date(d.issuedAt).getFullYear()
      return {
        id: d._id,
        actNumber: d.actNumber,
        title: d.title,
        org: org?.shortName ?? org?.name ?? "—",
        issuedAt: formatDateLong(d.issuedAt),
        issuedAtMs: d.issuedAt,
        year,
        status: d.status ?? "issued",
        revoked: Boolean(d.revokedAt),
        verificationCode: d.verificationCode ?? d.qrCode,
        requestRef: requests[i]?.ref,
        sha256Short: `${d.sha256.slice(0, 8)}…${d.sha256.slice(-4)}`,
      }
    })

    // Facettes pour filtres en tête : par année + par organisme
    const yearsSet = new Set(enriched.map((d) => d.year))
    const orgsSet = new Set(enriched.map((d) => d.org))
    return {
      documents: enriched,
      stats: {
        total: enriched.length,
        active: enriched.filter((d) => !d.revoked).length,
        revoked: enriched.filter((d) => d.revoked).length,
      },
      facets: {
        years: [...yearsSet].sort((a, b) => b - a),
        organisms: [...orgsSet].sort(),
      },
    }
  },
})

export const getMyDocument = query({
  args: { idnSub: v.string(), actNumber: v.string() },
  handler: async (ctx, { idnSub, actNumber }) => {
    const { citizen } = await requireCitizen(ctx, idnSub)

    const doc = await ctx.db
      .query("documents")
      .withIndex("by_act_number", (q) => q.eq("actNumber", actNumber))
      .first()
    if (!doc) return null
    if (doc.citizenId !== citizen._id) {
      throw new Error("Ce document ne vous appartient pas.")
    }

    const [organism, signer, request, registryEntry] = await Promise.all([
      ctx.db.get(doc.organismId),
      ctx.db.get(doc.issuedByAgentId),
      ctx.db.get(doc.requestId),
      doc.linkedRegistryEntryId
        ? ctx.db.get(doc.linkedRegistryEntryId)
        : Promise.resolve(null),
    ])

    // Champs métier extraits du payload (dépend du template)
    const payload = (doc.payload ?? {}) as Record<string, unknown>
    const meta: Array<{ label: string; value: string }> = []
    const add = (label: string, key: string) => {
      const v_ = payload[key]
      if (v_ !== undefined && v_ !== null) meta.push({ label, value: String(v_) })
    }
    add("Nom", "name")
    add("NIP", "nip")
    add("Né(e) le", "birthDate")
    add("À", "birthPlace")
    add("Père", "fatherName")
    add("Mère", "motherName")

    return {
      title: doc.title,
      citizenName: citizen.name,
      deliveredAt: formatDateLong(doc.issuedAt),
      org: organism?.shortName ?? organism?.name ?? "—",
      actNumber: doc.actNumber,
      commune: registryEntry?.commune ?? "—",
      year: registryEntry?.year ? String(registryEntry.year) : "—",
      signatory: signer?.name ?? doc.issuedByAgentNameSnapshot ?? "—",
      signedAt: doc.qualifiedTimestamp,
      meta,
      hash: doc.sha256,
      timestamp: doc.qualifiedTimestamp,
      signature: `${signer?.name ?? "—"} · ${organism?.shortName ?? organism?.name ?? "—"}`,
      verificationCode: doc.verificationCode ?? doc.qrCode,
      requestRef: request?.ref,
    }
  },
})

function formatDateLong(ms: number): string {
  return new Date(ms).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}
