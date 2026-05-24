"use server"

import { revalidatePath } from "next/cache"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"
import { requireCurrentSession } from "@/lib/current-citizen"

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

function fail(error: unknown): ActionResult {
  return { ok: false, message: extractFriendlyMessage(error) }
}

export async function cancelMyRequestAction(
  ref: string,
  reason: string,
): Promise<ActionResult> {
  const session = await requireCurrentSession()
  try {
    await convex.mutation(api.citizen.requests.cancelMyRequest, {
      idnSub: session.idnSub,
      ref,
      reason: reason.trim() || undefined,
    })
    revalidatePath(`/mon-espace/demarches/${ref}`)
    revalidatePath("/mon-espace")
    return { ok: true, message: "Demande annulée." }
  } catch (error) {
    return fail(error)
  }
}

export async function sendMessageAction(
  ref: string,
  body: string,
): Promise<ActionResult> {
  const trimmed = body.trim()
  if (!trimmed) return { ok: false, message: "Le message est vide." }
  const session = await requireCurrentSession()
  try {
    await convex.mutation(api.citizen.requests.sendMessageToOrganism, {
      idnSub: session.idnSub,
      ref,
      body: trimmed,
    })
    revalidatePath(`/mon-espace/demarches/${ref}`)
    return { ok: true, message: "Message envoyé." }
  } catch (error) {
    return fail(error)
  }
}
