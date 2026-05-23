"use client"

import { useState, useTransition } from "react"
import { Alert, Button } from "@workspace/ui"
import { startSignatureAction } from "./actions"

interface Props {
  processId: string
}

export function StartSignatureButton({ processId }: Props) {
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null)

  const handle = () => {
    setFeedback(null)
    startTransition(async () => {
      const result = await startSignatureAction(processId)
      setFeedback({
        ok: result.ok,
        message: result.message ?? (result.ok ? "OK" : "Erreur"),
      })
    })
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <Button
        variant="success"
        icon="shieldCheck"
        onClick={handle}
        disabled={pending}
        style={{ marginTop: 8 }}
      >
        {pending ? "Lancement…" : "Lancer la signature"}
      </Button>
      {feedback && <Alert tone={feedback.ok ? "success" : "danger"}>{feedback.message}</Alert>}
    </div>
  )
}
