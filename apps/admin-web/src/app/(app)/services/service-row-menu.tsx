"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Icon } from "@workspace/ui"
import {
  archiveServiceAction,
  duplicateServiceAction,
  publishServiceAction,
  unpublishServiceAction,
} from "./actions"

interface Props {
  slug: string
  title: string
  status: string
}

/**
 * Kebab menu pour les actions par ligne de service.
 * Approche : <details>/<summary> natif pour le toggle accessible + items
 * comme <button>/<a>. Esc ferme le menu (custom). Click-outside : non
 * implémenté (volontairement simple — un détails reste ouvert tant qu'on
 * ne clique pas ailleurs ou sur le summary).
 */
export function ServiceRowMenu({ slug, title, status }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [showArchiveDialog, setShowArchiveDialog] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runAction = (
    fn: () => Promise<{ ok: boolean; message?: string }>,
    confirm?: string,
  ) => {
    if (confirm && !window.confirm(confirm)) return
    setError(null)
    startTransition(async () => {
      const result = await fn()
      if (!result.ok) {
        setError(result.message ?? "Erreur inattendue.")
      } else {
        router.refresh()
      }
    })
  }

  return (
    <>
      <details
        style={{ position: "relative", display: "inline-block" }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            const det = e.currentTarget
            if (det.open) det.open = false
          }
        }}
      >
        <summary
          aria-label={`Actions pour ${title}`}
          aria-haspopup="menu"
          style={{
            listStyle: "none",
            cursor: "pointer",
            padding: 4,
            borderRadius: 4,
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          <Icon
            name="moreH"
            size={16}
            style={{ color: "var(--ink-500)" }}
            aria-hidden="true"
          />
        </summary>
        <ul
          role="menu"
          aria-label={`Menu d'actions pour ${title}`}
          style={{
            position: "absolute",
            right: 0,
            top: "100%",
            marginTop: 4,
            background: "white",
            border: "1px solid var(--ink-200)",
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,.08)",
            padding: 4,
            listStyle: "none",
            minWidth: 200,
            zIndex: 50,
          }}
        >
          <MenuItem
            label="Configurer"
            icon="settings"
            onClick={() => router.push(`/services/${slug}`)}
            disabled={pending}
          />
          <MenuItem
            label="Aperçu citoyen"
            icon="eye"
            onClick={() => window.open(`/services/${slug}?onglet=apercu`, "_blank")}
            disabled={pending}
          />
          <Separator />
          {status === "draft" && (
            <MenuItem
              label="Publier"
              icon="checkCircle"
              onClick={() =>
                runAction(() => publishServiceAction(slug))
              }
              disabled={pending}
            />
          )}
          {status === "published" && (
            <MenuItem
              label="Dépublier"
              icon="refresh"
              onClick={() =>
                runAction(
                  () => unpublishServiceAction(slug),
                  `Repasser « ${title} » en brouillon ?`,
                )
              }
              disabled={pending}
            />
          )}
          <MenuItem
            label="Dupliquer"
            icon="copy"
            onClick={() => runAction(() => duplicateServiceAction(slug))}
            disabled={pending}
          />
          {status !== "archived" && (
            <MenuItem
              label="Archiver…"
              icon="archive"
              danger
              onClick={() => setShowArchiveDialog(true)}
              disabled={pending}
            />
          )}
        </ul>
      </details>

      {showArchiveDialog && (
        <ArchiveDialog
          slug={slug}
          title={title}
          onClose={() => setShowArchiveDialog(false)}
        />
      )}

      {error && (
        <div
          role="alert"
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: "var(--danger-50)",
            border: "1px solid var(--danger-500)",
            color: "var(--danger-700)",
            padding: "12px 16px",
            borderRadius: 8,
            fontSize: 13,
            maxWidth: 400,
            zIndex: 100,
          }}
        >
          {error}
        </div>
      )}
    </>
  )
}

interface MenuItemProps {
  label: string
  icon: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
}

