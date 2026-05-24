"use server"

import { redirect } from "next/navigation"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"
import { setNipSession, clearNipSession } from "@/lib/nip-session"

export interface NipSignInResult {
  error?: string
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

/**
 * Connexion alternative par NIP — chemin de secours pour les tests tant
 * que l'OIDC identité.ga sandbox n'est pas pleinement disponible.
 *
 * Appelle `signInCitizenWithNip` côté Convex, pose le cookie httpOnly
 * `gc_citizen_nip` avec l'idnSub du citoyen, et redirige vers /mon-espace.
 */
export async function signInWithNipAction(
  formData: FormData,
): Promise<NipSignInResult> {
  const nip = String(formData.get("nip") ?? "").trim()
  if (!nip) return { error: "Saisissez votre NIP." }

  let result: { idnSub: string; expiresAt: number }
  try {
    result = await convex.mutation(api.citizen.auth.signInCitizenWithNip, {
      nip,
    })
  } catch (error) {
    return { error: extractFriendlyMessage(error) }
  }

  await setNipSession(result.idnSub, result.expiresAt)
  redirect("/mon-espace")
}

export async function signOutNipAction() {
  await clearNipSession()
  redirect("/login")
}
