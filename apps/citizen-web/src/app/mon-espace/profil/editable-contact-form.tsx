"use client"

import { useState, useTransition } from "react"
import { Alert, Button, Field, Select, TextInput } from "@workspace/ui"
import { updateProfileAction } from "./actions"

const PROVINCES: Array<[string, string]> = [
  ["estuaire", "Estuaire"],
  ["haut_ogooue", "Haut-Ogooué"],
  ["moyen_ogooue", "Moyen-Ogooué"],
  ["ngounie", "Ngounié"],
  ["nyanga", "Nyanga"],
  ["ogooue_ivindo", "Ogooué-Ivindo"],
  ["ogooue_lolo", "Ogooué-Lolo"],
  ["ogooue_maritime", "Ogooué-Maritime"],
  ["woleu_ntem", "Woleu-Ntem"],
]

interface Initial {
  email: string
  phone: string
  address: string
  addressProvinceCode: string
}

export function EditableContactForm({ initial }: { initial: Initial }) {
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null)
  const [pending, startTransition] = useTransition()

  const handle = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setFeedback(null)
    startTransition(async () => {
      const result = await updateProfileAction(form)
      setFeedback({
        ok: result.ok,
        message: result.message ?? (result.ok ? "OK" : "Erreur"),
      })
    })
  }

  return (
    <form
      onSubmit={handle}
      style={{ display: "flex", flexDirection: "column", gap: 14 }}
      aria-label="Modifier mes coordonnées"
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 14,
        }}
      >
        <Field
          label="Adresse e-mail"
          hint="Reçoit récépissés, mises à jour et documents signés."
        >
          <TextInput
            name="email"
            type="email"
            defaultValue={initial.email}
            placeholder="prenom.nom@example.ga"
            autoComplete="email"
          />
        </Field>
        <Field label="Téléphone">
          <TextInput
            name="phone"
            type="tel"
            defaultValue={initial.phone}
            placeholder="+241 06 24 18 33"
            autoComplete="tel"
          />
        </Field>
      </div>
      <Field label="Adresse postale">
        <TextInput
          name="address"
          defaultValue={initial.address}
          placeholder="BP 8112, Akanda"
          autoComplete="street-address"
        />
      </Field>
      <Field label="Province de résidence">
        <Select
          name="addressProvinceCode"
          defaultValue={initial.addressProvinceCode}
        >
          <option value="">— Non renseigné —</option>
          {PROVINCES.map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </Select>
      </Field>

      {feedback && (
        <Alert tone={feedback.ok ? "success" : "danger"}>{feedback.message}</Alert>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <Button type="submit" disabled={pending} iconRight="check">
          {pending ? "Enregistrement…" : "Enregistrer les modifications"}
        </Button>
      </div>
    </form>
  )
}
