"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Badge, Button, Icon, SectionHeading } from "@workspace/ui"
import {
  activateTemplateAction,
  upsertTemplateAction,
  validateTemplateAction,
} from "../actions"

interface VariantMeta {
  id: string
  key: string
  label: string
  isDefault: boolean
}

interface TemplateRow {
  id: string
  key: string
  version: string
  title: string
  status: string
  validatedByComite: boolean
  validatedAt: string | null
}

interface Props {
  slug: string
  readOnly?: boolean
  initialVariantKey?: string
  variants: VariantMeta[]
  templatesByVariant: { variantId: string; templates: TemplateRow[] }[]
}

export function TemplatesManager({
  slug,
  readOnly,
  initialVariantKey,
  variants,
  templatesByVariant,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{
    kind: "ok" | "err"
    message: string
  } | null>(null)

  const initialVariant =
    variants.find((v) => v.key === initialVariantKey) ??
    variants.find((v) => v.isDefault) ??
    variants[0]
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(
    initialVariant?.id,
  )
  const [editing, setEditing] = useState<TemplateRow | null>(null)
  const [showNew, setShowNew] = useState(false)

  const selectedVariant = variants.find((v) => v.id === selectedVariantId)
  const templatesOfSelected =
    templatesByVariant.find((t) => t.variantId === selectedVariantId)
      ?.templates ?? []

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

  if (variants.length === 0) {
    return (
      <div
        style={{
          padding: "48px 24px",
          textAlign: "center",
          background: "white",
          border: "1px solid var(--ink-200)",
          borderRadius: 8,
        }}
      >
        <p style={{ fontSize: 14, color: "var(--ink-600)" }}>
          Créez d'abord au moins une variante avant de configurer ses templates.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <SectionHeading
        title="Templates de documents"
        subtitle="Un template par variante définit le contenu du document généré et signé."
        level={2}
      />

      {/* Sélecteur de variante */}
      <nav aria-label="Sélecteur de variante">
        <ul
          style={{
            display: "flex",
            gap: 4,
            padding: 0,
            margin: 0,
            listStyle: "none",
            borderBottom: "1px solid var(--ink-200)",
          }}
        >
          {variants.map((v) => {
            const active = v.id === selectedVariantId
            return (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedVariantId(v.id)
                    setEditing(null)
                    setShowNew(false)
                  }}
                  aria-current={active ? "true" : undefined}
                  style={{
                    padding: "10px 14px",
                    fontSize: 13,
                    fontWeight: active ? 700 : 500,
                    background: "transparent",
                    border: "none",
                    borderBottom: active
                      ? "2px solid var(--primary-500)"
                      : "2px solid transparent",
                    color: active ? "var(--primary-600)" : "var(--ink-700)",
                    cursor: "pointer",
                    marginBottom: -1,
                  }}
                >
                  {v.label}
                  {v.isDefault && (
                    <Badge tone="primary" size="sm" style={{ marginLeft: 8 }}>
                      Défaut
                    </Badge>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

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

      {/* Liste des templates de la variante sélectionnée */}
      {selectedVariant && (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3 style={{ fontSize: 15 }}>
              Templates pour « {selectedVariant.label} »
            </h3>
            {!readOnly && !showNew && !editing && (
              <Button
                icon="plus"
                onClick={() => setShowNew(true)}
                disabled={pending}
              >
                Nouveau template
              </Button>
            )}
          </div>

          {templatesOfSelected.length === 0 ? (
            <div
              style={{
                padding: 24,
                background: "var(--ink-50)",
                border: "1px dashed var(--ink-300)",
                borderRadius: 8,
                color: "var(--ink-600)",
                fontSize: 13,
              }}
            >
              Aucun template pour cette variante. Créez-en un pour générer les
              documents délivrés au citoyen.
            </div>
          ) : (
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {templatesOfSelected.map((t) => (
                <li
                  key={t.id}
                  style={{
                    background: "white",
                    border: "1px solid var(--ink-200)",
                    borderRadius: 8,
                    padding: 14,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 14,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      {t.title}
                      <code
                        style={{
                          fontSize: 11,
                          color: "var(--ink-500)",
                          background: "var(--ink-100)",
                          padding: "2px 6px",
                          borderRadius: 4,
                        }}
                      >
                        {t.key} · {t.version}
                      </code>
                    </div>
                    <div
                      style={{
                        marginTop: 6,
                        display: "flex",
                        gap: 6,
                        flexWrap: "wrap",
                      }}
                    >
                      <Badge
                        tone={
                          t.status === "active"
                            ? "success"
                            : t.status === "draft"
                              ? "warning"
                              : "neutral"
                        }
                        size="sm"
                        dot
                      >
                        {t.status === "active"
                          ? "Actif"
                          : t.status === "draft"
                            ? "Brouillon"
                            : "Déprécié"}
                      </Badge>
                      {t.validatedByComite ? (
                        <Badge tone="primary" size="sm">
                          Validé comité {t.validatedAt && `· ${t.validatedAt}`}
                        </Badge>
                      ) : (
                        <Badge tone="neutral" size="sm">
                          Non validé
                        </Badge>
                      )}
                    </div>
                  </div>
                  {!readOnly && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <Button
                        variant="ghost"
                        icon="edit"
                        size="sm"
                        onClick={() => setEditing(t)}
                        disabled={pending}
                      >
                        Éditer
                      </Button>
                      {!t.validatedByComite && t.status !== "deprecated" && (
                        <Button
                          variant="outline"
                          icon="checkCircle"
                          size="sm"
                          onClick={() =>
                            run(() => validateTemplateAction(slug, t.id))
                          }
                          disabled={pending}
                        >
                          Valider (comité)
                        </Button>
                      )}
                      {t.validatedByComite && t.status === "draft" && (
                        <Button
                          icon="checkCircle"
                          size="sm"
                          onClick={() =>
                            run(() => activateTemplateAction(slug, t.id))
                          }
                          disabled={pending}
                        >
                          Activer
                        </Button>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          {(showNew || editing) && selectedVariant && (
            <TemplateEditor
              slug={slug}
              variantId={selectedVariant.id}
              initial={editing}
              onClose={() => {
                setShowNew(false)
                setEditing(null)
              }}
            />
          )}
        </>
      )}
    </div>
  )
}

function TemplateEditor({
  slug,
  variantId,
  initial,
  onClose,
}: {
  slug: string
  variantId: string
  initial: TemplateRow | null
  onClose: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [body, setBody] = useState(initial ? "" : "")

  // On insère un placeholder à la position courante d'un textarea.
  const insertVariable = (varKey: string) => {
    const ta = document.getElementById("tpl-body") as HTMLTextAreaElement | null
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const before = ta.value.slice(0, start)
    const after = ta.value.slice(end)
    const insertion = `{{${varKey}}}`
    const newVal = `${before}${insertion}${after}`
    setBody(newVal)
    ta.value = newVal
    ta.focus()
    ta.setSelectionRange(start + insertion.length, start + insertion.length)
  }

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      const res = await upsertTemplateAction(
        slug,
        variantId,
        initial?.id ?? null,
        data,
      )
      if (!res.ok) {
        setError(res.message ?? "Erreur.")
      } else {
        onClose()
        router.refresh()
      }
    })
  }

  const knownVars = [
    "nom",
    "prenoms",
    "date_naissance",
    "lieu_naissance",
    "pere",
    "mere",
    "numero_acte",
    "annee",
  ]

  return (
    <div
      style={{
        marginTop: 12,
        background: "white",
        border: "1px solid var(--ink-200)",
        borderRadius: 8,
        padding: 16,
        display: "grid",
        gridTemplateColumns: "1fr 240px",
        gap: 16,
      }}
    >
      <form
        onSubmit={submit}
        style={{ display: "flex", flexDirection: "column", gap: 12 }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label htmlFor="tpl-key" style={fieldLabel}>
              Clé du template *
            </label>
            <input
              id="tpl-key"
              name="key"
              type="text"
              required
              defaultValue={initial?.key ?? "acte"}
              disabled={Boolean(initial)} // pas de changement de clé en édition
              style={fieldInput}
            />
          </div>
          <div>
            <label htmlFor="tpl-title" style={fieldLabel}>
              Titre affiché *
            </label>
            <input
              id="tpl-title"
              name="title"
              type="text"
              required
              defaultValue={initial?.title}
              style={fieldInput}
            />
          </div>
        </div>
        <div>
          <label htmlFor="tpl-ref" style={fieldLabel}>
            Référence légale (facultatif)
          </label>
          <input
            id="tpl-ref"
            name="legalReference"
            type="text"
            placeholder="ex. Art. 71 du Code civil"
            style={fieldInput}
          />
        </div>
        <div>
          <label htmlFor="tpl-body" style={fieldLabel}>
            Corps du template{" "}
            <span style={{ color: "var(--ink-500)", fontWeight: 400 }}>
              (utilisez {`{{variable}}`} pour les placeholders)
            </span>
          </label>
          <textarea
            id="tpl-body"
            name="bodyTemplate"
            required
            minLength={20}
            defaultValue={body}
            onChange={(e) => setBody(e.target.value)}
            rows={16}
            style={{
              ...fieldInput,
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              resize: "vertical",
            }}
          />
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
            justifyContent: "flex-end",
            gap: 8,
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
          <Button type="submit" icon="save" disabled={pending}>
            {pending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </form>

      {/* Panel variables */}
      <aside
        aria-label="Variables disponibles"
        style={{
          background: "var(--ink-50)",
          borderRadius: 8,
          padding: 14,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "var(--ink-500)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 10,
          }}
        >
          Variables disponibles
        </div>
        <p
          style={{
            fontSize: 12,
            color: "var(--ink-600)",
            marginBottom: 12,
          }}
        >
          Cliquez pour insérer dans le template.
        </p>
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {knownVars.map((v) => (
            <li key={v}>
              <button
                type="button"
                onClick={() => insertVariable(v)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "6px 8px",
                  background: "white",
                  border: "1px solid var(--ink-200)",
                  borderRadius: 4,
                  fontSize: 12,
                  fontFamily: "var(--font-mono)",
                  color: "var(--primary-600)",
                  cursor: "pointer",
                }}
              >
                {`{{${v}}}`}
              </button>
            </li>
          ))}
        </ul>
        <p
          style={{
            fontSize: 11,
            color: "var(--ink-500)",
            marginTop: 12,
            lineHeight: 1.5,
          }}
        >
          Liste minimale — la gestion fine des variables (source, type) arrivera
          avec le Bloc 3 (génération PDF réelle).
        </p>
      </aside>
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
