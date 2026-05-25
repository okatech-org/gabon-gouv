"use server"

/**
 * Server actions de la page /signatures. On délègue les mutations à celles
 * déjà exposées par /demandes/[ref]/actions.ts (memes endpoints Convex),
 * mais on revalidate aussi /signatures pour rafraîchir la liste.
 */

import { revalidatePath } from "next/cache"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"
import { requireSessionToken } from "@/lib/session"

export interface ActionResult {
  ok: boolean
  message?: string
}

function extractFriendlyMessage(error: unknown): string {
  if (!(error instanceof Error) || !error.message) return "Erreur inconnue."
  const m = error.message
  const match = m.match(/Uncaught (?:Convex)?Error:\s*([^\n]+?)(?:\s+at\s|$)/)
  if (match) return match[1].trim()
  return m
    .split("\n")[0]
    .replace(/^\[Request ID:[^\]]+\]\s*/, "")
    .replace(/^Server Error\s*/, "")
    .trim()
}

const asId = (s: string) => s as unknown as never

export async function approveAction(
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
    revalidatePath("/signatures")
    return {
      ok: true,
      message: res.circuitCompleted
        ? "Dernière signature — acte émis."
        : "Étape approuvée — circuit avancé.",
    }
  } catch (e) {
    return { ok: false, message: extractFriendlyMessage(e) }
  }
}

export async function refuseAction(
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
    revalidatePath("/signatures")
    return {
      ok: true,
      message: "Étape refusée — demande renvoyée à l'instruction.",
    }
  } catch (e) {
    return { ok: false, message: extractFriendlyMessage(e) }
  }
}
