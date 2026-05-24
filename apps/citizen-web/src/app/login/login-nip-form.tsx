"use client"

import { useActionState } from "react"
import { Alert, Button, Field, Icon, TextInput } from "@workspace/ui"
import { signInWithNipAction, type NipSignInResult } from "./actions"

const initialState: NipSignInResult = {}

export function LoginNipForm() {
  const [state, formAction, isPending] = useActionState(
    async (_prev: NipSignInResult, formData: FormData) =>
      signInWithNipAction(formData),
    initialState,
  )

  return (
    <form
      action={formAction}
      style={{ display: "flex", flexDirection: "column", gap: 10 }}
    >
      <Field
        label="NIP citoyen"
        hint="12 chiffres, sans espaces. Demo : 184127600504 (Marie OBAME)."
      >
        <TextInput
          name="nip"
          icon="fingerprint"
          placeholder="184127600504"
          autoComplete="username"
          required
        />
      </Field>
      {state?.error && <Alert tone="danger">{state.error}</Alert>}
      <Button
        type="submit"
        variant="secondary"
        iconRight="arrowRight"
        disabled={isPending}
      >
        {isPending ? "Connexion…" : "Continuer avec mon NIP"}
      </Button>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 11.5,
          color: "var(--ink-500)",
        }}
      >
        <Icon name="alertTriangle" size={11} />
        Voie de secours sandbox — sera désactivée en production.
      </div>
    </form>
  )
}
