"use server"

import { revalidatePath } from "next/cache"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"
import { requireSessionToken } from "@/lib/session"

export interface ActionResult {
  ok: boolean
  message?: string
  data?: unknown
}

/**
 * Extrait un message lisible d'une erreur Convex.
 *
 * Les ConvexError remontent avec la forme :
 *   `[Request ID: xxx] Server Error\nUncaught Error: <vrai message>\n  at handler …`
 *
 * On garde juste la phrase utile, sans Request ID ni stack.
 */
function extractFriendlyMessage(error: unknown): string {
  if (!(error instanceof Error) || !error.message) return "Erreur inconnue."
  const m = error.message
  // Pattern Convex : extrait ce qui suit "Uncaught Error: " ou "Uncaught ConvexError: " jusqu'à un saut de ligne ou " at "
  const match = m.match(/Uncaught (?:Convex)?Error:\s*([^\n]+?)(?:\s+at\s|$)/)
  if (match) return match[1].trim()
  // Fallback : première ligne sans "[Request ID: …]"
  return m
    .split("\n")[0]
    .replace(/^\[Request ID:[^\]]+\]\s*/, "")
    .replace(/^Server Error\s*/, "")
    .trim()
}

function fail(error: unknown): ActionResult {
  return { ok: false, message: extractFriendlyMessage(error) }
}

/**
 * Signer et émettre l'acte — bascule la demande en `issued` + verse au SAE.
 * Réservé aux officiers signataires et admins d'organisme.
 */
export async function signAndIssueAction(ref: string): Promise<ActionResult> {
  const token = await requireSessionToken()
  try {
    const result = await convex.mutation(api.admin.mutations.signAndIssue, {
      token,
      ref,
    })
    revalidatePath(`/demandes/${ref}`)
    revalidatePath("/")
    return {
      ok: true,
      message: `Acte ${result.actNumber} émis et versé au SAE.`,
      data: result,
    }
  } catch (error) {
    return fail(error)
  }
}

/** Demander une pièce complémentaire au citoyen. */
export async function requestPieceAction(
  ref: string,
  label: string,
): Promise<ActionResult> {
  const trimmed = label.trim()
  if (!trimmed) return { ok: false, message: "Le libellé est requis." }

  const token = await requireSessionToken()
  try {
    await convex.mutation(api.admin.mutations.requestPiece, {
      token,
      ref,
      label: trimmed,
    })
    revalidatePath(`/demandes/${ref}`)
    return { ok: true, message: `Pièce « ${trimmed} » demandée.` }
  } catch (error) {
    return fail(error)
  }
}

/** Sauvegarder la note interne (debounced côté client). */
export async function updateInternalNoteAction(
  ref: string,
  note: string,
): Promise<ActionResult> {
  const token = await requireSessionToken()
  try {
    await convex.mutation(api.admin.mutations.updateInternalNote, {
      token,
      ref,
      note,
    })
    // Pas de revalidatePath ici — la note ne s'affiche qu'en édition.
    return { ok: true }
  } catch (error) {
    return fail(error)
  }
}

/** Transférer le dossier à un autre organisme. */
export async function transferRequestAction(
  ref: string,
  toOrgId: string,
): Promise<ActionResult> {
  const token = await requireSessionToken()
  try {
    await convex.mutation(api.admin.mutations.transferRequest, {
      token,
      ref,
      toOrgId: toOrgId as never, // typage faible côté server action
    })
    revalidatePath(`/demandes/${ref}`)
    revalidatePath("/demandes")
    return { ok: true, message: "Dossier transféré." }
  } catch (error) {
    return fail(error)
  }
}

/** Écrire au citoyen sur le fil de la demande. */
export async function sendMessageToCitizenAction(
  ref: string,
  body: string,
): Promise<ActionResult> {
  const trimmed = body.trim()
  if (!trimmed) return { ok: false, message: "Le message est vide." }

  const token = await requireSessionToken()
  try {
    await convex.mutation(api.admin.mutations.sendMessageToCitizen, {
      token,
      ref,
      body: trimmed,
    })
    revalidatePath(`/demandes/${ref}`)
    return { ok: true, message: "Message envoyé." }
  } catch (error) {
    return fail(error)
  }
}

/** Rejeter la demande avec un motif. Réservé chef_service+. */
export async function rejectRequestAction(
  ref: string,
  reason: string,
): Promise<ActionResult> {
  const trimmed = reason.trim()
  if (!trimmed) return { ok: false, message: "Un motif est requis." }

  const token = await requireSessionToken()
  try {
    await convex.mutation(api.admin.mutations.rejectRequest, {
      token,
      ref,
      reason: trimmed,
    })
    revalidatePath(`/demandes/${ref}`)
    revalidatePath("/demandes")
    revalidatePath("/")
    return { ok: true, message: "Demande rejetée." }
  } catch (error) {
    return fail(error)
  }
}

/* ============================================================
   Bloc 3 — actions pièces, vérifs, assignation, signature
   ============================================================ */

const asId = (s: string) => s as unknown as never

