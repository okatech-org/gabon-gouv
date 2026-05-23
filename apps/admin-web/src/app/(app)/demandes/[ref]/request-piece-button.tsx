"use client"

import { useState, useTransition } from "react"
import { Alert, Button, Field, TextInput } from "@workspace/ui"
import { requestPieceAction } from "./actions"

interface Props {
  requestRef: string
}

/**
 * Bouton « Demander une pièce » — révèle un formulaire inline pour
 * saisir le libellé de la pièce manquante, puis envoie la demande.
 */
export function RequestPieceButton({ requestRef }: Props) {
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState("")
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<
    { ok: boolean; message: string } | null
  >(null)

  if (!open) {
    return (
      <Button
        variant="ghost"
        icon="paperclip"
        size="sm"
        onClick={() => setOpen(true)}
      >
        Demander une pièce
      </Button>
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFeedback(null)
    startTransition(async () => {
      const result = await requestPieceAction(requestRef, label)
      setFeedback({
        ok: result.ok,
        message: result.message ?? (result.ok ? "OK" : "Erreur"),
      })
      if (result.ok) {
        setLabel("")
        setOpen(false)
      }
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: 10 }}
    >
      <Field
        label="Pièce demandée"
        hint="Ex. « Justificatif de domicile actualisé »."
      >
        <TextInput
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          autoFocus
          required
        />
      </Field>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setOpen(false)
            setLabel("")
            setFeedback(null)
          }}
        >
          Annuler
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Envoi…" : "Envoyer la demande"}
        </Button>
      </div>
      {feedback && !feedback.ok && (
        <Alert tone="danger">{feedback.message}</Alert>
      )}
    </form>
  )
}
