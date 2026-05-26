"use client"

/**
 * Wizard de création d'une correspondance (Bloc 5).
 *
 * 3 étapes :
 *   1. Type (kind) — sélection visuelle parmi 16 valeurs / 6 familles
 *   2. Destinataires — picker To/CC/BCC + organismes
 *   3. Rédaction — sujet, corps, urgent
 *
 * Au submit :
 *   - createDraft
 *   - addRecipient × N
 *   - submitForSignature OU sendDirect selon kind.requiresCircuit
 *
 * RGAA :
 *   - <ol> stepper
 *   - <fieldset>/<legend> pour les groupes radio
 *   - région live persistante pour le feedback
 *   - chaque <label htmlFor>
 */

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Alert, Badge, Button, Icon } from "@workspace/ui"
import {
  addRecipientAction,
  createDraftAction,
  sendDirectAction,
  submitForSignatureAction,
} from "../actions"

interface Organism {
  id: string
  name: string
}

interface Props {
  organisms: Organism[]
}

const KINDS: { id: string; label: string; family: string; requiresCircuit: boolean }[] = [
  // Instruction
  { id: "instruction_request", label: "Demande d'élément", family: "Instruction", requiresCircuit: false },
  { id: "instruction_transmission", label: "Transmission de pièces", family: "Instruction", requiresCircuit: false },
  { id: "instruction_response", label: "Réponse à une instruction", family: "Instruction", requiresCircuit: false },
  // Décision
  { id: "decision_grant", label: "Décision favorable", family: "Décision", requiresCircuit: true },
  { id: "decision_reject", label: "Décision défavorable", family: "Décision", requiresCircuit: true },
  { id: "decision_suspend", label: "Suspension", family: "Décision", requiresCircuit: true },
  // Coopération
  { id: "cooperation_info_share", label: "Partage d'information", family: "Coopération", requiresCircuit: false },
  { id: "cooperation_data_request", label: "Demande de donnée", family: "Coopération", requiresCircuit: false },
  { id: "cooperation_fraud_alert", label: "Alerte fraude", family: "Coopération", requiresCircuit: false },
  // Saisine
  { id: "escalation_tutelle", label: "Saisine de la tutelle", family: "Saisine", requiresCircuit: true },
  { id: "escalation_dispute", label: "Transmission litige", family: "Saisine", requiresCircuit: true },
  { id: "escalation_incident", label: "Rapport incident", family: "Saisine", requiresCircuit: true },
  // Interne
  { id: "internal_circular", label: "Circulaire", family: "Interne", requiresCircuit: false },
  { id: "internal_service_note", label: "Note de service", family: "Interne", requiresCircuit: false },
  // Protocole
  { id: "protocol_greeting", label: "Vœux / félicitations", family: "Protocole", requiresCircuit: false },
  { id: "protocol_condolences", label: "Condoléances", family: "Protocole", requiresCircuit: false },
  { id: "other", label: "Autre", family: "Autre", requiresCircuit: false },
]

interface RecipientEntry {
  role: "to" | "cc" | "bcc"
  organismId: string
  organismName: string
}

