"use client"

import { useTransition } from "react"
import { Button } from "@workspace/ui"
import { signOutAllAction } from "./actions"

interface Props {
  source: "idn" | "nip"
}

export function SignOutButton({ source }: Props) {
  const [pending, startTransition] = useTransition()
  const handle = () => {
    startTransition(async () => {
      await signOutAllAction(source)
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
