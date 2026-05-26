"use client"

/**
 * Panel d'affichage d'un circuit de signature (Bloc 3).
 *
 * Affiche la liste des steps avec leur statut (pending/active/done/refused).
 * Si l'agent connecté est l'assignee du step `active`, propose les actions
 * Approuver / Refuser avec dialog motif.
 *
 * RGAA :
 *   - role=list ordonnée (ol) pour les steps
 *   - statut transmis par texte + icône + couleur (jamais que la couleur)
 *   - dialog motif avec focus initial + Escape
 */

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Badge, Button, Icon, useModalA11y } from "@workspace/ui"
import {
  approveSignatureStepAction,
  refuseSignatureStepAction,
} from "./actions"

interface CircuitStep {
  id: string
  order: number
  assigneeRole: string
  assigneeAgent: { id: string; name: string } | null
  status: string
  decidedAt?: number
  comment?: string
}

interface Props {
  requestRef: string
  circuit: {
    id: string
    status: string
    startedAt: number
    completedAt?: number
    steps: CircuitStep[]
  }
  meAgentId: string
}

function stepBadge(status: string) {
  switch (status) {
    case "done":
      return { tone: "success" as const, label: "Approuvé", icon: "check" as const }
    case "refused":
      return { tone: "danger" as const, label: "Refusé", icon: "x" as const }
    case "active":
      return { tone: "warning" as const, label: "En attente", icon: "clock" as const }
    case "skipped":
      return { tone: "neutral" as const, label: "Sauté", icon: "minus" as const }
    case "pending":
    default:
      return { tone: "neutral" as const, label: "À venir", icon: "clock" as const }
  }
}

export function SignatureCircuitPanel({
  requestRef,
  circuit,
  meAgentId,
}: Props) {
  const router = useRouter()
  const [refusing, setRefusing] = useState(false)
  const [pending, startTransition] = useTransition()

  const activeStep = circuit.steps.find((s) => s.status === "active") ?? null
  const isMyTurn = activeStep?.assigneeAgent?.id === meAgentId

  const approve = () => {
    startTransition(async () => {
      const res = await approveSignatureStepAction(requestRef, circuit.id)
      if (res.ok) router.refresh()
    })
  }

  return (
    <section aria-labelledby="circuit-heading">
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <h3 id="circuit-heading" style={{ fontSize: 14, margin: 0 }}>
          Circuit de signature
        </h3>
        <Badge
          tone={
            circuit.status === "completed"
              ? "success"
              : circuit.status === "refused"
                ? "danger"
                : circuit.status === "active"
                  ? "warning"
                  : "neutral"
          }
          size="sm"
        >
          {circuit.status === "completed"
            ? "Terminé"
            : circuit.status === "refused"
              ? "Refusé"
              : circuit.status === "active"
                ? "En cours"
                : circuit.status}
        </Badge>
      </header>

      <ol
        aria-label="Étapes du circuit"
        style={{
          listStyle: "none",
          counterReset: "step",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {circuit.steps.map((step) => {
          const badge = stepBadge(step.status)
          const isMine = step.assigneeAgent?.id === meAgentId
          return (
            <li
              key={step.id}
              aria-current={step.status === "active" ? "step" : undefined}
              style={{
                padding: 10,
                border: `1px solid ${step.status === "active" ? "var(--warning-500)" : "var(--ink-200)"}`,
                background: step.status === "active" ? "var(--warning-50)" : "white",
                borderRadius: 6,
                display: "flex",
                gap: 10,
                alignItems: "center",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background:
                    step.status === "done"
                      ? "var(--success-500)"
                      : step.status === "refused"
                        ? "var(--danger-500)"
                        : step.status === "active"
                          ? "var(--warning-500)"
                          : "var(--ink-300)",
                  color: "white",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {step.order + 1}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    display: "flex",
                    gap: 6,
                    alignItems: "center",
                  }}
                >
                  {step.assigneeAgent?.name ?? "Non assigné"}
                  {isMine && (
                    <Badge tone="info" size="sm">
                      Vous
                    </Badge>
                  )}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--ink-600)" }}>
                  Rôle : {step.assigneeRole}
                  {step.decidedAt
                    ? ` · décidé le ${new Date(step.decidedAt).toLocaleDateString("fr-FR")}`
                    : ""}
                </div>
                {step.comment && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--ink-700)",
                      marginTop: 4,
                      fontStyle: "italic",
                    }}
                  >
                    « {step.comment} »
                  </div>
                )}
              </div>
              <Badge tone={badge.tone} size="sm" icon={badge.icon}>
                {badge.label}
              </Badge>
            </li>
          )
        })}
      </ol>

      {isMyTurn && activeStep && (
        <div
          role="region"
          aria-label="Actions sur l'étape en attente"
          style={{
            marginTop: 12,
            padding: 12,
            background: "var(--warning-50)",
            border: "1px solid var(--warning-500)",
            borderRadius: 6,
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
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
            {pending ? "…" : "Approuver"}
          </Button>
        </div>
      )}

      {refusing && (
        <RefuseDialog
          requestRef={requestRef}
          circuitId={circuit.id}
          onClose={() => setRefusing(false)}
        />
      )}
    </section>
  )
}

function RefuseDialog({
  requestRef,
  circuitId,
  onClose,
}: {
  requestRef: string
  circuitId: string
  onClose: () => void
}) {
  const router = useRouter()
  const [comment, setComment] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const dialogRef = useRef<HTMLDivElement>(null)
  const firstRef = useRef<HTMLTextAreaElement>(null)

  useModalA11y({
    containerRef: dialogRef,
    initialFocusRef: firstRef,
    onClose,
  })

  const handle = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await refuseSignatureStepAction(requestRef, circuitId, comment)
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
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="refuse-title"
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
          width: "min(440px, 100%)",
          boxShadow: "0 10px 30px rgba(0,0,0,.2)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <h2 id="refuse-title" style={{ fontSize: 16, margin: 0 }}>
          Refuser le visa
        </h2>
        <p style={{ fontSize: 13, color: "var(--ink-600)", margin: 0 }}>
          La demande sera renvoyée à l&apos;instruction pour correction.
          Le préparateur recevra une notification avec votre commentaire.
        </p>
        <label htmlFor="refuse-comment" style={{ fontSize: 13, fontWeight: 600 }}>
          Commentaire{" "}
          <span style={{ color: "var(--danger-500)" }} aria-hidden="true">
            *
          </span>
          <span className="sr-only"> (obligatoire)</span>
        </label>
        <textarea
          id="refuse-comment"
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
          <Button variant="ghost" type="button" onClick={onClose} disabled={pending}>
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
