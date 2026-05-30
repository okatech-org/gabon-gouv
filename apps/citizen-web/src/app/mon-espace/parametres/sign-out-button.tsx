"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@workspace/ui"
import { authClient } from "@/lib/auth-client"

export function SignOutButton() {
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const handle = () => {
    startTransition(async () => {
      try {
        await authClient.signOut()
      } catch {
        // tolérant : si la session a déjà expiré, on continue vers /login.
      }
      router.push("/login")
      router.refresh()
    })
  }
  return (
    <Button
      variant="ghost"
      icon="x"
      onClick={handle}
      disabled={pending}
      aria-label="Se déconnecter"
    >
      {pending ? "Déconnexion…" : "Se déconnecter"}
    </Button>
  )
}
