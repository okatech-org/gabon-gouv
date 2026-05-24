"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Badge, Button, Icon, SectionHeading, Table, Td, Th, Tr } from "@workspace/ui"
import {
  addVariantAction,
  deleteVariantAction,
  reorderVariantsAction,
  setDefaultVariantAction,
  updateVariantAction,
} from "../actions"

interface Variant {
  id: string
  key: string
  label: string
  description: string
  whoCanApply: string
  isDefault: boolean
  feeOverride: string | null
  feeFcfaOverride: number | null
  delayHoursOverride: number | null
  order: number
  requestsLast30d: number
}

interface Props {
  slug: string
  serviceId: string
  variants: Variant[]
  readOnly?: boolean
}

export function VariantsManager({
  slug,
  serviceId,
  variants,
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
    if (newIdx < 0 || newIdx >= variants.length) return
    const orderedIds = [...variants].map((v) => v.id)
    ;[orderedIds[idx], orderedIds[newIdx]] = [
      orderedIds[newIdx]!,
      orderedIds[idx]!,
    ]
    run(() => reorderVariantsAction(slug, serviceId, orderedIds))
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
          title="Variantes"
          subtitle="Sous-cas métier du service. Chaque variante porte son propre template de document."
          level={2}
        />
        {!readOnly && (
          <Button
            icon="plus"
            onClick={() => setShowAdd(true)}
            disabled={pending}
          >
            Ajouter une variante
          </Button>
        )}
      </div>

      {feedback && (
        <FeedbackBanner kind={feedback.kind} message={feedback.message} />
      )}

      {variants.length === 0 ? (
        <EmptyState />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th scope="col">Ordre</Th>
              <Th scope="col">Libellé</Th>
              <Th scope="col">Clé</Th>
              <Th scope="col">Public éligible</Th>
              <Th scope="col">Frais override</Th>
              <Th scope="col">Délai override</Th>
              <Th scope="col">Demandes 30 j</Th>
              <Th scope="col">Par défaut</Th>
              <Th scope="col">
                <span className="sr-only">Actions</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {variants.map((variant, idx) => (
              <Tr key={variant.id}>
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
                      aria-label={`Déplacer ${variant.label} vers le haut`}
                      onClick={() => move(idx, -1)}
                      disabled={readOnly || pending || idx === 0}
                      style={iconBtnStyle(idx === 0 || Boolean(readOnly))}
                    >
                      <Icon name="chevronUp" size={12} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Déplacer ${variant.label} vers le bas`}
                      onClick={() => move(idx, 1)}
                      disabled={
                        readOnly || pending || idx === variants.length - 1
                      }
                      style={iconBtnStyle(
                        idx === variants.length - 1 || Boolean(readOnly),
                      )}
                    >
                      <Icon name="chevronDown" size={12} aria-hidden="true" />
                    </button>
                  </div>
                </Td>
                <Td style={{ fontWeight: 600 }}>{variant.label}</Td>
                <Td>
                  <code style={{ fontSize: 12, color: "var(--ink-600)" }}>
                    {variant.key}
                  </code>
                </Td>
                <Td
                  style={{
                    color: "var(--ink-600)",
                    maxWidth: 220,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {variant.whoCanApply || "—"}
                </Td>
                <Td>{variant.feeOverride || "—"}</Td>
                <Td>
                  {variant.delayHoursOverride
                    ? `${variant.delayHoursOverride} h`
                    : "—"}
                </Td>
                <Td
                  style={{
                    fontVariantNumeric: "tabular-nums",
                    fontWeight: 600,
                  }}
                >
                  {variant.requestsLast30d}
                </Td>
                <Td>
                  {variant.isDefault ? (
                    <Badge tone="primary" dot>
                      Défaut
                    </Badge>
                  ) : (
                    !readOnly && (
                      <button
                        type="button"
                        onClick={() =>
                          run(() => setDefaultVariantAction(slug, variant.id))
                        }
                        disabled={pending}
                        style={{
                          fontSize: 12,
                          background: "transparent",
                          border: "1px solid var(--ink-300)",
                          borderRadius: 4,
                          padding: "2px 8px",
                          cursor: "pointer",
                        }}
                        aria-label={`Définir ${variant.label} comme défaut`}
                      >
                        Définir
                      </button>
                    )
                  )}
                </Td>
                <Td>
                  <div style={{ display: "inline-flex", gap: 4 }}>
                    {!readOnly && (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditingId(variant.id)}
                          disabled={pending}
                          aria-label={`Éditer ${variant.label}`}
                          style={iconBtnStyle(false)}
                        >
                          <Icon name="edit" size={14} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              window.confirm(
                                `Supprimer la variante « ${variant.label} » ?`,
                              )
                            ) {
                              run(() => deleteVariantAction(slug, variant.id))
                            }
                          }}
                          disabled={pending}
                          aria-label={`Supprimer ${variant.label}`}
                          style={{
                            ...iconBtnStyle(false),
                            color: "var(--danger-500)",
                          }}
                        >
                          <Icon name="trash" size={14} aria-hidden="true" />
                        </button>
                      </>
                    )}
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}

      {showAdd && (
        <VariantDialog
          title="Ajouter une variante"
          onClose={() => setShowAdd(false)}
          onSubmit={(formData) => addVariantAction(slug, serviceId, formData)}
        />
      )}
      {editingId && (
        <VariantDialog
          title="Éditer la variante"
          initial={variants.find((v) => v.id === editingId)}
          onClose={() => setEditingId(null)}
          onSubmit={(formData) =>
            updateVariantAction(slug, editingId, formData)
          }
        />
      )}
    </div>
  )
}

function EmptyState() {
  return (
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
        name="layers"
        size={36}
        style={{ color: "var(--ink-400)", marginBottom: 12 }}
        aria-hidden="true"
      />
      <p style={{ fontSize: 14 }}>
        Aucune variante définie. Ajoutez-en au moins une pour que le service
        soit utilisable.
      </p>
    </div>
  )
}

function FeedbackBanner({
  kind,
  message,
}: {
  kind: "ok" | "err"
  message: string
}) {
  return (
    <div
      role={kind === "err" ? "alert" : "status"}
      style={{
        padding: 12,
        background: kind === "err" ? "var(--danger-50)" : "var(--success-50)",
        border: `1px solid ${
          kind === "err" ? "var(--danger-500)" : "var(--success-500)"
        }`,
        color: kind === "err" ? "var(--danger-700)" : "var(--success-700)",
        borderRadius: 6,
        fontSize: 13,
      }}
    >
      {message}
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

function VariantDialog({
  title,
  initial,
  onClose,
  onSubmit,
}: {
  title: string
  initial?: Variant
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
      aria-labelledby="variant-dialog-title"
      style={dialogOverlayStyle}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose()
      }}
    >
      <div style={dialogPanelStyle}>
        <h2 id="variant-dialog-title" style={{ fontSize: 18, marginBottom: 12 }}>
          {title}
        </h2>
        <form
          onSubmit={handle}
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <DialogField label="Libellé" id="v-label" required>
              <input
                id="v-label"
                name="label"
                type="text"
                required
                defaultValue={initial?.label}
                style={dialogInputStyle}
              />
            </DialogField>
            {!initial && (
              <DialogField
                label="Clé technique"
                id="v-key"
                required
                hint="snake_case — ex. copie_integrale"
              >
                <input
                  id="v-key"
                  name="key"
                  type="text"
                  required
                  pattern="[a-z0-9_]+"
                  style={dialogInputStyle}
                />
              </DialogField>
            )}
          </div>
          <DialogField label="Description" id="v-description">
            <textarea
              id="v-description"
              name="description"
              defaultValue={initial?.description}
              rows={2}
              style={{ ...dialogInputStyle, resize: "vertical" }}
            />
          </DialogField>
          <DialogField label="Public éligible" id="v-who">
            <textarea
              id="v-who"
              name="whoCanApply"
              defaultValue={initial?.whoCanApply}
              rows={2}
              style={{ ...dialogInputStyle, resize: "vertical" }}
            />
          </DialogField>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}
          >
            <DialogField label="Frais (texte)" id="v-fee">
              <input
                id="v-fee"
                name="feeOverride"
                type="text"
                defaultValue={initial?.feeOverride ?? ""}
                placeholder="ex. 1 000 FCFA"
                style={dialogInputStyle}
              />
            </DialogField>
            <DialogField label="Frais (FCFA)" id="v-fee-num">
              <input
                id="v-fee-num"
                name="feeFcfaOverride"
                type="number"
                min={0}
                step={100}
                defaultValue={initial?.feeFcfaOverride ?? ""}
                style={dialogInputStyle}
              />
            </DialogField>
            <DialogField label="Délai override (h)" id="v-delay">
              <input
                id="v-delay"
                name="delayHoursOverride"
                type="number"
                min={1}
                step={1}
                defaultValue={initial?.delayHoursOverride ?? ""}
                style={dialogInputStyle}
              />
            </DialogField>
          </div>
          {error && <FeedbackBanner kind="err" message={error} />}
          <div
            style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}
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

function DialogField({
  label,
  id,
  required,
  hint,
  children,
}: {
  label: string
  id: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label
        htmlFor={id}
        style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}
      >
        {label}
        {required && (
          <span style={{ color: "var(--danger-500)" }} aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </label>
      {children}
      {hint && (
        <p style={{ fontSize: 11, color: "var(--ink-500)", marginTop: 2 }}>
          {hint}
        </p>
      )}
    </div>
  )
}

const dialogOverlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 200,
  padding: 16,
} as const

const dialogPanelStyle = {
  background: "white",
  borderRadius: 12,
  padding: 24,
  maxWidth: 640,
  width: "100%",
  maxHeight: "90vh",
  overflowY: "auto",
  boxShadow: "0 10px 30px rgba(0,0,0,.2)",
} as const

const dialogInputStyle = {
  width: "100%",
  padding: "8px 10px",
  fontSize: 13,
  border: "1px solid var(--ink-300)",
  borderRadius: 6,
  background: "white",
  fontFamily: "inherit",
} as const
