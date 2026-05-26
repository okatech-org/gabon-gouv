"use server"

/**
 * Server actions de la page /mon-espace/courriers (Bloc 5 — citoyen).
 *
 * Façade vers les mutations Convex citoyennes (`citizen.correspondence.*`).
 * Vérifie l'idnSub depuis la session, capture les erreurs.
 */

import { revalidatePath } from "next/cache"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"
import { requireCurrentSession } from "@/lib/current-citizen"

export interface ActionResult {
  ok: boolean
  message?: string
  data?: { ref?: string }
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

const fail = (e: unknown): ActionResult => ({
  ok: false,
  message: extractFriendlyMessage(e),
})

const asId = (s: string) => s as unknown as never

export async function citizenSendAction(args: {
  toOrganismId: string
  kind: string
  subject: string
  body: string
}): Promise<ActionResult> {
  const session = await requireCurrentSession()
  try {
    const res = await convex.mutation(
      api.citizen.correspondence.citizenCreateCorrespondence,
      {
        idnSub: session.idnSub,
        toOrganismId: asId(args.toOrganismId),
        kind: args.kind as never,
        subject: args.subject,
        body: args.body,
      },
    )
    revalidatePath("/mon-espace/courriers")
    return {
      ok: true,
      message: `Courrier ${res.ref} envoyé.`,
      data: { ref: res.ref },
    }
  } catch (e) {
    return fail(e)
  }
}

export async function citizenReplyAction(
  correspondenceId: string,
  body: string,
): Promise<ActionResult> {
  if (!body.trim()) return { ok: false, message: "Le message est vide." }
  const session = await requireCurrentSession()
  try {
    await convex.mutation(api.citizen.correspondence.citizenReply, {
      idnSub: session.idnSub,
      correspondenceId: asId(correspondenceId),
      body,
    })
    revalidatePath("/mon-espace/courriers")
    return { ok: true, message: "Réponse envoyée." }
  } catch (e) {
    return fail(e)
  }
}

export async function citizenAcknowledgeAction(
  correspondenceId: string,
  note?: string,
): Promise<ActionResult> {
  const session = await requireCurrentSession()
  try {
    await convex.mutation(api.citizen.correspondence.citizenAcknowledge, {
      idnSub: session.idnSub,
      correspondenceId: asId(correspondenceId),
      note: note?.trim() || undefined,
    })
    revalidatePath("/mon-espace/courriers")
    return { ok: true, message: "Accusé de réception enregistré." }
  } catch (e) {
    return fail(e)
  }
}
