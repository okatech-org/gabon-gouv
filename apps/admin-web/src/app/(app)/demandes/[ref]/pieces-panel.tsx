"use client"

/**
 * Panel des pièces justificatives de la page demande — version Bloc 3.
 *
 * Remplace l'affichage inerte précédent (icônes œil/download non cliquables).
 * Chaque ligne :
 *   - boutons "Voir" (Dialog modal avec iframe PDF ou img) et "Télécharger"
 *     (URL signée via getPieceViewUrl)
 *   - boutons "Valider" / "Rejeter" pour les pièces `uploaded`
 *   - badge statut + motif de rejet si applicable
 *
 * RGAA :
 *   - Dialog avec role=dialog + aria-modal=true + aria-labelledby
 *   - Focus trappé dans le dialog (focus initial + Escape pour fermer)
 *   - Boutons explicitement labelisés (pas de “…”)
 */

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Badge, Button, Icon } from "@workspace/ui"
import {
  getPieceViewUrlAction,
  rejectPieceAction,
  validatePieceAction,
} from "./actions"

interface Piece {
  id: string
  label: string
  filename?: string
  sizeBytes?: number
  mimeType?: string
  hasFile: boolean
  status: string
  required: boolean
  ocrConfidence?: number
  rejectionReason?: string
  validatedAt?: number
}

interface Props {
  requestRef: string
  pieces: Piece[]
  readOnly?: boolean
}

function formatBytes(bytes?: number): string {
  if (!bytes) return ""
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} Mo`
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(0)} Ko`
  return `${bytes} o`
}

function statusBadge(p: Piece) {
  switch (p.status) {
    case "validated":
      return { tone: "success" as const, label: "Validée" }
    case "rejected":
      return { tone: "danger" as const, label: "Rejetée" }
    case "uploaded":
      return { tone: "warning" as const, label: "À valider" }
    case "missing":
      return { tone: "neutral" as const, label: "Manquante" }
    case "uploading":
      return { tone: "info" as const, label: "Upload…" }
    default:
      return { tone: "neutral" as const, label: p.status }
  }
}

export function PiecesPanel({ requestRef, pieces, readOnly }: Props) {
  const [viewing, setViewing] = useState<Piece | null>(null)
  const [rejecting, setRejecting] = useState<Piece | null>(null)

  return (
    <>
      <ul
        aria-label="Pièces justificatives"
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
        }}
      >
        {pieces.length === 0 && (
          <li
            style={{
              padding: 14,
              fontSize: 13,
              color: "var(--ink-500)",
              textAlign: "center",
            }}
          >
            Aucune pièce attendue pour cette demande.
          </li>
        )}
        {pieces.map((p) => {
          const badge = statusBadge(p)
          return (
            <li
              key={p.id}
              style={{
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                borderBottom: "1px solid var(--ink-150)",
              }}
            >
              <Icon
                name="fileText"
                size={16}
                style={{ color: "var(--primary-500)", flexShrink: 0 }}
                aria-hidden="true"
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    display: "flex",
                    gap: 6,
                    alignItems: "center",
                  }}
                >
                  {p.label}
                  {p.required && (
                    <Badge tone="neutral" size="sm">
                      Obligatoire
                    </Badge>
                  )}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--ink-500)" }}>
                  {p.filename ?? "—"}
                  {p.sizeBytes ? ` · ${formatBytes(p.sizeBytes)}` : ""}
                  {typeof p.ocrConfidence === "number"
                    ? ` · OCR ${p.ocrConfidence}%`
                    : ""}
                </div>
                {p.rejectionReason && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--danger-700)",
                      marginTop: 4,
                    }}
                  >
                    Motif : {p.rejectionReason}
                  </div>
                )}
              </div>
              <Badge tone={badge.tone} size="sm">
                {badge.label}
              </Badge>
              <div style={{ display: "inline-flex", gap: 4 }}>
                {p.hasFile && (
                  <button
                    type="button"
                    onClick={() => setViewing(p)}
                    aria-label={`Voir ${p.label}`}
                    style={iconBtn}
                  >
                    <Icon name="eye" size={14} aria-hidden="true" />
                  </button>
                )}
                {!readOnly && p.status === "uploaded" && (
                  <>
                    <ValidateButton requestRef={requestRef} piece={p} />
                    <button
                      type="button"
                      onClick={() => setRejecting(p)}
                      aria-label={`Rejeter ${p.label}`}
                      style={{ ...iconBtn, color: "var(--danger-500)" }}
                    >
                      <Icon name="x" size={14} aria-hidden="true" />
                    </button>
                  </>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {viewing && (
        <PieceViewerDialog
          piece={viewing}
          onClose={() => setViewing(null)}
        />
      )}
      {rejecting && (
        <RejectPieceDialog
          requestRef={requestRef}
          piece={rejecting}
          onClose={() => setRejecting(null)}
        />
      )}
    </>
  )
}

/* ============================================================
   Bouton "Valider" inline
   ============================================================ */
