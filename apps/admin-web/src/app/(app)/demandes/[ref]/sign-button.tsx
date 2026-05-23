"use client"

import { useState, useTransition } from "react"
import { Alert, Button } from "@workspace/ui"
import { signAndIssueAction } from "./actions"

interface Props {
  requestRef: string
  disabled?: boolean
}

/**
 * Bouton « Valider & signer » — sur succès, le revalidate de la page
 * affichera l'acte émis. Un message de confirmation s'affiche en attendant.
 */
export function SignAndIssueButton({ requestRef, disabled }: Props) {
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<
    { ok: boolean; message: string } | null
  >(null)

  const handleClick = () => {
    setFeedback(null)
    startTransition(async () => {
      const result = await signAndIssueAction(requestRef)
      setFeedback({
        ok: result.ok,
        message: result.message ?? (result.ok ? "OK" : "Erreur"),
      })
    })
  }

  return (
    <>
      <Button
        variant="success"
        icon="check"
        onClick={handleClick}
        disabled={disabled || pending}
      >
        {pending ? "Signature…" : "Valider & signer"}
      </Button>
      {feedback && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 50, maxWidth: 360 }}>
          <Alert tone={feedback.ok ? "success" : "danger"}>{feedback.message}</Alert>
        </div>
      )}
    </>
  )
}