export function NewCorrespondenceWizard({ organisms }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [kind, setKind] = useState<string>("")
  const [recipients, setRecipients] = useState<RecipientEntry[]>([])
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [urgent, setUrgent] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(
    null,
  )
  const [pending, startTransition] = useTransition()

  const selectedKind = KINDS.find((k) => k.id === kind)
  const requiresCircuit = selectedKind?.requiresCircuit ?? false

  const canNextFromStep1 = !!kind
  const canNextFromStep2 = recipients.some((r) => r.role === "to")
  const canSubmit = subject.trim().length > 0 && body.trim().length > 0

  const addRecipient = (role: "to" | "cc" | "bcc", organismId: string) => {
    const org = organisms.find((o) => o.id === organismId)
    if (!org) return
    if (
      recipients.some(
        (r) => r.role === role && r.organismId === organismId,
      )
    )
      return
    setRecipients((prev) => [
      ...prev,
      { role, organismId, organismName: org.name },
    ])
  }

  const removeRecipient = (idx: number) => {
    setRecipients((prev) => prev.filter((_, i) => i !== idx))
  }

  const submit = () => {
    startTransition(async () => {
      // 1. createDraft
      const created = await createDraftAction({
        kind,
        subject,
        body,
        urgent,
      })
      if (!created.ok || !created.data) {
        setFeedback({
          ok: false,
          msg: created.message ?? "Échec de la création.",
        })
        return
      }
      const correspondenceId = created.data.correspondenceId
      // 2. addRecipient × N
      for (const r of recipients) {
        const res = await addRecipientAction(
          correspondenceId,
          r.role,
          "organism",
          r.organismId,
        )
        if (!res.ok) {
          setFeedback({
            ok: false,
            msg: `Échec ajout destinataire : ${res.message}`,
          })
          return
        }
      }
      // 3. submit ou send direct
      if (requiresCircuit) {
        const r = await submitForSignatureAction(correspondenceId)
        setFeedback({
          ok: r.ok,
          msg: r.message ?? (r.ok ? "Soumis." : "Erreur."),
        })
        if (r.ok)
          router.push(`/correspondance/${created.data.ref}`)
      } else {
        const r = await sendDirectAction(correspondenceId)
        setFeedback({
          ok: r.ok,
          msg: r.message ?? (r.ok ? "Envoyé." : "Erreur."),
        })
        if (r.ok)
          router.push(`/correspondance/${created.data.ref}`)
      }
    })
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Stepper */}
      <ol
        aria-label="Étapes du formulaire"
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          gap: 16,
          fontSize: 13,
        }}
      >
        {[
          { n: 1, label: "Type" },
          { n: 2, label: "Destinataires" },
          { n: 3, label: "Rédaction" },
        ].map((s) => {
          const active = s.n === step
          const done = s.n < step
          return (
            <li
              key={s.n}
              aria-current={active ? "step" : undefined}
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: done
                    ? "var(--success-500)"
                    : active
                      ? "var(--primary-500)"
                      : "var(--ink-300)",
                  color: "white",
                  fontSize: 12,
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {done ? <Icon name="check" size={12} aria-hidden="true" /> : s.n}
              </span>
              <span style={{ fontWeight: active ? 700 : 500 }}>
                {s.label}
              </span>
            </li>
          )
        })}
      </ol>

      {/* Étape 1 — Type */}
      {step === 1 && (
        <fieldset style={fieldsetStyle}>
          <legend style={legendStyle}>Quel type de courrier ?</legend>
          <p style={{ fontSize: 13, color: "var(--ink-600)", margin: "0 0 16px" }}>
            Le type détermine les règles applicables : circuit de signature
            obligatoire, durée d&apos;archivage, délais d&apos;accusé de réception
            et de réponse.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 8,
            }}
          >
            {KINDS.map((k) => (
              <label
                key={k.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  padding: 10,
                  border: `1px solid ${kind === k.id ? "var(--primary-500)" : "var(--ink-200)"}`,
                  background: kind === k.id ? "var(--primary-50)" : "white",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                <input
                  type="radio"
                  name="kind"
                  value={k.id}
                  checked={kind === k.id}
                  onChange={() => setKind(k.id)}
                  style={{ marginTop: 2 }}
                />
                <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontWeight: 600 }}>{k.label}</span>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--ink-500)",
                      display: "flex",
                      gap: 4,
                      alignItems: "center",
                    }}
                  >
                    {k.family}
                    {k.requiresCircuit && (
                      <Badge tone="warning" size="sm">
                        Circuit
                      </Badge>
                    )}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {/* Étape 2 — Destinataires */}
      {step === 2 && (
        <fieldset style={fieldsetStyle}>
          <legend style={legendStyle}>Destinataires</legend>
          <p style={{ fontSize: 13, color: "var(--ink-600)", margin: "0 0 16px" }}>
            Au moins un destinataire principal (To) est obligatoire.
          </p>
          <RecipientPicker organisms={organisms} onAdd={addRecipient} />
          <RecipientList recipients={recipients} onRemove={removeRecipient} />
        </fieldset>
      )}

      {/* Étape 3 — Rédaction */}
      {step === 3 && (
        <fieldset style={fieldsetStyle}>
          <legend style={legendStyle}>Rédaction</legend>
          <label htmlFor="subject" style={fieldLabel}>
            Sujet{" "}
            <span style={{ color: "var(--danger-500)" }} aria-hidden="true">
              *
            </span>
          </label>
          <input
            id="subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            aria-required="true"
            style={fieldInput}
          />
          <label htmlFor="body" style={fieldLabel}>
            Corps du courrier{" "}
            <span style={{ color: "var(--danger-500)" }} aria-hidden="true">
              *
            </span>
          </label>
          <textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
            required
            aria-required="true"
            placeholder="Madame, Monsieur,&#10;&#10;…&#10;&#10;Cordialement,"
            style={{ ...fieldInput, resize: "vertical" }}
          />
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 12,
              fontSize: 13,
            }}
          >
            <input
              type="checkbox"
              checked={urgent}
              onChange={(e) => setUrgent(e.target.checked)}
            />
            Marquer comme urgent
          </label>
        </fieldset>
      )}

      {/* Navigation */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 8,
        }}
      >
        <Button
          variant="ghost"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1 || pending}
        >
          Précédent
        </Button>
        {step < 3 ? (
          <Button
            onClick={() => setStep((s) => s + 1)}
            disabled={
              (step === 1 && !canNextFromStep1) ||
              (step === 2 && !canNextFromStep2) ||
              pending
            }
            iconRight="arrowRight"
          >
            Suivant
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={submit}
            disabled={!canSubmit || pending}
            iconRight={requiresCircuit ? "shieldCheck" : "arrowRight"}
          >
            {pending
              ? "Envoi…"
              : requiresCircuit
                ? "Soumettre pour visa"
                : "Envoyer"}
          </Button>
        )}
      </div>

      {/* Région live persistante */}
      <div
        role={feedback?.ok === false ? "alert" : "status"}
        aria-live={feedback?.ok === false ? "assertive" : "polite"}
        aria-atomic="true"
        style={{ position: "fixed", bottom: 24, right: 24, zIndex: 50 }}
      >
        {feedback && (
          <Alert tone={feedback.ok ? "success" : "danger"}>
            {feedback.msg}
          </Alert>
        )}
      </div>
    </div>
  )
}

