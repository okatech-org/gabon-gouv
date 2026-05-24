"use client"

import { useTransition } from "react"
import { Button } from "@workspace/ui"
import { signOutAction } from "@/app/login/actions"

export function SignOutButton() {
  const [pending, startTransition] = useTransition()
  const handle = () => {
    startTransition(async () => {
      await signOutAction()
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
