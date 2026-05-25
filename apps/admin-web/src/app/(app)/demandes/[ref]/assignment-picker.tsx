"use client"

/**
 * Picker d'assignation d'une demande à un agent de l'organisme.
 * Bouton "M'assigner" rapide + select pour choisir un autre agent.
 *
 * RGAA :
 *   - <label htmlFor> sur le select
 *   - bouton libellé explicitement
 *   - statut courant transmis par texte (Badge)
 */

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Badge, Button, Icon } from "@workspace/ui"
import { assignRequestAction } from "./actions"

interface Agent {
  id: string
  name: string
  role: string
}

interface Props {
  requestRef: string
  currentAgent: { id: string; name: string; role: string } | null
  meAgentId: string
  meName: string
  candidates: Agent[]
  readOnly?: boolean
}

export function AssignmentPicker({
  requestRef,
  currentAgent,
  meAgentId,
  meName,
  candidates,
  readOnly,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [selectedId, setSelectedId] = useState<string>("")

  const isMine = currentAgent?.id === meAgentId

  const apply = (agentId: string | null) => {
    startTransition(async () => {
      const res = await assignRequestAction(requestRef, agentId)
      if (res.ok) {
        setSelectedId("")
        router.refresh()
      }
    })
  }

  return (
    <section aria-labelledby="assign-heading">
      <h3
        id="assign-heading"
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "var(--ink-500)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          margin: "0 0 8px",
        }}
      >
        Assignation
      </h3>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
          }}
        >
          <Icon name="user" size={14} aria-hidden="true" />
          {currentAgent ? (
            <span>
              <strong>{currentAgent.name}</strong>
              <Badge tone="neutral" size="sm" style={{ marginLeft: 6 }}>
                {currentAgent.role}
              </Badge>
              {isMine && (
                <Badge tone="info" size="sm" style={{ marginLeft: 4 }}>
                  Vous
                </Badge>
              )}
            </span>
          ) : (
            <span style={{ color: "var(--ink-500)" }}>Non assignée</span>
          )}
        </div>

        {!readOnly && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {!isMine && (
              <Button
                size="sm"
                variant="secondary"
                icon="user"
                onClick={() => apply(meAgentId)}
                disabled={pending}
              >
                M&apos;assigner (je suis {meName})
              </Button>
            )}
            <div style={{ display: "flex", gap: 6 }}>
              <label htmlFor="assign-select" className="sr-only">
                Assigner à un autre agent
              </label>
              <select
                id="assign-select"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                disabled={pending}
                style={{
                  flex: 1,
                  padding: "6px 8px",
                  fontSize: 12,
                  border: "1px solid var(--ink-300)",
                  borderRadius: 4,
                  background: "white",
                }}
              >
                <option value="">— Choisir un agent —</option>
                {candidates.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.role})
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                onClick={() => selectedId && apply(selectedId)}
                disabled={pending || !selectedId}
              >
                Assigner
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
