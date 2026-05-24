"use client"

import { useState, useTransition } from "react"
import { Alert, Button, Field, TextArea } from "@workspace/ui"
import { sendMessageAction } from "./actions"

interface Props {
  requestRef: string
}

export function SendMessageBox({ requestRef }: Props) {
  const [open, setOpen] = useState(false)
  const [body, setBody] = useState("")
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null)

  if (!open) {
    return (
      <Button variant="secondary" icon="messageSquare" size="sm" onClick={() => setOpen(true)}>
        Nouveau message
      </Button>
    )
  }

  const handle = (e: React.FormEvent) => {
    e.preventDefault()
    setFeedback(null)
    startTransition(async () => {
      const result = await sendMessageAction(requestRef, body)
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
    <form onSubmit={handle} style={{ display: "flex", flexDirection: "column", gap: 8, width: 360 }}>
      <Field label="Votre message">
        <TextArea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Bonjour, j'aurais une question concernant…"
          rows={3}
          required
        />
      </Field>
      {feedback && !feedback.ok && <Alert tone="danger">{feedback.message}</Alert>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Annuler
        </Button>
        <Button type="submit" size="sm" disabled={pending || !body.trim()}>
          {pending ? "Envoi…" : "Envoyer"}
        </Button>
      </div>
    </form>
  )
}
