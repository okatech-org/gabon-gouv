"use server"

/**
 * Server actions de la page /equipe (Phase Trous B).
 *
 * Façades fines au-dessus des mutations Convex. Toutes capturent
 * les erreurs et renvoient un ActionResult normalisé pour que les
 * formulaires client puissent afficher les messages sans throw.
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

const fail = <T>(e: unknown): ActionResult<T> => ({
  ok: false,
  message: extractFriendlyMessage(e),
})

/** Cast d'une chaîne en Id<> Convex (chaîne opaque côté client). */
const asId = (s: string) => s as unknown as never

export async function inviteAgentAction(args: {
  email: string
  role: string
  functionTitle?: string
}): Promise<ActionResult<{ token: string }>> {
  const token = await requireSessionToken()
  try {
    const result = await convex.mutation(api.admin.team.inviteAgent, {
      token,
      email: args.email,
      role: args.role as never,
      functionTitle: args.functionTitle,
    })
    revalidatePath("/equipe")
    return { ok: true, data: { token: result.token } }
  } catch (e) {
    return fail(e)
  }
}

export async function revokeInvitationAction(
  invitationId: string,
): Promise<ActionResult> {
  const token = await requireSessionToken()
  try {
    await convex.mutation(api.admin.team.revokeInvitation, {
      token,
      invitationId: asId(invitationId),
    })
    revalidatePath("/equipe")
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function disableAgentAction(
  agentId: string,
): Promise<ActionResult> {
  const token = await requireSessionToken()
  try {
    await convex.mutation(api.admin.team.disableAgent, {
      token,
      agentId: asId(agentId),
    })
    revalidatePath("/equipe")
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function enableAgentAction(
  agentId: string,
): Promise<ActionResult> {
  const token = await requireSessionToken()
  try {
    await convex.mutation(api.admin.team.enableAgent, {
      token,
      agentId: asId(agentId),
    })
    revalidatePath("/equipe")
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function changeAgentRoleAction(args: {
  agentId: string
  newRole: string
}): Promise<ActionResult> {
  const token = await requireSessionToken()
  try {
    await convex.mutation(api.admin.team.changeAgentRole, {
      token,
      agentId: asId(args.agentId),
      newRole: args.newRole as never,
    })
    revalidatePath("/equipe")
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}
