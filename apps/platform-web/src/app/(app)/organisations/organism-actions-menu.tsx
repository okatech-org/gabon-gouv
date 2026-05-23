"use client"

import { useState, useTransition } from "react"
import { Alert, Button, Field, Icon, TextInput } from "@workspace/ui"
import { reactivateOrganismAction, suspendOrganismAction } from "./actions"

interface Props {
  organismId: string
  organismName: string
  status: string // "active" | "onboarding" | "suspended"
}

export function OrganismActionsMenu({ organismId, organismName, status }: Props) {
  const [mode, setMode] = useState<"closed" | "open" | "suspend">("closed")
  const [reason, setReason] = useState("")
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null)

  const close = () => {
    setMode("closed")
    setReason("")
    setFeedback(null)
  }

  const handleSuspend = (e: React.FormEvent) => {
    e.preventDefault()
    setFeedback(null)
    startTransition(async () => {
      const result = await suspendOrganismAction(organismId, reason)
      setFeedback({
        ok: result.ok,
        message: result.message ?? (result.ok ? "OK" : "Erreur"),
      })
      if (result.ok) close()
    })
  }

  const handleReactivate = () => {
    setFeedback(null)
    startTransition(async () => {
      const result = await reactivateOrganismAction(organismId)
      setFeedback({
        ok: result.ok,
        message: result.message ?? (result.ok ? "OK" : "Erreur"),
      })
      if (result.ok) close()
    })
  }

  if (mode === "closed") {
    return (
      <button
        onClick={() => setMode("open")}
        aria-label={`Actions pour ${organismName}`}
        style={{
          background: "transparent",
          border: 0,
          padding: 4,
          cursor: "pointer",
          color: "var(--ink-400)",
          display: "inline-flex",
        }}
      >
        <Icon name="moreH" size={16} />
      </button>
    )
  }

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={close}
        aria-label="Fermer"
        style={{
          background: "transparent",
          border: 0,
          padding: 4,
          cursor: "pointer",
          color: "var(--ink-700)",
          display: "inline-flex",
        }}
      >
        <Icon name="moreH" size={16} />
      </button>
      <div
        style={{
          position: "absolute",
          right: 0,
          top: "100%",
          marginTop: 4,
          background: "white",
          border: "1px solid var(--ink-200)",
          borderRadius: 10,
          boxShadow: "0 16px 32px rgba(14,26,43,.12)",
          padding: mode === "suspend" ? 14 : 6,
          minWidth: mode === "suspend" ? 320 : 200,
          zIndex: 40,
        }}
      >
        {mode === "open" && (
          <>
            {status !== "suspended" && (
              <button
                onClick={() => setMode("suspend")}
                disabled={pending}
                style={menuItemStyle}
              >
                <Icon name="alertTriangle" size={14} /> Suspendre
              </button>
            )}
            {status === "suspended" && (
              <button onClick={handleReactivate} disabled={pending} style={menuItemStyle}>
                <Icon name="checkCircle" size={14} />{" "}
                {pending ? "Réactivation…" : "Réactiver"}
              </button>
            )}
            <button onClick={close} style={{ ...menuItemStyle, color: "var(--ink-500)" }}>
              <Icon name="x" size={14} /> Annuler
            </button>
            {feedback && !feedback.ok && (
              <div style={{ padding: 6 }}>
                <Alert tone="danger">{feedback.message}</Alert>
              </div>
            )}
          </>
        )}
        {mode === "suspend" && (
          <form onSubmit={handleSuspend} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <strong style={{ fontSize: 13 }}>Suspendre {organismName}</strong>
            <Field label="Motif" required>
              <TextInput
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Manquement contractuel…"
                required
              />
            </Field>
            {feedback && !feedback.ok && <Alert tone="danger">{feedback.message}</Alert>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
              <Button type="button" variant="ghost" size="sm" onClick={close}>
                Annuler
              </Button>
              <Button type="submit" size="sm" disabled={pending || !reason.trim()}>
                {pending ? "…" : "Suspendre"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

const menuItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  background: "transparent",
  border: 0,
  padding: "8px 10px",
  fontSize: 13,
  textAlign: "left",
  cursor: "pointer",
  borderRadius: 6,
  color: "var(--ink-800)",
}
