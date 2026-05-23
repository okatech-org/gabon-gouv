"use server"

import { redirect } from "next/navigation"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"
import { clearSession, setSessionToken } from "@/lib/session"

export interface LoginResult {
  error?: string
}

export async function signIn(formData: FormData): Promise<LoginResult> {
  const nip = String(formData.get("nip") ?? "").trim()
  if (!nip) {
    return { error: "Saisissez votre NIP." }
  }

  let result: { token: string; expiresAt: number }
  try {
    result = await convex.mutation(api.auth.signInWithNip, { nip })
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? extractMessage(error.message)
        : "Connexion impossible — vérifiez que Convex est accessible."
    return { error: message }
  }

  // Vérifier que l'agent est bien platform_admin avant de poser le cookie.
  let agent: { role?: string } | null
  try {
    agent = (await convex.query(api.auth.currentAgent, { token: result.token })) as
      | { role?: string }
      | null
  } catch {
    agent = null
  }

  if (!agent || agent.role !== "platform_admin") {
    return {
      error:
        "Ce NIP n'a pas le rôle « admin plateforme ». La console est réservée à Digitalium.",
    }
  }

  await setSessionToken(result.token, result.expiresAt)
  redirect("/")
}

export async function signOutAction() {
  await clearSession()
  redirect("/login")
}

function extractMessage(raw: string): string {
  const match = raw.match(/Uncaught Error: ([^\n]+)/)
  return match ? match[1] : raw
}
