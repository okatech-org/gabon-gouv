"use client"

import { useState, useTransition } from "react"
import { Alert, Button, Field, Icon, TextInput } from "@workspace/ui"
import { signIn } from "./actions"

export function LoginForm() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  return (
    <form
      action={(formData) => {
        setError(null)
        startTransition(async () => {
          const result = await signIn(formData)
          if (result?.error) setError(result.error)
        })
      }}
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      <div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--ink-500)",
            marginBottom: 6,
          }}
        >
          Identité numérique
        </div>
        <h2 style={{ fontSize: 22, letterSpacing: "-0.01em" }}>
          Connexion à votre console
        </h2>
        <p style={{ fontSize: 13.5, color: "var(--ink-600)", marginTop: 4 }}>
          Saisissez votre NIP d&apos;agent pour accéder à votre back-office.
        </p>
      </div>

      <Field label="NIP d'agent" required hint="12 chiffres, sans espaces ni séparateurs.">
        <TextInput
          name="nip"
          icon="fingerprint"
          placeholder="198501100001"
          autoComplete="username"
          autoFocus
          required
        />
      </Field>

      {error && (
        <Alert tone="danger" title="Connexion impossible">
          {error}
        </Alert>
      )}

      <Button type="submit" size="lg" iconRight="arrowRight" disabled={isPending}>
        {isPending ? "Connexion…" : "Se connecter"}
      </Button>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12,
          color: "var(--ink-500)",
          paddingTop: 4,
        }}
      >
        <Icon name="lock" size={12} />
        Faux IdP de démo — aucun mot de passe demandé pour cette itération.
      </div>
    </form>
  )
}
