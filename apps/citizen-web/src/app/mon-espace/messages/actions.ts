"use server"

import { revalidatePath } from "next/cache"
import { api } from "@workspace/backend/generated"
import { getCitizenConvex } from "@/lib/convex"
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

export async function markNotificationReadAction(
  notificationId: string,
): Promise<ActionResult> {
  const session = await requireCurrentSession()
  const convex = await getCitizenConvex(session)
  try {
    await convex.mutation(api.citizen.messages.markNotificationRead, {
      notificationId: notificationId as never,
    })
    revalidatePath("/mon-espace/messages")
    revalidatePath("/mon-espace")
    return { ok: true }
  } catch (error) {
    return { ok: false, message: extractFriendlyMessage(error) }
  }
}

export async function markAgentMessageReadAction(
  messageId: string,
): Promise<ActionResult> {
  const session = await requireCurrentSession()
  const convex = await getCitizenConvex(session)
  try {
    await convex.mutation(api.citizen.messages.markAgentMessageRead, {
      messageId: messageId as never,
    })
    revalidatePath("/mon-espace/messages")
    revalidatePath("/mon-espace")
    return { ok: true }
  } catch (error) {
    return { ok: false, message: extractFriendlyMessage(error) }
  }
}
