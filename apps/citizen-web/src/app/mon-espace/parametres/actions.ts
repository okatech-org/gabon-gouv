"use server"

import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { clearNipSession } from "@/lib/nip-session"
import { headers } from "next/headers"

export async function signOutAllAction(source: "idn" | "nip") {
  if (source === "nip") {
    await clearNipSession()
  } else {
    try {
      await auth.api.signOut({ headers: await headers() })
    } catch {
      // tolérant : si la session better-auth a déjà expiré, on continue
    }
  }
  redirect("/login")
}
