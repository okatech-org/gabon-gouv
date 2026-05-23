"use client"

import { useState, useTransition } from "react"
import { Alert, Button, Field, Select } from "@workspace/ui"
import { transferRequestAction } from "./actions"

interface OrgOption {
  _id: string
  label: string
}

interface Props {
  requestRef: string
  organisms: OrgOption[]
}

/**
 * « Transférer » — sélectionne l'organisme cible et confirme.
 */
export function TransferButton({ requestRef, organisms }: Props) {
  const [open, setOpen] = useState(false)
  const [target, setTarget] = useState<string>("")
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<
    { ok: boolean; message: string } | null
  >(null)

  if (!open) {
    return (
      <Button
        variant="secondary"
        icon="share"
        onClick={() => setOpen(true)}
        disabled={organisms.length === 0}
      >
        Transférer
      </Button>
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!target) {
      setFeedback({ ok: false, message: "Sélectionnez un organisme." })
      return
    }
    setFeedback(null)
    startTransition(async () => {
      const result = await transferRequestAction(requestRef, target)
      setFeedback({
        ok: result.ok,
        message: result.message ?? (result.ok ? "OK" : "Erreur"),
      })
      if (result.ok) {
        setOpen(false)
        setTarget("")
      }
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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <strong style={{ fontSize: 14 }}>Transférer le dossier</strong>
        <Button
          variant="ghost"
          size="sm"
          icon="x"
          onClick={() => {
            setOpen(false)
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
        <Field label="Organisme cible" required>
          <Select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            required
          >
            <option value="">— Choisir —</option>
            {organisms.map((o) => (
              <option key={o._id} value={o._id}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        {feedback && !feedback.ok && (
          <Alert tone="danger">{feedback.message}</Alert>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button
            type="submit"
            size="sm"
            iconRight="arrowRight"
            disabled={pending || !target}
          >
            {pending ? "Transfert…" : "Confirmer le transfert"}
          </Button>
        </div>
      </form>
    </div>
  )
}
