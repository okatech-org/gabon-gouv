"use client"

/**
 * Carte d'une signature (en attente OU récente).
 *
 * En "pending" : affiche les boutons Approuver / Refuser + comment optionnel.
 * En "recent" : affiche le statut + commentaire pris en lecture seule.
 *
 * RGAA :
 *   - <article> avec aria-labelledby pour la sémantique
 *   - statuts par badge + couleur (jamais que la couleur)
 *   - dialog motif refus : aria-modal + focus initial + Escape
 */

import { useEffect, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Badge, Button, Card, Icon } from "@workspace/ui"
import { approveAction, refuseAction } from "./actions"

interface Props {
  circuitId: string
  stepOrder: number
  stepsTotal: number
  stepStatus: string
  decidedAt?: number
  comment?: string
  document: {
    id: string
    actNumber: string
    title: string
    status?: string
    hasPdf: boolean
  }
  request: {
    ref: string
    urgent: boolean
    depositedAt: number
    dueAt?: number
  }
  citizen?: { name: string; nip: string } | null
  service?: { title: string; category: string } | null
  agentName: string
  scope: "pending" | "recent"
}

function dueLabel(dueAt?: number): { text: string; tone: "danger" | "warning" | "neutral" } {
  if (!dueAt) return { text: "—", tone: "neutral" }
  const now = Date.now()
  const diff = dueAt - now
  if (diff < 0) return { text: "En retard", tone: "danger" }
  const days = diff / (24 * 60 * 60 * 1000)
  if (days < 1) return { text: "< 24h", tone: "warning" }
  return { text: `${Math.round(days)} j`, tone: "neutral" }
}

export function SignatureCard(props: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [comment, setComment] = useState("")
  const [refusing, setRefusing] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null)
  const titleId = `sig-${props.circuitId}-${props.stepOrder}`

  const approve = () => {
    setFeedback(null)
    startTransition(async () => {
      const res = await approveAction(props.circuitId, comment)
      setFeedback({
        ok: res.ok,
        message: res.message ?? (res.ok ? "OK" : "Erreur"),
      })
      if (res.ok) {
        setComment("")
        router.refresh()
      }
    })
  }

  const due = dueLabel(props.request.dueAt)

  return (
    <Card padded={false}>
      <article aria-labelledby={titleId}>
        {/* Header */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            padding: "14px 16px",
            borderBottom: "1px solid var(--ink-150)",
            gap: 12,
          }}
        >
          <div>
            <h2
              id={titleId}
              style={{
                fontSize: 15,
                fontWeight: 700,
                margin: 0,
                marginBottom: 4,
              }}
            >
              {props.document.title}
              {props.citizen && (
                <span style={{ color: "var(--ink-500)", fontWeight: 500 }}>
                  {" · "}
                  {props.citizen.name}
                </span>
              )}
            </h2>
            <div
              style={{
                fontSize: 12,
                color: "var(--ink-600)",
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <span>
                <strong>{props.document.actNumber}</strong>
              </span>
              <span>
                <Link
                  href={`/demandes/${props.request.ref}`}
                  style={{ color: "var(--primary-600)", textDecoration: "underline" }}
                >
                  {props.request.ref}
                </Link>
              </span>
              <span>
                Étape {props.stepOrder + 1} / {props.stepsTotal}
              </span>
              {props.service && <span>· {props.service.category}</span>}
            </div>
          </div>
          <div
            style={{
              display: "inline-flex",
              gap: 6,
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            {props.request.urgent && (
              <Badge tone="danger" size="sm" icon="alertTriangle">
                Urgent
              </Badge>
            )}
            {props.scope === "pending" ? (
              <Badge tone={due.tone === "neutral" ? "warning" : due.tone} size="sm">
                <Icon name="clock" size={11} aria-hidden="true" /> {due.text}
              </Badge>
            ) : props.stepStatus === "done" ? (
              <Badge tone="success" size="sm" icon="check">
                Approuvé
              </Badge>
            ) : props.stepStatus === "refused" ? (
              <Badge tone="danger" size="sm" icon="x">
                Refusé
              </Badge>
            ) : (
              <Badge tone="neutral" size="sm">
                {props.stepStatus}
              </Badge>
            )}
          </div>
        </header>

        {/* Body */}
        <div style={{ padding: 16 }}>
          {props.scope === "pending" ? (
            <>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--ink-700)",
                  margin: "0 0 12px",
                }}
              >
                Vous êtes assigné{props.agentName.endsWith("e") ? "e" : ""} à
                l&apos;étape <strong>{props.stepOrder + 1}</strong> du circuit.
                Votre décision avancera le dossier vers la prochaine étape, ou
                déclenchera l&apos;émission finale s&apos;il s&apos;agit du
                dernier visa.
              </p>
              <label
                htmlFor={`comment-${titleId}`}
                style={{ fontSize: 12, color: "var(--ink-600)" }}
              >
                Commentaire (optionnel pour approbation, obligatoire pour refus)
              </label>
              <textarea
                id={`comment-${titleId}`}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                style={{
                  width: "100%",
                  marginTop: 4,
                  padding: 8,
                  fontSize: 13,
                  border: "1px solid var(--ink-300)",
                  borderRadius: 6,
                  fontFamily: "inherit",
                  resize: "vertical",
                }}
              />
            </>
          ) : (
            <>
              {props.comment && (
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--ink-700)",
                    margin: 0,
                    fontStyle: "italic",
                  }}
                >
                  « {props.comment} »
                </p>
              )}
              {props.decidedAt && (
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--ink-500)",
                    margin: "8px 0 0",
                  }}
                >
                  Décidé le{" "}
                  {new Date(props.decidedAt).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
            </>
          )}

          {feedback && (
            <div
              role={feedback.ok ? "status" : "alert"}
              style={{
                marginTop: 10,
                padding: 8,
                fontSize: 12,
                background: feedback.ok ? "var(--success-50)" : "var(--danger-50)",
                color: feedback.ok ? "var(--success-700)" : "var(--danger-700)",
                border: `1px solid ${feedback.ok ? "var(--success-500)" : "var(--danger-500)"}`,
                borderRadius: 6,
              }}
            >
              {feedback.message}
            </div>
          )}
        </div>

        {/* Footer actions (pending only) */}
        {props.scope === "pending" && (
          <footer
            style={{
              padding: "12px 16px",
              borderTop: "1px solid var(--ink-150)",
              display: "flex",
              gap: 8,
              justifyContent: "flex-end",
              background: "var(--ink-50)",
            }}
          >
            <Button
              variant="danger"
              size="sm"
              onClick={() => setRefusing(true)}
              disabled={pending}
            >
              Refuser
            </Button>
            <Button
              variant="success"
              size="sm"
              onClick={approve}
              disabled={pending}
            >
              {pending ? "Approbation…" : "Approuver"}
            </Button>
          </footer>
        )}
      </article>

      {refusing && (
        <RefuseDialog
          circuitId={props.circuitId}
          onClose={() => setRefusing(false)}
        />
      )}
    </Card>
  )
}

