"use client"

/**
 * Bouton "Préparer l'acte" — déclenche prepareDocument qui crée le doc
 * `prepared` et ouvre le circuit de signature.
 *
 * Si le service a un `defaultSignatureCircuitTemplate`, le backend résout
 * les assignees par rôle automatiquement. Sinon, on demande chef+officier
 * via un Dialog (fallback legacy).
 */

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Alert, Button, useModalA11y } from "@workspace/ui"
import { prepareDocumentAction } from "./actions"

interface Agent {
  id: string
  name: string
  role: string
}

interface Props {
  requestRef: string
  hasDefaultCircuit: boolean
  /** Agents éligibles à être assignés au circuit (chef_service + officier). */
  candidatesByRole: {
    chef_service: Agent[]
    officier_signataire: Agent[]
  }
  disabled?: boolean
}

export function PrepareDocumentButton({
  requestRef,
  hasDefaultCircuit,
  candidatesByRole,
  disabled,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{
    ok: boolean
    message: string
  } | null>(null)
  const [pickingAssignees, setPickingAssignees] = useState(false)

  const launch = (chefId?: string, officierId?: string) => {
    setFeedback(null)
    startTransition(async () => {
      const res = await prepareDocumentAction(requestRef, chefId, officierId)
      setFeedback({
        ok: res.ok,
        message: res.message ?? (res.ok ? "OK" : "Erreur"),
      })
      if (res.ok) {
        setPickingAssignees(false)
        router.refresh()
      }
    })
  }

  const onClick = () => {
    if (hasDefaultCircuit) {
      launch()
    } else {
      setPickingAssignees(true)
    }
  }

  return (
    <>
      <Button
        variant="primary"
        icon="fileText"
        onClick={onClick}
        disabled={disabled || pending}
      >
        {pending ? "Préparation…" : "Préparer l'acte"}
      </Button>
      {/* Région live persistante (RGAA 7.5) — préexiste dans le DOM,
          contenu mis à jour pour que les AT annoncent les messages. */}
      <div
        role={feedback?.ok === false ? "alert" : "status"}
        aria-live={feedback?.ok === false ? "assertive" : "polite"}
        aria-atomic="true"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 50,
          maxWidth: 360,
        }}
      >
        {feedback && (
          <Alert tone={feedback.ok ? "success" : "danger"}>
            {feedback.message}
          </Alert>
        )}
      </div>
      {pickingAssignees && (
        <PickAssigneesDialog
          candidatesByRole={candidatesByRole}
          onClose={() => setPickingAssignees(false)}
          onSubmit={(chefId, officierId) => launch(chefId, officierId)}
          pending={pending}
        />
      )}
    </>
  )
}

function PickAssigneesDialog({
  candidatesByRole,
  onClose,
  onSubmit,
  pending,
}: {
  candidatesByRole: Props["candidatesByRole"]
  onClose: () => void
  onSubmit: (chefId: string, officierId: string) => void
  pending: boolean
}) {
  const [chefId, setChefId] = useState(candidatesByRole.chef_service[0]?.id ?? "")
  const [officierId, setOfficierId] = useState(
    candidatesByRole.officier_signataire[0]?.id ?? "",
  )
  const dialogRef = useRef<HTMLDivElement>(null)
  const firstSelectRef = useRef<HTMLSelectElement>(null)

  useModalA11y({
    containerRef: dialogRef,
    initialFocusRef: firstSelectRef,
    onClose,
  })

  const handle = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!chefId || !officierId) return
    onSubmit(chefId, officierId)
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="prepare-title"
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
        <h2 id="prepare-title" style={{ fontSize: 16, margin: 0 }}>
          Choisir les signataires
        </h2>
        <p style={{ fontSize: 12, color: "var(--ink-600)", margin: 0 }}>
          Ce service n&apos;a pas de circuit de signature configuré par défaut.
          Choisissez les agents qui visent puis signent l&apos;acte.
        </p>
        <div>
          <label
            htmlFor="chef-select"
            style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}
          >
            Chef de service (visa)
          </label>
          <select
            id="chef-select"
            ref={firstSelectRef}
            value={chefId}
            onChange={(e) => setChefId(e.target.value)}
            required
            style={selectStyle}
          >
            <option value="">— Choisir —</option>
            {candidatesByRole.chef_service.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="officier-select"
            style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 4 }}
          >
            Officier signataire
          </label>
          <select
            id="officier-select"
            value={officierId}
            onChange={(e) => setOfficierId(e.target.value)}
            required
            style={selectStyle}
          >
            <option value="">— Choisir —</option>
            {candidatesByRole.officier_signataire.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Button variant="ghost" type="button" onClick={onClose} disabled={pending}>
            Annuler
          </Button>
          <Button type="submit" disabled={pending || !chefId || !officierId}>
            {pending ? "…" : "Ouvrir le circuit"}
          </Button>
        </div>
      </form>
    </div>
  )
}

const selectStyle = {
  width: "100%",
  padding: "8px 10px",
  fontSize: 13,
  border: "1px solid var(--ink-300)",
  borderRadius: 6,
  background: "white",
} as const
