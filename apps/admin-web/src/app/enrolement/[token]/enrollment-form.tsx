"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Button, Field, TextInput } from "@workspace/ui"
import { acceptInvitationAction } from "./actions"

interface Props {
  token: string
  email: string
  roleLabel: string
  functionTitle: string | null | undefined
  organismName: string
  expiresAt: number
}

export function EnrollmentForm({
  token,
  email,
  roleLabel,
  functionTitle,
  organismName,
  expiresAt,
}: Props) {
  const router = useRouter()
  const [nip, setNip] = useState("")
  const [name, setName] = useState("")
  const [functionInput, setFunctionInput] = useState(functionTitle ?? "")
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const expiresIn = Math.max(
    0,
    Math.ceil((expiresAt - Date.now()) / (24 * 60 * 60 * 1000)),
  )

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const r = await acceptInvitationAction({
        invitationToken: token,
        nip,
        name,
        functionTitle: functionInput,
      })
      if (r.ok) {
        // Redirige vers login pour qu'il se connecte avec son NIP
        router.push(`/login?enrolled=1&nip=${encodeURIComponent(nip)}`)
      } else {
        setError(r.message ?? "Échec de l'enrôlement.")
      }
    })
  }

  return (
    <div role="region" aria-labelledby="enrol-title">
      <h1
        id="enrol-title"
        style={{
          fontSize: 22,
          fontWeight: 700,
          marginTop: 0,
          marginBottom: 6,
          color: "var(--ink-900)",
        }}
      >
        Bienvenue dans Gabon Connect
      </h1>
      <p
        style={{
          fontSize: 14,
          color: "var(--ink-700)",
          margin: "0 0 20px",
          lineHeight: 1.5,
        }}
      >
        Vous avez été invité(e) à rejoindre <strong>{organismName}</strong>{" "}
        en tant que <strong>{roleLabel}</strong>. Renseignez votre NIP pour
        activer votre compte.
      </p>

      <dl
        style={{
          background: "var(--ink-50)",
          padding: 12,
          borderRadius: 6,
          fontSize: 13,
          display: "grid",
          gridTemplateColumns: "max-content 1fr",
          gap: "4px 12px",
          margin: "0 0 20px",
        }}
      >
        <dt style={{ color: "var(--ink-600)" }}>E-mail invité</dt>
        <dd style={{ margin: 0, fontFamily: "var(--font-mono)" }}>{email}</dd>
        <dt style={{ color: "var(--ink-600)" }}>Expire dans</dt>
        <dd style={{ margin: 0 }}>
          {expiresIn} jour{expiresIn > 1 ? "s" : ""}
        </dd>
      </dl>

      <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
        <Field
          label="NIP (Numéro d'Identification Personnel)"
          required
          htmlFor="enrol-nip"
          hint="Format majuscules sans espaces. C'est votre identifiant de connexion."
        >
          <TextInput
            id="enrol-nip"
            required
            value={nip}
            onChange={(e) => setNip(e.target.value.toUpperCase())}
            autoFocus
            autoComplete="off"
            spellCheck={false}
            placeholder="Ex: GA1234567"
            maxLength={32}
            style={{
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.05em",
            }}
          />
        </Field>

        <Field
          label="Nom complet"
          required
          htmlFor="enrol-name"
          hint="Tel qu'il apparaîtra dans le système (visas, signatures, audit)."
        >
          <TextInput
            id="enrol-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            placeholder="Prénom NOM"
            maxLength={120}
          />
        </Field>

        <Field
          label="Fonction"
          htmlFor="enrol-function"
          hint="Optionnel — ex: Chef de bureau, Officier d'état civil."
        >
          <TextInput
            id="enrol-function"
            value={functionInput}
            onChange={(e) => setFunctionInput(e.target.value)}
            maxLength={120}
          />
        </Field>

        {error && (
          <div
            role="alert"
            style={{
              background: "var(--danger-50)",
              border: "1px solid var(--danger-200)",
              color: "var(--danger-700)",
              padding: "10px 12px",
              borderRadius: 6,
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        <Button
          variant="primary"
          type="submit"
          disabled={pending}
          style={{ width: "100%" }}
        >
          {pending ? "Activation…" : "Activer mon compte"}
        </Button>
      </form>
    </div>
  )
}
