"use client"

/**
 * Formulaire citoyen — créer un courrier vers une administration (Bloc 5).
 *
 * Plus simple que le wizard admin : une seule page, 3 kinds autorisés
 * (instruction_request, cooperation_info_share, other).
 *
 * RGAA :
 *   - <fieldset>/<legend> pour radio kinds
 *   - <label htmlFor> partout
 *   - aria-required sur les champs obligatoires
 *   - région live pour le feedback
 */

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Alert, Button, Card, Icon } from "@workspace/ui"
import { citizenSendAction } from "../actions"

interface Organism {
  id: string
  name: string
  shortName: string
  category: string
}

const CITIZEN_KINDS = [
  {
    id: "instruction_request",
    label: "Demande / requête",
    desc: "Une demande d'information, de pièce ou d'action de la part de l'administration.",
  },
  {
    id: "cooperation_info_share",
    label: "Partage d'information",
    desc: "Vous transmettez une information à l'administration sans demander d'action.",
  },
  {
    id: "other",
    label: "Autre",
    desc: "Tout autre type de courrier officiel.",
  },
] as const

export function CitizenNewCorrespondenceForm({
  organisms,
}: {
  organisms: Organism[]
}) {
  const router = useRouter()
  const [orgId, setOrgId] = useState("")
  const [kind, setKind] = useState<string>("instruction_request")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(
    null,
  )
  const [pending, startTransition] = useTransition()

  const canSubmit = orgId && kind && subject.trim() && body.trim()

  const handle = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!canSubmit) return
    startTransition(async () => {
      const res = await citizenSendAction({
        toOrganismId: orgId,
        kind,
        subject,
        body,
      })
      setFeedback({
        ok: res.ok,
        msg: res.message ?? (res.ok ? "OK" : "Erreur"),
      })
      if (res.ok && res.data?.ref) {
        router.push(`/mon-espace/courriers/${res.data.ref}`)
      }
    })
  }

  return (
    <form
      onSubmit={handle}
      style={{ display: "flex", flexDirection: "column", gap: 20 }}
    >
      {/* Étape 1 — Destinataire */}
      <Card>
        <label htmlFor="org-select" style={fieldLabel}>
          Administration destinataire{" "}
          <span style={{ color: "var(--danger-500)" }} aria-hidden="true">
            *
          </span>
        </label>
        <select
          id="org-select"
          value={orgId}
          onChange={(e) => setOrgId(e.target.value)}
          required
          aria-required="true"
          style={fieldInput}
        >
          <option value="">— Choisir une administration —</option>
          {organisms.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <p style={{ fontSize: 12, color: "var(--ink-600)", margin: "8px 0 0" }}>
          Votre courrier sera adressé à tous les agents habilités de cette
          administration.
        </p>
      </Card>

      {/* Étape 2 — Type */}
      <Card>
        <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
          <legend
            style={{
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 8,
              padding: 0,
            }}
          >
            Type de courrier{" "}
            <span style={{ color: "var(--danger-500)" }} aria-hidden="true">
              *
            </span>
          </legend>
          <div
            style={{ display: "flex", flexDirection: "column", gap: 8 }}
          >
            {CITIZEN_KINDS.map((k) => (
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
                <span>
                  <span style={{ fontWeight: 600 }}>{k.label}</span>
                  <span
                    style={{
                      display: "block",
                      fontSize: 11.5,
                      color: "var(--ink-600)",
                      marginTop: 2,
                    }}
                  >
                    {k.desc}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </Card>

      {/* Étape 3 — Sujet + corps */}
      <Card>
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
          maxLength={140}
        />
        <p style={{ fontSize: 11, color: "var(--ink-500)", margin: "4px 0 12px" }}>
          {subject.length}/140 caractères
        </p>

        <label htmlFor="body" style={fieldLabel}>
          Corps du message{" "}
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
      </Card>

      {/* Mention RGPD + signature */}
      <Card>
        <p
          style={{
            fontSize: 12,
            color: "var(--ink-700)",
            margin: 0,
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
          }}
        >
          <Icon
            name="shieldCheck"
            size={14}
            aria-hidden="true"
            style={{ color: "var(--success-500)", marginTop: 1 }}
          />
          <span>
            En envoyant ce courrier, vous attestez de la véracité des
            informations communiquées. Votre courrier est signé électroniquement
            par votre identité numérique (IDN). Les administrations ne
            communiquent qu&apos;avec les informations strictement nécessaires
            au traitement de votre demande (RGPD).
          </span>
        </p>
      </Card>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
        }}
      >
        <Button
          type="submit"
          variant="primary"
          iconRight="arrowRight"
          disabled={!canSubmit || pending}
        >
          {pending ? "Envoi…" : "Envoyer le courrier"}
        </Button>
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
    </form>
  )
}

const fieldLabel: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 6,
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
