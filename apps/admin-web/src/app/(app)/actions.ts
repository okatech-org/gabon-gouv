"use server"

/**
 * Server actions du dashboard admin (Phase Trous C — activation onboarding).
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

export async function finalizeActivationAction(): Promise<ActionResult> {
  const token = await requireSessionToken()
  try {
    await convex.mutation(api.admin.onboarding.finalizeActivation, { token })
    revalidatePath("/")
    revalidatePath("/equipe")
    return { ok: true }
  } catch (e) {
    return {
      ok: false,
      message: extractFriendlyMessage(e),
    }
  }
}
