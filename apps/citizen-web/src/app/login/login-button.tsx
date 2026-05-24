"use client"

import { useState, useTransition } from "react"
import { Alert, Button, Icon } from "@workspace/ui"
import { authClient } from "@/lib/auth-client"

interface Props {
  from?: string
}

export function LoginButton({ from }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handle = () => {
    setError(null)
    startTransition(async () => {
      try {
        await authClient.signIn.oauth2({
          providerId: "idn",
          callbackURL: from && from.startsWith("/") ? from : "/mon-espace",
        })
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Connexion impossible. Réessayez dans un instant.",
        )
      }
    })
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Button
        size="lg"
        iconRight="arrowRight"
        onClick={handle}
        disabled={pending}
      >
        {pending ? "Redirection vers identité.ga…" : "Se connecter avec IDN"}
      </Button>
      {error && <Alert tone="danger">{error}</Alert>}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12,
          color: "var(--ink-500)",
        }}
      >
        <Icon name="lock" size={12} />
        OIDC + LoA 2 minimum · session signée httpOnly côté serveur.
      </div>
    </div>
  )
}
