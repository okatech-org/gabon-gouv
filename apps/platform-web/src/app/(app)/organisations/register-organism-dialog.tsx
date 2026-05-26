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

interface SuccessData {
  orgName: string
  enrollmentUrl: string | null
  firstAdminEmail: string | null
}

export function RegisterOrganismDialog() {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null)
  const [success, setSuccess] = useState<SuccessData | null>(null)

  if (!open) {
    return (
      <Button icon="plus" onClick={() => setOpen(true)}>
        Enregistrer une administration
      </Button>
    )
  }

  const close = () => {
    setOpen(false)
    setSuccess(null)
    setFeedback(null)
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
      if (result.ok && result.data) {
        const d = result.data as {
          firstAdminInvitationToken?: string | null
          firstAdminEmail?: string | null
        }
        const name = String(form.get("name") ?? "").trim()
        if (d.firstAdminInvitationToken) {
          // Reste ouvert pour montrer le lien
          setSuccess({
            orgName: name,
            firstAdminEmail: d.firstAdminEmail ?? null,
            enrollmentUrl: `${window.location.origin.replace(/console\.|admin\./, "admin.")}/enrolement/${d.firstAdminInvitationToken}`,
          })
        } else {
          close()
        }
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

          <div
            style={{
              marginTop: 6,
              padding: "12px 14px",
              background: "var(--ink-50)",
              borderRadius: 8,
              border: "1px solid var(--ink-150)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 600,
                color: "var(--ink-800)",
              }}
            >
              Premier administrateur (optionnel)
            </p>
            <p style={{ fontSize: 12.5, color: "var(--ink-600)", margin: 0 }}>
              Si renseigné, une invitation pending sera générée. Vous
              recopierez le lien d&apos;enrôlement à l&apos;étape suivante
              pour le transmettre à l&apos;invité.
            </p>
            <Field label="E-mail du 1er admin organisme">
              <TextInput
                name="firstAdminEmail"
                type="email"
                placeholder="admin@orga.gouv.ga"
              />
            </Field>
            <Field label="Fonction (optionnel)">
              <TextInput
                name="firstAdminFunction"
                placeholder="Secrétaire général, DSI…"
              />
            </Field>
          </div>

          {feedback && !feedback.ok && <Alert tone="danger">{feedback.message}</Alert>}

          {!success ? (
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
              <Button variant="ghost" type="button" onClick={close}>
                Annuler
              </Button>
              <Button type="submit" iconRight="arrowRight" disabled={pending}>
                {pending ? "Création…" : "Créer et lancer l'onboarding"}
              </Button>
            </div>
          ) : (
            <SuccessSummary success={success} onClose={close} />
          )}
        </form>
      </div>
    </div>
  )
}

function SuccessSummary({
  success,
  onClose,
}: {
  success: SuccessData
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    if (!success.enrollmentUrl) return
    try {
      await navigator.clipboard.writeText(success.enrollmentUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      /* fallback : sélection manuelle */
    }
  }
  return (
    <div
      role="region"
      aria-label="Invitation générée"
      style={{
        background: "var(--success-50)",
        border: "1px solid var(--success-200)",
        borderRadius: 8,
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--success-700)" }}>
        ✓ {success.orgName} créé. Invitation envoyée à {success.firstAdminEmail}.
      </p>
      {success.enrollmentUrl && (
        <>
          <p style={{ margin: 0, fontSize: 12.5, color: "var(--ink-700)" }}>
            Transmettez ce lien d&apos;enrôlement (valide 14 jours) :
          </p>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11.5,
              background: "white",
              border: "1px solid var(--ink-200)",
              padding: 8,
              borderRadius: 4,
              wordBreak: "break-all",
              userSelect: "all",
            }}
          >
            {success.enrollmentUrl}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={copy}
              icon={copied ? "checkCircle" : "copy"}
            >
              {copied ? "Copié" : "Copier le lien"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Fermer
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
