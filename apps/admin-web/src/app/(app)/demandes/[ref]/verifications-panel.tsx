"use client"

/**
 * Panel des vérifications automatiques + manuelles d'une demande.
 *
 * Remplace l'affichage statique précédent. Pour chaque vérif `pending` :
 * boutons OK / KO / Non applicable. Pour les vérifs `ok`/`ko`/`not_applicable`,
 * affichage lecture seule avec evidence.
 *
 * RGAA :
 *   - role=list/listitem (sémantique liste)
 *   - statut transmis par texte + icône + couleur (pas que la couleur)
 *   - boutons explicitement labelisés
 */

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Badge, Button, Icon } from "@workspace/ui"
import { setVerificationStatusAction } from "./actions"

interface Verification {
  id: string
  title: string
  description: string
  status: string
  kind?: string
  evidence?: string
  automated: boolean
}

interface Props {
  requestRef: string
  verifications: Verification[]
  readOnly?: boolean
}

function statusBadge(status: string) {
  switch (status) {
    case "ok":
      return { tone: "success" as const, label: "Validée", icon: "check" as const }
    case "ko":
      return { tone: "danger" as const, label: "Échec", icon: "x" as const }
    case "not_applicable":
      return { tone: "neutral" as const, label: "Non applicable", icon: "minus" as const }
    case "pending":
      return { tone: "warning" as const, label: "En attente", icon: "clock" as const }
    default:
      return { tone: "neutral" as const, label: status, icon: "info" as const }
  }
}

export function VerificationsPanel({
  requestRef,
  verifications,
  readOnly,
}: Props) {
  const okCount = verifications.filter((v) => v.status === "ok").length
  return (
    <section aria-labelledby="verif-heading">
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <h3 id="verif-heading" style={{ fontSize: 14, margin: 0 }}>
          Vérifications
        </h3>
        <Badge tone={okCount === verifications.length ? "success" : "neutral"} size="sm">
          {okCount}/{verifications.length} OK
        </Badge>
      </header>
      <ul aria-label="Vérifications" style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {verifications.map((v) => (
          <VerificationRow
            key={v.id}
            verification={v}
            requestRef={requestRef}
            readOnly={readOnly}
          />
        ))}
      </ul>
    </section>
  )
}

function VerificationRow({
  verification: v,
  requestRef,
  readOnly,
}: {
  verification: Verification
  requestRef: string
  readOnly?: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [showEvidence, setShowEvidence] = useState(false)
  const [evidence, setEvidence] = useState(v.evidence ?? "")
  const badge = statusBadge(v.status)

  const apply = (status: "ok" | "ko" | "not_applicable") => {
    startTransition(async () => {
      const res = await setVerificationStatusAction(
        requestRef,
        v.id,
        status,
        status === "ko" || status === "ok" ? evidence : undefined,
      )
      if (res.ok) {
        setShowEvidence(false)
        router.refresh()
      }
    })
  }

  return (
    <li
      style={{
        padding: "10px 0",
        borderBottom: "1px solid var(--ink-150)",
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          flexShrink: 0,
          background:
            v.status === "ok"
              ? "var(--success-500)"
              : v.status === "ko"
                ? "var(--danger-500)"
                : "var(--ink-300)",
          color: "white",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 2,
        }}
      >
        <Icon name={badge.icon} size={12} stroke={3} />
      </span>
      <div style={{ flex: 1 }}>
        <div
          style={{
            display: "flex",
            gap: 6,
            alignItems: "center",
            fontSize: 13.5,
            fontWeight: 600,
          }}
        >
          {v.title}
          {v.automated && (
            <Badge tone="info" size="sm">
              Auto
            </Badge>
          )}
        </div>
        <div style={{ fontSize: 12.5, color: "var(--ink-600)" }}>
          {v.description}
        </div>
        {v.evidence && (
          <div
            style={{
              fontSize: 12,
              color: "var(--ink-500)",
              marginTop: 4,
              fontStyle: "italic",
            }}
          >
            Source : {v.evidence}
          </div>
        )}

        {!readOnly && v.status === "pending" && (
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
            {showEvidence && (
              <input
                type="text"
                placeholder="Source / référence (optionnel)"
                value={evidence}
                onChange={(e) => setEvidence(e.target.value)}
                aria-label="Source de la vérification"
                style={{
                  padding: 6,
                  fontSize: 12,
                  border: "1px solid var(--ink-300)",
                  borderRadius: 4,
                  fontFamily: "inherit",
                }}
              />
            )}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <Button
                size="sm"
                variant="success"
                onClick={() => apply("ok")}
                disabled={pending}
              >
                Valider
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => apply("ko")}
                disabled={pending}
              >
                Échec
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => apply("not_applicable")}
                disabled={pending}
              >
                N/A
              </Button>
              <button
                type="button"
                onClick={() => setShowEvidence((s) => !s)}
                aria-pressed={showEvidence}
                style={{
                  fontSize: 11,
                  background: "transparent",
                  border: "none",
                  color: "var(--ink-600)",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                {showEvidence ? "Masquer source" : "Ajouter source"}
              </button>
            </div>
          </div>
        )}
      </div>
      <Badge tone={badge.tone} size="sm">
        {badge.label}
      </Badge>
    </li>
  )
}
