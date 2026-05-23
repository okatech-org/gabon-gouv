"use client"

import { useState, useTransition } from "react"
import { Alert, Button, Field, Select, TextInput } from "@workspace/ui"
import { addReferentAction } from "./actions"

const ROLES: Array<[string, string]> = [
  ["admin_organisme", "Admin organisme"],
  ["agent_superviseur", "Agent superviseur"],
  ["chef_service", "Chef de service"],
  ["officier_signataire", "Officier signataire"],
  ["agent_instructeur", "Agent instructeur"],
  ["admin_technique", "Admin technique (API)"],
]

const AUTH_METHODS: Array<[string, string]> = [
  ["nip_carte_agent", "NIP + carte agent"],
  ["nip_only", "NIP seul"],
  ["nip_cle_api", "NIP + clé API"],
]

interface Props {
  processId: string
}

export function AddReferentButton({ processId }: Props) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null)

  if (!open) {
    return (
      <Button variant="ghost" icon="plus" size="sm" onClick={() => setOpen(true)}>
        Ajouter
      </Button>
    )
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setFeedback(null)
    startTransition(async () => {
      const result = await addReferentAction(processId, form)
      setFeedback({
        ok: result.ok,
        message: result.message ?? (result.ok ? "OK" : "Erreur"),
      })
      if (result.ok) {
        setOpen(false)
      }
    })
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(14,26,43,.36)",
        zIndex: 70,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 520,
          maxWidth: "100%",
          background: "white",
          border: "1px solid var(--ink-200)",
          borderRadius: 12,
          boxShadow: "0 24px 48px rgba(14,26,43,.18)",
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <strong style={{ fontSize: 17 }}>Ajouter un référent</strong>
          <Button variant="ghost" size="sm" icon="x" onClick={() => setOpen(false)}>
            {""}
          </Button>
        </div>
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <Field label="Nom complet" required>
            <TextInput name="fullName" placeholder="M. Théophile NTOUTOUME" required />
          </Field>
          <Field label="Fonction">
            <TextInput name="functionTitle" placeholder="Directeur général" />
          </Field>
          <Field label="E-mail" required>
            <TextInput
              name="email"
              type="email"
              placeholder="t.ntoutoume@orga.ga"
              required
            />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Rôle Gabon Connect" required>
              <Select name="role" defaultValue="" required>
                <option value="" disabled>
                  — Choisir —
                </option>
                {ROLES.map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Méthode d'auth" required>
              <Select name="authMethod" defaultValue="" required>
                <option value="" disabled>
                  — Choisir —
                </option>
                {AUTH_METHODS.map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {feedback && !feedback.ok && <Alert tone="danger">{feedback.message}</Alert>}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
            <Button variant="ghost" type="button" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" iconRight="arrowRight" disabled={pending}>
              {pending ? "Ajout…" : "Ajouter le référent"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
