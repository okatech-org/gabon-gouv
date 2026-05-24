import { v } from "convex/values"
import { query } from "../_generated/server"
import { requireCitizen } from "./auth"

/**
 * Documents reçus (vue citoyen) — détail d'un document signé/émis.
 */

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
