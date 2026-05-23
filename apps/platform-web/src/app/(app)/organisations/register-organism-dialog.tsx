"use client"

import { useState, useTransition } from "react"
import { Alert, Button, Field, Select, TextInput } from "@workspace/ui"
import { registerOrganismAction } from "./actions"

const CATEGORIES: Array<[string, string]> = [
  ["ministere", "Ministère"],
  ["direction_generale", "Direction générale"],
  ["etablissement_public", "Établissement public"],
  ["collectivite", "Collectivité"],
  ["autorite", "Autorité administrative indépendante"],
  ["institution", "Institution"],
]

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

export function RegisterOrganismDialog() {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null)

  if (!open) {
    return (
      <Button icon="plus" onClick={() => setOpen(true)}>
        Enregistrer une administration
      </Button>
    )
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setFeedback(null)
    startTransition(async () => {
      const result = await registerOrganismAction(form)
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
          width: 560,
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
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <strong style={{ fontSize: 17 }}>Enregistrer une administration</strong>
          <Button variant="ghost" size="sm" icon="x" onClick={() => setOpen(false)}>
            {""}
          </Button>
        </div>
        <p style={{ fontSize: 13, color: "var(--ink-600)", margin: 0 }}>
          L&apos;organisme sera créé avec le statut <b>onboarding</b> et un processus
          d&apos;onboarding démarrera automatiquement (7 étapes).
        </p>
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <Field label="Dénomination" required>
            <TextInput name="name" placeholder="Direction Gén. du Tourisme" required />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Sigle">
              <TextInput name="shortName" placeholder="DG Tourisme" />
            </Field>
            <Field label="Catégorie" required>
              <Select name="category" defaultValue="" required>
                <option value="" disabled>
                  — Choisir —
                </option>
                {CATEGORIES.map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Province">
              <Select name="provinceCode" defaultValue="">
                <option value="">— Non renseigné —</option>
                {PROVINCES.map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Téléphone">
              <TextInput name="phone" placeholder="+241 …" />
            </Field>
          </div>
          <Field label="Siège">
            <TextInput name="siege" placeholder="Boulevard Triomphal, Libreville" />
          </Field>
          <Field label="E-mail de contact">
            <TextInput name="contactEmail" placeholder="contact@orga.gouv.ga" />
          </Field>

          {feedback && !feedback.ok && <Alert tone="danger">{feedback.message}</Alert>}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
            <Button variant="ghost" type="button" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" iconRight="arrowRight" disabled={pending}>
              {pending ? "Création…" : "Créer et lancer l'onboarding"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
