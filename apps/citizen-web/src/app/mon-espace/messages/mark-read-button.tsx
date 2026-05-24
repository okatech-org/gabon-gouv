"use client"

import { useTransition } from "react"
import { Button } from "@workspace/ui"
import {
  markAgentMessageReadAction,
  markNotificationReadAction,
} from "./actions"

interface Props {
  source: "notification" | "agent_message"
  messageId: string
}

export function MarkReadButton({ source, messageId }: Props) {
  const [pending, startTransition] = useTransition()
  const handle = () => {
    startTransition(async () => {
      if (source === "notification") {
        await markNotificationReadAction(messageId)
      } else {
        await markAgentMessageReadAction(messageId)
      }
    })
  }
  return (
    <Button
      variant="ghost"
      size="sm"
      icon="check"
      onClick={handle}
      disabled={pending}
      aria-label="Marquer comme lu"
    >
      {pending ? "…" : "Marquer comme lu"}
    </Button>
  )
}
