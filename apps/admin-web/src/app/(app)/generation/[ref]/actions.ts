"use server"

/**
 * Server actions de la page /generation.
 *
 * Réutilise les mutations admin existantes (signAndIssue, getDocumentPdfUrl).
 */

import { revalidatePath } from "next/cache"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"
import { requireSessionToken } from "@/lib/session"

export interface ActionResult {
  ok: boolean
  message?: string
  data?: unknown
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

/** Raccourci "signer & émettre" — réservé aux services à signature simple. */
export async function signAndEmitAction(
  ref: string,
): Promise<ActionResult> {
  const token = await requireSessionToken()
  try {
    const res = await convex.mutation(api.admin.mutations.signAndIssue, {
      token,
      ref,
    })
    revalidatePath(`/generation/${ref}`)
    revalidatePath(`/demandes/${ref}`)
    return {
      ok: true,
      message: `Acte ${res.actNumber} émis. Code ${res.verificationCode}.`,
      data: res,
    }
  } catch (e) {
    return { ok: false, message: extractFriendlyMessage(e) }
  }
}

/** Charge l'URL signée du PDF d'un document émis. */
export async function getPdfUrlAction(
  documentId: string,
): Promise<ActionResult & { url?: string | null }> {
  const token = await requireSessionToken()
  try {
    const res = await convex.query(api.admin.requests.getDocumentPdfUrl, {
      token,
      documentId: asId(documentId),
    })
    if (!res) return { ok: true, url: null }
    return { ok: true, url: res.url ?? null }
  } catch (e) {
    return { ok: false, message: extractFriendlyMessage(e) }
  }
}
