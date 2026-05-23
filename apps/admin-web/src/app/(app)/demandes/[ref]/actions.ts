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

function fail(error: unknown): ActionResult {
  const message =
    error instanceof Error && error.message
      ? error.message
      : "Erreur inconnue."
  return { ok: false, message }
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
