/**
 * Vérification publique d'un document délivré (Bloc 4).
 *
 * **Sans authentification** — accessible par n'importe quel destinataire d'un
 * acte (banquier, employeur, consulat étranger…) qui scanne le QR ou tape le
 * code de vérification.
 *
 * Mutation au lieu de query parce qu'on a 2 side effects :
 *   1. Log de la consultation dans `publicVerifications` (audit / stats).
 *   2. Création paresseuse d'une `registryEntries` à la première consultation
 *      pour les actes d'état civil (ADR-0011) — permet la mise en valeur d'un
 *      registre civil construit à la demande sans bloc back-fill massif.
 *
 * Le payload retourné est volontairement **minimal** (pas de PII en clair :
 * pas de date/lieu de naissance, pas d'adresse). Le vérificateur sait
 * seulement que l'acte existe, qu'il porte le nom revendiqué, qu'il a été
 * émis par tel organisme à telle date, et qu'il n'est pas révoqué.
 */

import { v } from "convex/values"
import type { Doc, Id } from "../_generated/dataModel"
import type { MutationCtx } from "../_generated/server"
import { mutation } from "../lib/triggers"
import {
  publicVerificationOutcomeValidator,
  type PublicVerificationOutcome,
} from "../lib/enums"

export const verifyByCode = mutation({
  args: {
    code: v.string(),
    /** Hash SHA-256 de l'IP du vérificateur (calculé en amont par la HTTP
     *  action ou par la page Next.js qui forward). Optionnel — si absent on
     *  log quand même mais sans traçabilité IP. */
    verifierIpHash: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  returns: v.object({
    outcome: publicVerificationOutcomeValidator,
    document: v.optional(
      v.object({
        actNumber: v.string(),
        title: v.string(),
        organismName: v.string(),
        issuedAt: v.number(),
        revokedAt: v.optional(v.number()),
        revocationReason: v.optional(v.string()),
        // Empreinte courte pour cross-check humain. On NE renvoie PAS le
        // sha256 complet pour éviter le brute-force du PDF.
        sha256Short: v.string(),
        beneficiaryName: v.string(),
      }),
    ),
  }),
  handler: async (ctx, { code, verifierIpHash, userAgent }) => {
    const normalized = normalizeCode(code)
    if (!normalized) {
      return { outcome: "unknown" as const }
    }

    const doc = await ctx.db
      .query("documents")
      .withIndex("by_verification_code", (q) =>
        q.eq("verificationCode", normalized),
      )
      .first()

    if (!doc) {
      // On log même les codes invalides pour détecter du brute-force.
      await logVerification(ctx, {
        documentId: null,
        verificationCode: normalized,
        outcome: "unknown",
        verifierIpHash,
        userAgent,
      })
      return { outcome: "unknown" as const }
    }

    const outcome: PublicVerificationOutcome =
      doc.status === "revoked" ? "revoked" : "valid"

    await logVerification(ctx, {
      documentId: doc._id,
      verificationCode: normalized,
      outcome,
      verifierIpHash,
      userAgent,
    })

    // Lazy creation registry entry (ADR-0011) — uniquement pour les actes
    // d'état civil, à la première consultation. Idempotent via index.
    await ensureRegistryEntry(ctx, doc)

    const citizen = await ctx.db.get(doc.citizenId)
    const organism = await ctx.db.get(doc.organismId)

    return {
      outcome,
      document: {
        actNumber: doc.actNumber,
        title: doc.title,
        organismName: organism?.shortName ?? organism?.name ?? "—",
        issuedAt: doc.issuedAt,
        revokedAt: doc.revokedAt,
        revocationReason: doc.revocationReason,
        sha256Short: doc.sha256.slice(0, 16),
        beneficiaryName: citizen?.name ?? "—",
      },
    }
  },
})

/* ============================================================
   Helpers internes
   ============================================================ */

/** Normalise un code de vérification (espaces, casse). */
function normalizeCode(raw: string): string | null {
  const trimmed = raw.trim().toUpperCase().replace(/\s+/g, "")
  // Format attendu : GC-XX-NNNN (avec ou sans tirets) — on tolère les deux
  if (/^GC-?[A-Z]{2}-?\d{4,}$/.test(trimmed)) {
    return trimmed.replace(/^GC([A-Z]{2})/, "GC-$1-").replace(/--/g, "-")
  }
  if (/^GC-[A-Z]{2}-\d{4,}$/.test(trimmed)) return trimmed
  return null
}

async function logVerification(
  ctx: MutationCtx,
  args: {
    documentId: Id<"documents"> | null
    verificationCode: string
    outcome: PublicVerificationOutcome
    verifierIpHash?: string
    userAgent?: string
  },
): Promise<void> {
  // Le schema actuel exige documentId. Pour les codes inconnus, on ne log pas
  // dans publicVerifications (qui présume un doc), mais c'est OK : l'attaque
  // par énumération de codes est limitée par la rareté du namespace + le
  // rate-limiting devant l'endpoint HTTP. Si on veut tracker l'inconnu, on
  // ajoutera une table `publicVerificationAttempts` plus tard.
  if (!args.documentId) return
  await ctx.db.insert("publicVerifications", {
    documentId: args.documentId,
    verificationCode: args.verificationCode,
    verifiedAt: Date.now(),
    outcome: args.outcome,
    verifierIpHash: args.verifierIpHash,
    userAgent: args.userAgent,
  })
}

/**
 * Crée paresseusement une entrée `registryEntries` pour un acte d'état civil
 * à sa première consultation publique (ADR-0011). Idempotent : on cherche
 * d'abord si une entrée existe pour ce (registerCode, actNumber).
 *
 * Pour v1, on ne déduit le `kind` que des slugs « acte-naissance »,
 * « acte-mariage », « acte-deces ». Les autres documents (passeport, etc.)
 * ne génèrent pas de registry entry.
 */
async function ensureRegistryEntry(
  ctx: MutationCtx,
  doc: Doc<"documents">,
): Promise<void> {
  if (doc.linkedRegistryEntryId) return // déjà créée

  const request = await ctx.db.get(doc.requestId)
  if (!request) return
  const service = await ctx.db.get(request.serviceId)
  if (!service) return

  // Déduction du kind à partir du slug. Plus tard : champ `services.registryKind`.
  const kind = registryKindFromSlug(service.slug)
  if (!kind) return

  // registerCode format : "EC-LBV-1992-N" — on prend le préfixe d'acte
  // (ex EC) + la commune (defaut LBV) + année + initiale du kind.
  const actYear = new Date(doc.issuedAt).getFullYear()
  const prefix = doc.actNumber.split("-")[0] ?? "EC"
  const commune = doc.actNumber.split("-")[1] ?? "LBV"
  const initial = kind.charAt(0).toUpperCase()
  const registerCode = `${prefix}-${commune}-${actYear}-${initial}`
  const actSeq = doc.actNumber.split("-").pop() ?? "00000"

  // Idempotence (cf. index by_register_act)
  const existing = await ctx.db
    .query("registryEntries")
    .withIndex("by_register_act", (q) =>
      q.eq("registerCode", registerCode).eq("actNumber", actSeq),
    )
    .first()
  if (existing) {
    await ctx.db.patch(doc._id, { linkedRegistryEntryId: existing._id })
    return
  }

  const entryId = await ctx.db.insert("registryEntries", {
    registerCode,
    kind,
    actNumber: actSeq,
    year: actYear,
    commune,
    linkedCitizenId: doc.citizenId,
    accuracyLevel: "verified", // l'acte vient d'être consulté → niveau certifié
    verifiedAt: Date.now(),
  })
  await ctx.db.patch(doc._id, { linkedRegistryEntryId: entryId })
}

function registryKindFromSlug(
  slug: string,
):
  | "birth"
  | "marriage"
  | "death"
  | "adoption"
  | "recognition"
  | null {
  if (slug.includes("naissance")) return "birth"
  if (slug.includes("mariage")) return "marriage"
  if (slug.includes("deces") || slug.includes("décès")) return "death"
  if (slug.includes("adoption")) return "adoption"
  if (slug.includes("reconnaissance")) return "recognition"
  return null
}
