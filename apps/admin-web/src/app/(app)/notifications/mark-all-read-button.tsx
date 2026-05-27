"use client"

import { useTransition } from "react"
import { Button } from "@workspace/ui"
import { markAllReadAction } from "./actions"

export function MarkAllReadButton() {
  const [pending, startTransition] = useTransition()
  return (
    <Button
      variant="secondary"
      icon="checkCircle"
      onClick={() =>
        startTransition(async () => {
          await markAllReadAction()
        })
      }
      disabled={pending}
    >
      {pending ? "…" : "Tout marquer lu"}
    </Button>
  )
}