function ValidateButton({
  requestRef,
  piece,
}: {
  requestRef: string
  piece: Piece
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  return (
    <button
      type="button"
      onClick={() =>
        startTransition(async () => {
          const res = await validatePieceAction(requestRef, piece.id)
          if (res.ok) router.refresh()
        })
      }
      disabled={pending}
      aria-label={`Valider ${piece.label}`}
      style={{ ...iconBtn, color: "var(--success-700)" }}
    >
      <Icon name="check" size={14} aria-hidden="true" />
    </button>
  )
}

/* ============================================================
   Viewer modal (iframe pour PDF, img pour image)
   ============================================================ */
function PieceViewerDialog({
  piece,
  onClose,
}: {
  piece: Piece
  onClose: () => void
}) {
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const [data, setData] = useState<
    | { state: "loading" }
    | { state: "loaded"; url: string | null; filename?: string; mimeType?: string }
    | { state: "error"; message: string }
  >({ state: "loading" })

  useEffect(() => {
    closeBtnRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    let cancelled = false
    getPieceViewUrlAction(piece.id).then((res) => {
      if (cancelled) return
      if (!res.ok) {
        setData({ state: "error", message: res.message ?? "Erreur." })
      } else {
        setData({
          state: "loaded",
          url: res.url ?? null,
          filename: res.filename,
          mimeType: res.mimeType,
        })
      }
    })
    return () => {
      cancelled = true
      window.removeEventListener("keydown", onKey)
    }
  }, [onClose, piece.id])

  const isImage = piece.mimeType?.startsWith("image/")
  const isPdf = piece.mimeType === "application/pdf"

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="piece-viewer-title"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
        padding: 24,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: 8,
          width: "min(960px, 100%)",
          height: "min(85vh, 760px)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 12px 36px rgba(0,0,0,.3)",
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 16px",
            borderBottom: "1px solid var(--ink-200)",
          }}
        >
          <div>
            <h2
              id="piece-viewer-title"
              style={{ fontSize: 14, fontWeight: 700, margin: 0 }}
            >
              {piece.label}
            </h2>
            <p style={{ fontSize: 12, color: "var(--ink-600)", margin: 0 }}>
              {piece.filename}
              {piece.sizeBytes ? ` · ${formatBytes(piece.sizeBytes)}` : ""}
            </p>
          </div>
          <div style={{ display: "inline-flex", gap: 8 }}>
            {data.state === "loaded" && data.url && (
              <a
                href={data.url}
                download={data.filename}
                style={{ textDecoration: "none" }}
              >
                <Button variant="secondary" size="sm" icon="download">
                  Télécharger
                </Button>
              </a>
            )}
            <button
              type="button"
              ref={closeBtnRef}
              onClick={onClose}
              aria-label="Fermer le viewer de pièce"
              style={iconBtn}
            >
              <Icon name="x" size={16} aria-hidden="true" />
            </button>
          </div>
        </header>
        <div
          style={{
            flex: 1,
            minHeight: 0,
            background: "var(--ink-100)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {data.state === "loading" ? (
            <span style={{ color: "var(--ink-500)" }} role="status">
              Chargement…
            </span>
          ) : data.state === "error" ? (
            <span style={{ color: "var(--danger-700)" }} role="alert">
              {data.message}
            </span>
          ) : !data.url ? (
            <span style={{ color: "var(--ink-500)" }} role="alert">
              Fichier indisponible.
            </span>
          ) : isPdf ? (
            <iframe
              src={data.url}
              title={`Aperçu de ${piece.label}`}
              style={{ width: "100%", height: "100%", border: 0 }}
            />
          ) : isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.url}
              alt={`Aperçu de ${piece.label}`}
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
              }}
            />
          ) : (
            <a
              href={data.url}
              download={data.filename}
              style={{ fontSize: 13 }}
            >
              Format non prévisualisable — télécharger le fichier
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   Dialog "Rejeter une pièce" avec motif obligatoire
   ============================================================ */
function RejectPieceDialog({
  requestRef,
  piece,
  onClose,
}: {
  requestRef: string
  piece: Piece
  onClose: () => void
}) {
  const router = useRouter()
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const firstInputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    firstInputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const handle = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await rejectPieceAction(requestRef, piece.id, reason)
      if (res.ok) {
        onClose()
        router.refresh()
      } else {
        setError(res.message ?? "Erreur.")
      }
    })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reject-piece-title"
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
    >
      <form
        onSubmit={handle}
        style={{
          background: "white",
          borderRadius: 10,
          padding: 20,
          width: "min(440px, 100%)",
          boxShadow: "0 10px 30px rgba(0,0,0,.2)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <h2 id="reject-piece-title" style={{ fontSize: 16, margin: 0 }}>
          Rejeter « {piece.label} »
        </h2>
        <p style={{ fontSize: 13, color: "var(--ink-600)", margin: 0 }}>
          Le citoyen recevra le motif et pourra téléverser un nouveau document.
        </p>
        <label htmlFor="reject-reason" style={{ fontSize: 13, fontWeight: 600 }}>
          Motif{" "}
          <span style={{ color: "var(--danger-500)" }} aria-hidden="true">
            *
          </span>
          <span className="sr-only"> (obligatoire)</span>
        </label>
        <textarea
          id="reject-reason"
          ref={firstInputRef}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          required
          aria-required="true"
          style={{
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
              padding: 8,
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
          style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}
        >
          <Button
            variant="ghost"
            type="button"
            onClick={onClose}
            disabled={pending}
          >
            Annuler
          </Button>
          <Button type="submit" variant="danger" disabled={pending}>
            {pending ? "Rejet…" : "Rejeter la pièce"}
          </Button>
        </div>
      </form>
    </div>
  )
}

const iconBtn = {
  width: 28,
  height: 28,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid var(--ink-200)",
  borderRadius: 4,
  background: "white",
  cursor: "pointer",
  padding: 0,
  color: "var(--ink-700)",
} as const
