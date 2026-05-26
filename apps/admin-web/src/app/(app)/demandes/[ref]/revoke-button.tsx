"use client"

/**
 * Bouton "Révoquer l'acte" (Bloc 4 — admin_organisme uniquement).
 *
 * Action rare mais critique : invalide un acte émis (erreur sur le document,
 * fraude détectée, réémission nécessaire). Dialog motif obligatoire.
 *
 * RGAA :
 *   - Dialog via hook useModalA11y (focus trap, retour focus, inert, Escape)
 *   - Motif obligatoire (aria-required + role=alert si vide)
 *   - Région live persistante pour le feedback
 */

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Alert, Button, useModalA11y } from "@workspace/ui"
import { revokeDocumentAction } from "./actions"

interface Props {
  requestRef: string
  documentId: string
  actNumber: string
}

export function RevokeButton({ requestRef, documentId, actNumber }: Props) {
  const [open, setOpen] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null)

  return (
    <>
      <Button
        variant="danger"
        size="sm"
        icon="alertTriangle"
        onClick={() => setOpen(true)}
      >
        Révoquer cet acte
      </Button>
      {open && (
        <RevokeDialog
          requestRef={requestRef}
          documentId={documentId}
          actNumber={actNumber}
          onClose={() => setOpen(false)}
          onResult={setFeedback}
        />
      )}
      {/* Région live persistante (RGAA 7.5). */}
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
    </>
  )
}

function RevokeDialog({
  requestRef,
  documentId,
  actNumber,
  onClose,
  onResult,
}: {
  requestRef: string
  documentId: string
  actNumber: string
  onClose: () => void
  onResult: (r: { ok: boolean; message: string }) => void
}) {
  const router = useRouter()
  const [reason, setReason] = useState("")
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
      const res = await revokeDocumentAction(requestRef, documentId, reason)
      if (res.ok) {
        onResult({ ok: true, message: res.message ?? "Acte révoqué." })
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
      aria-labelledby="revoke-title"
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
          width: "min(480px, 100%)",
          boxShadow: "0 10px 30px rgba(0,0,0,.2)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <h2 id="revoke-title" style={{ fontSize: 16, margin: 0 }}>
          Révoquer l&apos;acte{" "}
          <span style={{ fontFamily: "var(--font-mono)" }}>{actNumber}</span> ?
        </h2>
        <p style={{ fontSize: 13, color: "var(--ink-600)", margin: 0 }}>
          La révocation est <strong>définitive</strong>. Le PDF reste
          téléchargeable, mais sa vérification publique le marquera comme
          révoqué. Le citoyen sera notifié et pourra déposer une nouvelle
          demande.
        </p>
        <label htmlFor="revoke-reason" style={{ fontSize: 13, fontWeight: 600 }}>
          Motif de révocation{" "}
          <span style={{ color: "var(--danger-500)" }} aria-hidden="true">
            *
          </span>
          <span className="sr-only"> (obligatoire)</span>
        </label>
        <textarea
          id="revoke-reason"
          ref={firstRef}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          required
          aria-required="true"
          placeholder="Ex. : erreur sur la filiation déclarée, doublon avec acte n° XXX, etc."
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
            {pending ? "Révocation…" : "Confirmer la révocation"}
          </Button>
        </div>
      </form>
    </div>
  )
}
