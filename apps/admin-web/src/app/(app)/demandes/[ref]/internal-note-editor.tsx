"use client"

import { useEffect, useRef, useState } from "react"
import { TextArea } from "@workspace/ui"
import { updateInternalNoteAction } from "./actions"

interface Props {
  requestRef: string
  defaultValue: string
}

/**
 * Éditeur de la note interne — sauvegarde debounced (800 ms après la
 * dernière frappe) via une server action, avec un indicateur discret
 * sous le champ.
 */
export function InternalNoteEditor({ requestRef, defaultValue }: Props) {
  const [value, setValue] = useState(defaultValue)
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  )
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSaved = useRef(defaultValue)

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value
    setValue(next)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      if (next === lastSaved.current) return
      setStatus("saving")
      const result = await updateInternalNoteAction(requestRef, next)
      if (result.ok) {
        lastSaved.current = next
        setStatus("saved")
        setTimeout(() => setStatus("idle"), 1500)
      } else {
        setStatus("error")
      }
    }, 800)
  }

  return (
    <>
      <TextArea
        placeholder="Notes internes (non visibles par le citoyen)…"
        value={value}
        onChange={handleChange}
        style={{ fontSize: 13 }}
      />
      <div
        style={{
          marginTop: 6,
          fontSize: 11,
          color:
            status === "error"
              ? "var(--danger-500)"
              : status === "saved"
              ? "var(--success-600)"
              : "var(--ink-500)",
          minHeight: 14,
        }}
      >
        {status === "saving" && "Sauvegarde…"}
        {status === "saved" && "✓ Note sauvegardée."}
        {status === "error" && "Erreur de sauvegarde — réessayez."}
      </div>
    </>
  )
}
