"use server"

/**
 * Server actions de la page /correspondance (Bloc 5).
 *
 * Façade fine au-dessus des mutations Convex. Toutes vérifient le token
 * de session, capturent les erreurs et renvoient un ActionResult normalisé.
 */

import { revalidatePath } from "next/cache"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"
import { requireSessionToken } from "@/lib/session"

export interface ActionResult<T = unknown> {
  ok: boolean
  message?: string
  data?: T
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

/* ============================================================
   Brouillon
   ============================================================ */

export async function createDraftAction(
  args: {
    kind: string
    subject: string
    body: string
    urgent?: boolean
    parentRef?: string
  },
): Promise<ActionResult<{ ref: string; correspondenceId: string }>> {
  const token = await requireSessionToken()
  try {
    let parentCorrespondenceId: string | undefined
    if (args.parentRef) {
      // On résout le ref → id via la query
      const thread = await convex.query(
        api.admin.correspondenceQueries.getThreadV2,
        { token, ref: args.parentRef },
      )
      // Pas d'API directe ref→id, on accepte de passer juste le threadId
      // côté backend (mais createDraft attend parentCorrespondenceId Id).
      // → pour v1, on ignore parentRef si pas direct. UI peut passer l'Id.
      void thread
      void parentCorrespondenceId
    }
    const res = await convex.mutation(
      api.admin.correspondenceLifecycle.createDraft,
      {
        token,
        kind: args.kind as never,
        subject: args.subject,
        body: args.body,
        urgent: args.urgent,
      },
    )
    revalidatePath("/correspondance")
    return {
      ok: true,
      data: { ref: res.ref, correspondenceId: String(res.correspondenceId) },
    }
  } catch (e) {
    return fail(e) as ActionResult<{ ref: string; correspondenceId: string }>
  }
}

export async function updateDraftAction(
  correspondenceId: string,
  patch: {
    subject?: string
    body?: string
    urgent?: boolean
    confidentiality?: string
    kind?: string
  },
): Promise<ActionResult> {
  const token = await requireSessionToken()
  try {
    await convex.mutation(api.admin.correspondenceLifecycle.updateDraft, {
      token,
      correspondenceId: asId(correspondenceId),
      patch: patch as never,
    })
    revalidatePath("/correspondance")
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function deleteDraftAction(
  correspondenceId: string,
): Promise<ActionResult> {
  const token = await requireSessionToken()
  try {
    await convex.mutation(api.admin.correspondenceLifecycle.deleteDraft, {
      token,
      correspondenceId: asId(correspondenceId),
    })
    revalidatePath("/correspondance")
    return { ok: true, message: "Brouillon supprimé." }
  } catch (e) {
    return fail(e)
  }
}

/* ============================================================
   Destinataires
   ============================================================ */

export async function addRecipientAction(
  correspondenceId: string,
  role: "to" | "cc" | "bcc",
  recipientKind: "organism" | "citizen" | "external" | "platform",
  recipientId: string,
): Promise<ActionResult> {
  const token = await requireSessionToken()
  try {
    await convex.mutation(api.admin.correspondenceLifecycle.addRecipient, {
      token,
      correspondenceId: asId(correspondenceId),
      role,
      recipientKind,
      recipientId,
    })
    revalidatePath("/correspondance")
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function removeRecipientAction(
  correspondenceId: string,
  recipientId: string,
): Promise<ActionResult> {
  const token = await requireSessionToken()
  try {
    await convex.mutation(api.admin.correspondenceLifecycle.removeRecipient, {
      token,
      correspondenceId: asId(correspondenceId),
      recipientId: asId(recipientId),
    })
    revalidatePath("/correspondance")
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

/* ============================================================
   Envoi
   ============================================================ */

export async function sendDirectAction(
  correspondenceId: string,
): Promise<ActionResult> {
  const token = await requireSessionToken()
  try {
    await convex.mutation(api.admin.correspondenceLifecycle.sendDirect, {
      token,
      correspondenceId: asId(correspondenceId),
    })
    revalidatePath("/correspondance")
    return { ok: true, message: "Courrier envoyé." }
  } catch (e) {
    return fail(e)
  }
}

export async function submitForSignatureAction(
  correspondenceId: string,
  chefServiceId?: string,
  officierId?: string,
): Promise<ActionResult> {
  const token = await requireSessionToken()
  try {
    await convex.mutation(
      api.admin.correspondenceLifecycle.submitForSignature,
      {
        token,
        correspondenceId: asId(correspondenceId),
        chefServiceId: chefServiceId ? asId(chefServiceId) : undefined,
        officierId: officierId ? asId(officierId) : undefined,
      },
    )
    revalidatePath("/correspondance")
    revalidatePath("/signatures")
    return {
      ok: true,
      message: "Soumis au circuit de signature.",
    }
  } catch (e) {
    return fail(e)
  }
}

/* ============================================================
   Réception
   ============================================================ */

export async function acknowledgeAction(
  correspondenceId: string,
  note?: string,
): Promise<ActionResult> {
  const token = await requireSessionToken()
  try {
    await convex.mutation(api.admin.correspondenceLifecycle.acknowledge, {
      token,
      correspondenceId: asId(correspondenceId),
      note: note?.trim() || undefined,
    })
    revalidatePath("/correspondance")
    return { ok: true, message: "Accusé de réception enregistré." }
  } catch (e) {
    return fail(e)
  }
}

export async function replyAction(
  correspondenceId: string,
  body: string,
): Promise<ActionResult> {
  const token = await requireSessionToken()
  try {
    await convex.mutation(api.admin.correspondenceLifecycle.reply, {
      token,
      correspondenceId: asId(correspondenceId),
      body,
    })
    revalidatePath("/correspondance")
    return { ok: true, message: "Réponse envoyée." }
  } catch (e) {
    return fail(e)
  }
}

export async function recallAction(
  correspondenceId: string,
  reason: string,
): Promise<ActionResult> {
  const token = await requireSessionToken()
  try {
    await convex.mutation(api.admin.correspondenceLifecycle.recall, {
      token,
      correspondenceId: asId(correspondenceId),
      reason,
    })
    revalidatePath("/correspondance")
    return { ok: true, message: "Courrier rappelé." }
  } catch (e) {
    return fail(e)
  }
}

export async function closeAction(
  correspondenceId: string,
  reason?: string,
): Promise<ActionResult> {
  const token = await requireSessionToken()
  try {
    await convex.mutation(api.admin.correspondenceLifecycle.close, {
      token,
      correspondenceId: asId(correspondenceId),
      reason: reason?.trim() || undefined,
    })
    revalidatePath("/correspondance")
    return { ok: true, message: "Correspondance clôturée." }
  } catch (e) {
    return fail(e)
  }
}

export async function archiveAction(
  correspondenceId: string,
): Promise<ActionResult> {
  const token = await requireSessionToken()
  try {
    await convex.mutation(
      api.admin.correspondenceLifecycle.archiveCorrespondence,
      { token, correspondenceId: asId(correspondenceId) },
    )
    revalidatePath("/correspondance")
    return { ok: true, message: "Correspondance archivée." }
  } catch (e) {
    return fail(e)
  }
}

export async function markReadAction(
  correspondenceId: string,
): Promise<ActionResult> {
  const token = await requireSessionToken()
  try {
    await convex.mutation(api.admin.correspondenceLifecycle.markRead, {
      token,
      correspondenceId: asId(correspondenceId),
    })
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}