/** Valider une pièce uploadée. Réservé instructeur+. */
export async function validatePieceAction(
  ref: string,
  pieceId: string,
): Promise<ActionResult> {
  const token = await requireSessionToken()
  try {
    await convex.mutation(api.admin.mutations.validatePiece, {
      token,
      pieceId: asId(pieceId),
    })
    revalidatePath(`/demandes/${ref}`)
    return { ok: true, message: "Pièce validée." }
  } catch (error) {
    return fail(error)
  }
}

/** Charger l'URL signée d'une pièce pour le viewer modal. */
export async function getPieceViewUrlAction(
  pieceId: string,
): Promise<
  ActionResult & {
    url?: string | null
    filename?: string
    mimeType?: string
    sizeBytes?: number
  }
> {
  const token = await requireSessionToken()
  try {
    const res = await convex.query(api.admin.requests.getPieceViewUrl, {
      token,
      pieceId: asId(pieceId),
    })
    if (!res) return { ok: true, url: null }
    return {
      ok: true,
      url: res.url ?? null,
      filename: res.filename,
      mimeType: res.mimeType,
      sizeBytes: res.sizeBytes,
    }
  } catch (error) {
    return fail(error)
  }
}

/** Rejeter une pièce avec un motif. */
export async function rejectPieceAction(
  ref: string,
  pieceId: string,
  reason: string,
): Promise<ActionResult> {
  const trimmed = reason.trim()
  if (!trimmed) return { ok: false, message: "Un motif est requis." }
  const token = await requireSessionToken()
  try {
    await convex.mutation(api.admin.mutations.rejectPiece, {
      token,
      pieceId: asId(pieceId),
      reason: trimmed,
    })
    revalidatePath(`/demandes/${ref}`)
    return { ok: true, message: "Pièce rejetée." }
  } catch (error) {
    return fail(error)
  }
}

/** Assigner une demande à un agent précis (ou à moi si agentId omis). */
export async function assignRequestAction(
  ref: string,
  agentId: string | null,
): Promise<ActionResult> {
  const token = await requireSessionToken()
  try {
    await convex.mutation(api.admin.mutations.assignRequest, {
      token,
      ref,
      agentId: agentId ? asId(agentId) : undefined,
    })
    revalidatePath(`/demandes/${ref}`)
    revalidatePath("/demandes")
    return { ok: true, message: "Demande assignée." }
  } catch (error) {
    return fail(error)
  }
}

/** Basculer le statut d'une vérification automatique. */
export async function setVerificationStatusAction(
  ref: string,
  verificationId: string,
  status: "ok" | "ko" | "pending" | "not_applicable",
  evidence?: string,
): Promise<ActionResult> {
  const token = await requireSessionToken()
  try {
    await convex.mutation(api.admin.mutations.setVerificationStatus, {
      token,
      verificationId: asId(verificationId),
      status,
      evidence: evidence?.trim() || undefined,
    })
    revalidatePath(`/demandes/${ref}`)
    return { ok: true, message: "Vérification mise à jour." }
  } catch (error) {
    return fail(error)
  }
}

/** Préparer le document + ouvrir le circuit de signature. */
export async function prepareDocumentAction(
  ref: string,
  fallbackChefId?: string,
  fallbackOfficierId?: string,
): Promise<ActionResult> {
  const token = await requireSessionToken()
  try {
    const res = await convex.mutation(api.admin.mutations.prepareDocument, {
      token,
      ref,
      chefServiceId: fallbackChefId ? asId(fallbackChefId) : undefined,
      officierId: fallbackOfficierId ? asId(fallbackOfficierId) : undefined,
    })
    revalidatePath(`/demandes/${ref}`)
    return {
      ok: true,
      message: `Acte ${res.actNumber} préparé, circuit ouvert.`,
      data: res,
    }
  } catch (error) {
    return fail(error)
  }
}

/** Approuver l'étape active d'un circuit de signature. */
export async function approveSignatureStepAction(
  ref: string | null,
  circuitId: string,
  comment?: string,
): Promise<ActionResult> {
  const token = await requireSessionToken()
  try {
    const res = await convex.mutation(api.admin.mutations.approveSignatureStep, {
      token,
      circuitId: asId(circuitId),
      comment: comment?.trim() || undefined,
    })
    if (ref) revalidatePath(`/demandes/${ref}`)
    revalidatePath("/signatures")
    return {
      ok: true,
      message: res.circuitCompleted
        ? "Dernière signature — acte émis."
        : "Étape approuvée.",
      data: res,
    }
  } catch (error) {
    return fail(error)
  }
}

/** Refuser l'étape active d'un circuit de signature (commentaire obligatoire). */
export async function refuseSignatureStepAction(
  ref: string | null,
  circuitId: string,
  comment: string,
): Promise<ActionResult> {
  const trimmed = comment.trim()
  if (!trimmed) return { ok: false, message: "Un commentaire est requis." }
  const token = await requireSessionToken()
  try {
    await convex.mutation(api.admin.mutations.refuseSignatureStep, {
      token,
      circuitId: asId(circuitId),
      comment: trimmed,
    })
    if (ref) revalidatePath(`/demandes/${ref}`)
    revalidatePath("/signatures")
    return { ok: true, message: "Étape refusée — demande renvoyée à l'instruction." }
  } catch (error) {
    return fail(error)
  }
}
