"use client"

import { useState, useTransition } from "react"
import { Alert, Button, Field, TextArea } from "@workspace/ui"
import { sendMessageToCitizenAction } from "./actions"

interface Props {
  requestRef: string
  citizenName?: string
}

/**
 * « Écrire au citoyen » — révèle un panneau avec textarea + envoi.
 * Atterit dans `requestMessages` (ADR-0010), visible côté C5.
 */
export function MessageCitizenButton({ requestRef, citizenName }: Props) {
  const [open, setOpen] = useState(false)
  const [body, setBody] = useState("")
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<
    { ok: boolean; message: string } | null
  >(null)

  if (!open) {
    return (
      <Button
        variant="ghost"
        icon="messageSquare"
        onClick={() => setOpen(true)}
      >
        Écrire au citoyen
      </Button>
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFeedback(null)
    startTransition(async () => {
      const result = await sendMessageToCitizenAction(requestRef, body)
      setFeedback({
        ok: result.ok,
        message: result.message ?? (result.ok ? "OK" : "Erreur"),
      })
      if (result.ok) {
        setBody("")
        setOpen(false)
      }
    })
  }

  return (
    <div
      style={{
        position: "fixed",
        right: 24,
        bottom: 24,
        zIndex: 60,
        width: 380,
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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <strong style={{ fontSize: 14 }}>
          Message à {citizenName ?? "le citoyen"}
        </strong>
        <Button
          variant="ghost"
          size="sm"
          icon="x"
          onClick={() => {
            setOpen(false)
            setBody("")
            setFeedback(null)
          }}
        >
          {""}
        </Button>
      </div>
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 10 }}
      >
        <Field label="Message">
          <TextArea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Bonjour…"
            autoFocus
            required
            style={{ minHeight: 100, fontSize: 13 }}
          />
        </Field>
        {feedback && !feedback.ok && (
          <Alert tone="danger">{feedback.message}</Alert>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button
            type="submit"
            iconRight="arrowRight"
            size="sm"
            disabled={pending || !body.trim()}
          >
            {pending ? "Envoi…" : "Envoyer"}
          </Button>
        </div>
      </form>
    </div>
  )
}
