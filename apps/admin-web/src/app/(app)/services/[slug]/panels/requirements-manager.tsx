"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Badge, Button, Icon, SectionHeading, Table, Td, Th, Tr } from "@workspace/ui"
import {
  addRequirementAction,
  deleteRequirementAction,
  reorderRequirementsAction,
  updateRequirementAction,
} from "../actions"

const DOC_TYPES = [
  { value: "cni", label: "CNI" },
  { value: "passeport", label: "Passeport" },
  { value: "permis_conduire", label: "Permis de conduire" },
  { value: "livret_famille", label: "Livret de famille" },
  { value: "acte_naissance", label: "Acte de naissance" },
  { value: "acte_mariage", label: "Acte de mariage" },
  { value: "acte_deces", label: "Acte de décès" },
  { value: "certificat_residence", label: "Certificat de résidence" },
  { value: "justif_domicile", label: "Justificatif de domicile" },
  { value: "mandat", label: "Mandat" },
  { value: "attestation", label: "Attestation" },
  { value: "photo_identite", label: "Photo d'identité" },
  { value: "autre", label: "Autre" },
] as const

const AUTOFILL_LABELS: Record<string, string> = {
  citizen_identity: "Identité IDN",
  previous_request: "Demande précédente",
  third_party_api: "API tierce",
  none: "Aucun pré-remplissage",
}

interface Requirement {
  id: string
  label: string
  description: string
  required: boolean
  acceptedDocTypes: string[]
  autofillSource: string | null
  order: number
}

interface Props {
  slug: string
  serviceId: string
  requirements: Requirement[]
  readOnly?: boolean
}

