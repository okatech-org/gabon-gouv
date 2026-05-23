"use client"

import { useState, useTransition } from "react"
import { Alert, Button } from "@workspace/ui"
import { validateStepAction } from "./actions"

interface Props {
  stepId: string
  stepLabel: string
}

export function ValidateStepButton({ stepId, stepLabel }: Props) {
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null)

  const handle = () => {
    setFeedback(null)
    startTransition(async () => {
      const result = await validateStepAction(stepId)
      setFeedback({
        ok: result.ok,
        message: result.message ?? (result.ok ? "OK" : "Erreur"),
      })
    })
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
      <Button icon="check" onClick={handle} disabled={pending}>
        {pending ? "Validation…" : `Valider · ${stepLabel}`}
      </Button>
      {feedback && (
        <div style={{ minWidth: 280 }}>
          <Alert tone={feedback.ok ? "success" : "danger"}>{feedback.message}</Alert>
        </div>
      )}
    </div>
  )
}