function MenuItem({ label, icon, onClick, disabled, danger }: MenuItemProps) {
  return (
    <li role="none">
      <button
        role="menuitem"
        type="button"
        onClick={onClick}
        disabled={disabled}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "8px 12px",
          background: "transparent",
          border: "none",
          borderRadius: 6,
          cursor: disabled ? "not-allowed" : "pointer",
          color: danger ? "var(--danger-600)" : "var(--ink-800)",
          fontSize: 13,
          display: "flex",
          alignItems: "center",
          gap: 8,
          opacity: disabled ? 0.5 : 1,
        }}
        onMouseEnter={(e) => {
          if (!disabled)
            (e.currentTarget as HTMLButtonElement).style.background =
              "var(--ink-50)"
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.background =
            "transparent"
        }}
      >
        <Icon
          name={icon as "settings"}
          size={14}
          style={{ color: danger ? "var(--danger-500)" : "var(--ink-500)" }}
          aria-hidden="true"
        />
        {label}
      </button>
    </li>
  )
}

function Separator() {
  return (
    <li
      role="separator"
      style={{
        height: 1,
        background: "var(--ink-150)",
        margin: "4px 0",
      }}
    />
  )
}

/**
 * Modal d'archivage avec motif structuré + texte libre.
 * Utilise le <dialog> natif pour la gestion focus/Esc.
 */
function ArchiveDialog({
  slug,
  title,
  onClose,
}: {
  slug: string
  title: string
  onClose: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [reasonKind, setReasonKind] = useState("policy_change")
  const [reason, setReason] = useState("")

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await archiveServiceAction(slug, reasonKind, reason)
      if (!result.ok) {
        setError(result.message ?? "Erreur inattendue.")
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
      aria-labelledby="archive-dialog-title"
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
          maxWidth: 480,
          width: "100%",
          boxShadow: "0 10px 30px rgba(0,0,0,.2)",
        }}
      >
        <h2 id="archive-dialog-title" style={{ fontSize: 18, marginBottom: 6 }}>
          Archiver « {title} »
        </h2>
        <p style={{ fontSize: 13, color: "var(--ink-600)", marginBottom: 16 }}>
          Le service ne sera plus visible dans le catalogue citoyen. Aucune
          demande en cours ne doit exister.
        </p>
        <form onSubmit={submit}>
          <fieldset
            style={{
              border: "none",
              padding: 0,
              margin: 0,
              marginBottom: 16,
            }}
          >
            <legend
              style={{
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              Motif d'archivage
            </legend>
            {[
              {
                value: "replaced_by_other",
                label: "Remplacé par un autre service",
              },
              { value: "policy_change", label: "Changement de politique" },
              {
                value: "legal_obsolete",
                label: "Cadre légal obsolète / abrogé",
              },
              { value: "other", label: "Autre raison" },
            ].map((opt) => (
              <label
                key={opt.value}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 0",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="reasonKind"
                  value={opt.value}
                  checked={reasonKind === opt.value}
                  onChange={() => setReasonKind(opt.value)}
                />
                {opt.label}
              </label>
            ))}
          </fieldset>
          <label
            htmlFor="archive-reason"
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 6,
            }}
          >
            Précision <span style={{ color: "var(--danger-500)" }}>*</span>
          </label>
          <textarea
            id="archive-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            rows={3}
            style={{
              width: "100%",
              padding: 8,
              fontSize: 13,
              border: "1px solid var(--ink-300)",
              borderRadius: 6,
              fontFamily: "inherit",
              resize: "vertical",
            }}
          />
          {error && (
            <div
              role="alert"
              style={{
                marginTop: 12,
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
              marginTop: 16,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              style={{
                padding: "8px 16px",
                fontSize: 13,
                background: "white",
                border: "1px solid var(--ink-300)",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={pending}
              style={{
                padding: "8px 16px",
                fontSize: 13,
                background: "var(--danger-500)",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: pending ? "wait" : "pointer",
                fontWeight: 600,
              }}
            >
              {pending ? "Archivage…" : "Archiver le service"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