function RefuseDialog({
  circuitId,
  onClose,
}: {
  circuitId: string
  onClose: () => void
}) {
  const router = useRouter()
  const [comment, setComment] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const firstRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    firstRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const handle = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await refuseAction(circuitId, comment)
      if (res.ok) {
        onClose()
        router.refresh()
      } else {
        setError(res.message ?? "Erreur.")
      }
    })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="refuse-title-sig"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <form
        onSubmit={handle}
        style={{
          background: "white",
          borderRadius: 10,
          padding: 20,
          width: "min(460px, 100%)",
          boxShadow: "0 10px 30px rgba(0,0,0,.2)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <h2 id="refuse-title-sig" style={{ fontSize: 16, margin: 0 }}>
          Refuser le visa
        </h2>
        <p style={{ fontSize: 13, color: "var(--ink-600)", margin: 0 }}>
          La demande sera renvoyée à l&apos;instruction. Le préparateur recevra
          une notification avec votre commentaire.
        </p>
        <label
          htmlFor="refuse-comment-sig"
          style={{ fontSize: 13, fontWeight: 600 }}
        >
          Commentaire{" "}
          <span style={{ color: "var(--danger-500)" }} aria-hidden="true">
            *
          </span>
          <span className="sr-only"> (obligatoire)</span>
        </label>
        <textarea
          id="refuse-comment-sig"
          ref={firstRef}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          required
          aria-required="true"
          style={{
            padding: 8,
            fontSize: 13,
            border: "1px solid var(--ink-300)",
            borderRadius: 6,
            fontFamily: "inherit",
            resize: "vertical",
          }}
        />
        {error && (
          <div
            role="alert"
            style={{
              padding: 8,
              background: "var(--danger-50)",
              border: "1px solid var(--danger-500)",
              color: "var(--danger-700)",
              borderRadius: 6,
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Button
            variant="ghost"
            type="button"
            onClick={onClose}
            disabled={pending}
          >
            Annuler
          </Button>
          <Button type="submit" variant="danger" disabled={pending}>
            {pending ? "…" : "Confirmer le refus"}
          </Button>
        </div>
      </form>
    </div>
  )
}