/* ============================================================
   Sub-composants
   ============================================================ */

function RecipientPicker({
  organisms,
  onAdd,
}: {
  organisms: Organism[]
  onAdd: (role: "to" | "cc" | "bcc", organismId: string) => void
}) {
  const [role, setRole] = useState<"to" | "cc" | "bcc">("to")
  const [orgId, setOrgId] = useState("")
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 12 }}>
      <div>
        <label htmlFor="rcp-role" style={fieldLabel}>
          Rôle
        </label>
        <select
          id="rcp-role"
          value={role}
          onChange={(e) => setRole(e.target.value as "to" | "cc" | "bcc")}
          style={{ ...fieldInput, width: 100 }}
        >
          <option value="to">To</option>
          <option value="cc">CC</option>
          <option value="bcc">BCC</option>
        </select>
      </div>
      <div style={{ flex: 1 }}>
        <label htmlFor="rcp-org" style={fieldLabel}>
          Organisme destinataire
        </label>
        <select
          id="rcp-org"
          value={orgId}
          onChange={(e) => setOrgId(e.target.value)}
          style={fieldInput}
        >
          <option value="">— Choisir un organisme —</option>
          {organisms.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </div>
      <Button
        type="button"
        icon="plus"
        disabled={!orgId}
        onClick={() => {
          if (!orgId) return
          onAdd(role, orgId)
          setOrgId("")
        }}
      >
        Ajouter
      </Button>
    </div>
  )
}

function RecipientList({
  recipients,
  onRemove,
}: {
  recipients: RecipientEntry[]
  onRemove: (idx: number) => void
}) {
  if (recipients.length === 0) {
    return (
      <p style={{ fontSize: 12, color: "var(--ink-500)" }}>
        Aucun destinataire pour le moment.
      </p>
    )
  }
  return (
    <ul
      style={{
        listStyle: "none",
        padding: 0,
        margin: 0,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
      aria-label="Destinataires ajoutés"
    >
      {recipients.map((r, i) => (
        <li
          key={`${r.role}-${r.organismId}-${i}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: 8,
            background: "white",
            border: "1px solid var(--ink-200)",
            borderRadius: 6,
            fontSize: 13,
          }}
        >
          <Badge tone="neutral" size="sm">
            {r.role.toUpperCase()}
          </Badge>
          <span style={{ flex: 1 }}>{r.organismName}</span>
          <button
            type="button"
            onClick={() => onRemove(i)}
            aria-label={`Retirer ${r.organismName}`}
            style={{
              // 32×32 — WCAG 2.5.5 AA (24px min)
              width: 32,
              height: 32,
              border: "1px solid var(--ink-200)",
              borderRadius: 4,
              background: "white",
              cursor: "pointer",
              color: "var(--danger-500)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="x" size={14} aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  )
}

/* ============================================================
   Styles
   ============================================================ */

const fieldsetStyle: React.CSSProperties = {
  border: "1px solid var(--ink-200)",
  borderRadius: 8,
  padding: 20,
  margin: 0,
}

const legendStyle: React.CSSProperties = {
  padding: "0 8px",
  fontSize: 14,
  fontWeight: 700,
}

const fieldLabel: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 6,
  marginTop: 8,
}

const fieldInput: React.CSSProperties = {
  width: "100%",
  padding: 8,
  fontSize: 13,
  border: "1px solid var(--ink-300)",
  borderRadius: 6,
  fontFamily: "inherit",
  background: "white",
}
