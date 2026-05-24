"use client"

import { useState, useTransition } from "react"
import { Alert, Button, Field, TextInput } from "@workspace/ui"
import { cancelMyRequestAction } from "./actions"

interface Props {
  requestRef: string
}

export function CancelRequestButton({ requestRef }: Props) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null)

  if (!open) {
    return (
      <Button variant="ghost" icon="x" onClick={() => setOpen(true)}>
        Annuler la demande
      </Button>
    )
  }

  const handle = (e: React.FormEvent) => {
    e.preventDefault()
    setFeedback(null)
    startTransition(async () => {
      const result = await cancelMyRequestAction(requestRef, reason)
      setFeedback({
        ok: result.ok,
        message: result.message ?? (result.ok ? "OK" : "Erreur"),
      })
      if (result.ok) setOpen(false)
    })
  }

  return (
    <div
      style={{
        position: "fixed",
        right: 24,
        top: 100,
        zIndex: 60,
        width: 360,
        background: "white",
        border: "1px solid var(--ink-200)",
        borderRadius: 12,
        boxShadow: "0 16px 32px rgba(14,26,43,.12)",
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong style={{ fontSize: 14 }}>Annuler la demande {requestRef}</strong>
        <Button variant="ghost" size="sm" icon="x" onClick={() => setOpen(false)}>
          {""}
        </Button>
      </div>
      <form onSubmit={handle} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Field label="Motif (optionnel)" hint="Indiquez pourquoi vous annulez — utile pour l'administration.">
          <TextInput
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Je m'en occupe directement…"
          />
        </Field>
        {feedback && !feedback.ok && <Alert tone="danger">{feedback.message}</Alert>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Garder
          </Button>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "…" : "Confirmer l'annulation"}
          </Button>
        </div>
      </form>
    </div>
  )
}
