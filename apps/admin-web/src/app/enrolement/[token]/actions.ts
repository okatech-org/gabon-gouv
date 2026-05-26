"use server"

/**
 * Server action publique pour l'acceptation d'invitation
 * (Phase Trous B). Pas d'auth — le token suffit (secret partagé).
 */

import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"

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

export async function acceptInvitationAction(args: {
  invitationToken: string
  nip: string
  name: string
  functionTitle?: string
}): Promise<ActionResult> {
  try {
    await convex.mutation(api.admin.team.acceptInvitation, {
      invitationToken: args.invitationToken,
      nip: args.nip,
      name: args.name,
      functionTitle: args.functionTitle,
    })
    return { ok: true }
  } catch (e) {
    return {
      ok: false,
      message: extractFriendlyMessage(e),
    }
  }
}
