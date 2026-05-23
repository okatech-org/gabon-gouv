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
      error instanceof Error ? error.message : "Connexion impossible."
    return { error: message }
  }

  await setSessionToken(result.token, result.expiresAt)
  redirect("/")
}

export async function signOutAction() {
  await clearSession()
  redirect("/login")
}