export function RequirementsManager({
  slug,
  serviceId,
  requirements,
  readOnly,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{
    kind: "ok" | "err"
    message: string
  } | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) => {
    setFeedback(null)
    startTransition(async () => {
      const res = await fn()
      if (!res.ok) {
        setFeedback({ kind: "err", message: res.message ?? "Erreur." })
      } else {
        setFeedback({ kind: "ok", message: res.message ?? "OK." })
        router.refresh()
      }
    })
  }

  const move = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= requirements.length) return
    const ids = requirements.map((r) => r.id)
    ;[ids[idx], ids[newIdx]] = [ids[newIdx]!, ids[idx]!]
    run(() => reorderRequirementsAction(slug, serviceId, ids))
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
        }}
      >
        <SectionHeading
          title="Pièces requises"
          subtitle="Documents demandés au citoyen lors du dépôt."
          level={2}
        />
        {!readOnly && (
          <Button
            icon="plus"
            onClick={() => setShowAdd(true)}
            disabled={pending}
          >
            Ajouter une pièce
          </Button>
        )}
      </div>

      {feedback && (
        <div
          role={feedback.kind === "err" ? "alert" : "status"}
          style={{
            padding: 12,
            background:
              feedback.kind === "err" ? "var(--danger-50)" : "var(--success-50)",
            border: `1px solid ${
              feedback.kind === "err" ? "var(--danger-500)" : "var(--success-500)"
            }`,
            color:
              feedback.kind === "err" ? "var(--danger-700)" : "var(--success-700)",
            borderRadius: 6,
            fontSize: 13,
          }}
        >
          {feedback.message}
        </div>
      )}

      {requirements.length === 0 ? (
        <div
          style={{
            padding: "48px 24px",
            textAlign: "center",
            background: "white",
            border: "1px solid var(--ink-200)",
            borderRadius: 8,
            color: "var(--ink-600)",
          }}
        >
          <Icon
            name="paperclip"
            size={36}
            style={{ color: "var(--ink-400)", marginBottom: 12 }}
            aria-hidden="true"
          />
          <p style={{ fontSize: 14 }}>
            Aucune pièce requise. Le citoyen ne devra rien joindre lors du
            dépôt.
          </p>
        </div>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th scope="col">Ordre</Th>
              <Th scope="col">Pièce</Th>
              <Th scope="col">Types acceptés</Th>
              <Th scope="col">Obligatoire</Th>
              <Th scope="col">Pré-remplissage</Th>
              <Th scope="col">
                <span className="sr-only">Actions</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {requirements.map((req, idx) => (
              <Tr key={req.id}>
                <Td>
                  <div
                    style={{
                      display: "inline-flex",
                      flexDirection: "column",
                      gap: 2,
                    }}
                  >
                    <button
                      type="button"
                      aria-label={`Monter ${req.label}`}
                      onClick={() => move(idx, -1)}
                      disabled={readOnly || pending || idx === 0}
                      style={iconBtnStyle(idx === 0 || Boolean(readOnly))}
                    >
                      <Icon name="chevronUp" size={12} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Descendre ${req.label}`}
                      onClick={() => move(idx, 1)}
                      disabled={
                        readOnly || pending || idx === requirements.length - 1
                      }
                      style={iconBtnStyle(
                        idx === requirements.length - 1 || Boolean(readOnly),
                      )}
                    >
                      <Icon name="chevronDown" size={12} aria-hidden="true" />
                    </button>
                  </div>
                </Td>
                <Td>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontWeight: 600 }}>{req.label}</span>
                    {req.description && (
                      <span style={{ fontSize: 12, color: "var(--ink-600)" }}>
                        {req.description}
                      </span>
                    )}
                  </div>
                </Td>
                <Td>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {req.acceptedDocTypes.map((t) => (
                      <Badge key={t} tone="neutral" size="sm">
                        {DOC_TYPES.find((d) => d.value === t)?.label ?? t}
                      </Badge>
                    ))}
                  </div>
                </Td>
                <Td>
                  {req.required ? (
                    <Badge tone="danger" size="sm" dot>
                      Obligatoire
                    </Badge>
                  ) : (
                    <Badge tone="neutral" size="sm">
                      Optionnelle
                    </Badge>
                  )}
                </Td>
                <Td style={{ fontSize: 12, color: "var(--ink-600)" }}>
                  {AUTOFILL_LABELS[req.autofillSource ?? "none"]}
                </Td>
                <Td>
                  {!readOnly && (
                    <div style={{ display: "inline-flex", gap: 4 }}>
                      <button
                        type="button"
                        onClick={() => setEditingId(req.id)}
                        aria-label={`Éditer ${req.label}`}
                        style={iconBtnStyle(false)}
                      >
                        <Icon name="edit" size={14} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            window.confirm(`Supprimer « ${req.label} » ?`)
                          ) {
                            run(() => deleteRequirementAction(slug, req.id))
                          }
                        }}
                        aria-label={`Supprimer ${req.label}`}
                        style={{
                          ...iconBtnStyle(false),
                          color: "var(--danger-500)",
                        }}
                      >
                        <Icon name="trash" size={14} aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}

      {showAdd && (
        <RequirementDialog
          title="Ajouter une pièce requise"
          onClose={() => setShowAdd(false)}
          onSubmit={(data) => addRequirementAction(slug, serviceId, data)}
        />
      )}
      {editingId && (
        <RequirementDialog
          title="Éditer la pièce"
          initial={requirements.find((r) => r.id === editingId)}
          onClose={() => setEditingId(null)}
          onSubmit={(data) =>
            updateRequirementAction(slug, editingId, data)
          }
        />
      )}
    </div>
  )
}

function iconBtnStyle(disabled: boolean) {
  return {
    width: 22,
    height: 22,
    background: "transparent",
    border: "1px solid var(--ink-200)",
    borderRadius: 4,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    color: "var(--ink-700)",
  } as const
}

function RequirementDialog({
  title,
  initial,
  onClose,
  onSubmit,
}: {
  title: string
  initial?: Requirement
  onClose: () => void
  onSubmit: (data: FormData) => Promise<{ ok: boolean; message?: string }>
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handle = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      const res = await onSubmit(data)
      if (!res.ok) {
        setError(res.message ?? "Erreur.")
      } else {
        onClose()
        router.refresh()
      }
    })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="req-dialog-title"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose()
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: 12,
          padding: 24,
          maxWidth: 640,
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 10px 30px rgba(0,0,0,.2)",
        }}
      >
        <h2 id="req-dialog-title" style={{ fontSize: 18, marginBottom: 12 }}>
          {title}
        </h2>
        <form
          onSubmit={handle}
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          <div>
            <label
              htmlFor="r-label"
              style={fieldLabel}
            >
              Libellé{" "}
              <span style={{ color: "var(--danger-500)" }} aria-hidden="true">
                *
              </span>
            </label>
            <input
              id="r-label"
              name="label"
              type="text"
              required
              defaultValue={initial?.label}
              style={fieldInput}
            />
          </div>
          <div>
            <label htmlFor="r-description" style={fieldLabel}>
              Description
            </label>
            <textarea
              id="r-description"
              name="description"
              defaultValue={initial?.description}
              rows={2}
              style={{ ...fieldInput, resize: "vertical" }}
            />
          </div>
          <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
            <legend style={fieldLabel}>
              Types de documents acceptés{" "}
              <span style={{ color: "var(--danger-500)" }} aria-hidden="true">
                *
              </span>
            </legend>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 6,
              }}
            >
              {DOC_TYPES.map((t) => (
                <label
                  key={t.value}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 13,
                    padding: "4px 0",
                  }}
                >
                  <input
                    type="checkbox"
                    name="acceptedDocTypes"
                    value={t.value}
                    defaultChecked={
                      initial?.acceptedDocTypes.includes(t.value) ?? false
                    }
                  />
                  {t.label}
                </label>
              ))}
            </div>
          </fieldset>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
              }}
            >
              <input
                type="checkbox"
                name="required"
                defaultChecked={initial?.required ?? true}
              />
              Pièce obligatoire
            </label>
          </div>
          <div>
            <label htmlFor="r-autofill" style={fieldLabel}>
              Pré-remplissage automatique
            </label>
            <select
              id="r-autofill"
              name="autofillSource"
              defaultValue={initial?.autofillSource ?? "none"}
              style={fieldInput}
            >
              {Object.entries(AUTOFILL_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          {error && (
            <div
              role="alert"
              style={{
                padding: 10,
                background: "var(--danger-50)",
                border: "1px solid var(--danger-500)",
                color: "var(--danger-700)",
                borderRadius: 6,
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}
          <div
            style={{
              display: "flex",
              gap: 8,
              justifyContent: "flex-end",
              marginTop: 8,
            }}
          >
            <Button
              variant="ghost"
              type="button"
              onClick={onClose}
              disabled={pending}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending
                ? "Enregistrement…"
                : initial
                  ? "Mettre à jour"
                  : "Ajouter"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

const fieldLabel = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 6,
} as const

const fieldInput = {
  width: "100%",
  padding: "8px 10px",
  fontSize: 13,
  border: "1px solid var(--ink-300)",
  borderRadius: 6,
  background: "white",
  fontFamily: "inherit",
} as const
