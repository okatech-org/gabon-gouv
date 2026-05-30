"use client"

/**
 * ThreadView — composant central d'affichage d'une correspondance.
 *
 * Réutilisé entre :
 *   - colonne 2 de /correspondance (vue liste + thread)
 *   - page deep-link /correspondance/[ref]
 *   - (futur) page citoyen équivalente
 *
 * Affiche :
 *   - header avec sujet, ref, badges (urgent, kind, confidentialité, status)
 *   - boutons d'action contextuels (Approuver/Refuser AR, Répondre, Rappeler,
 *     Archiver, Clôturer)
 *   - liste des messages chronologique (avatar, expéditeur, badge S/MIME, body, PJ)
 *   - composer en bas (réponse, signature implicite)
 *
 * RGAA :
 *   - main <article aria-labelledby> pour le thread
 *   - messages dans <ol> ordonné
 *   - statuts par texte + icône + couleur (jamais que la couleur)
 *   - dialogs (recall, ack, etc.) via hook useModalA11y
 *   - région live persistante pour le feedback
 */

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Icon,
  type IconName,
  useModalA11y,
} from "@workspace/ui"
import {
  acknowledgeAction,
  archiveAction,
  closeAction,
  markReadAction,
  recallAction,
  replyAction,
  sendDirectAction,
  submitForSignatureAction,
} from "./actions"

/* ============================================================
   Types
   ============================================================ */

interface Recipient {
  id: string
  role: "to" | "cc" | "bcc"
  kind: "organism" | "citizen" | "external" | "platform"
  name: string
  email?: string
  firstReadAt?: number
}

interface Message {
  id: string
  fromKind: "agent" | "citizen" | "system"
  authorName: string | null
  authorOrg: string | null
  body: string
  bodyFormat?: "plain" | "markdown"
  signed: boolean
  signatureAlgorithm?: string
  sentAt: number
  isSystem?: boolean
}

interface Attachment {
  id: string
  filename: string
  mimeType: string
  sizeBytes: number
  kind: "document" | "external"
  signed: boolean
}

interface CircuitStep {
  order: number
  assigneeRole: string
  assigneeName: string
  status: string
  decidedAt?: number
  comment?: string
}

export interface ThreadData {
  ref: string
  subject: string
  kind?: string
  body: string
  urgent: boolean
  confidentiality: string
  status: string
  sentAt?: number
  dueAckAt?: number
  dueReplyAt?: number
  duaCode?: string
  threadId?: string
  parent: { ref: string; subject: string } | null
  from: string
  isSender: boolean
  recipients: Recipient[]
  messages: Message[]
  attachments: Attachment[]
  acks: { ackedAt: number; note?: string }[]
  circuit: { id: string; status: string; steps: CircuitStep[] } | null
  viewerAgentId: string
  linkedRequestIds: string[]
  linkedCitizenIds: string[]
  linkedDocumentIds: string[]
}

interface Props {
  thread: ThreadData
  /** Id Convex du document corres (pour les server actions qui prennent l'Id). */
  correspondenceId: string
}

/* ============================================================
   Composant principal
   ============================================================ */

export function ThreadView({ thread, correspondenceId }: Props) {
  const router = useRouter()
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(
    null,
  )

  // Mark read au mount (idempotent)
  useEffect(() => {
    void markReadAction(correspondenceId)
  }, [correspondenceId])

  const status = thread.status
  const isDraft = status === "draft"
  const isPendingSign = status === "pending_signature"
  const isSent =
    status === "sent" || status === "acknowledged" || status === "replied"
  const isClosed = status === "closed" || status === "archived"
  const isRecalled = status === "recalled"

  // Capacités contextuelles
  const canAck =
    !thread.isSender &&
    isSent &&
    !thread.acks.some((a) => a.ackedAt > 0) &&
    !!thread.recipients.find((r) => r.role === "to")
  const canReply = isSent && !isRecalled
  const canRecall = thread.isSender && (status === "sent")
  const canClose = !isClosed && !isRecalled && (isSent)
  const canArchive = thread.isSender && (status === "closed")
  const canSendDraft = thread.isSender && isDraft
  const canSubmitSig = thread.isSender && isDraft

  return (
    <article
      aria-labelledby="thread-subject"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "white",
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: "16px 24px",
          borderBottom: "1px solid var(--ink-200)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2
              id="thread-subject"
              style={{
                fontSize: 17,
                fontWeight: 700,
                margin: 0,
                marginBottom: 6,
              }}
            >
              {thread.subject}
            </h2>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                color: "var(--ink-600)",
                flexWrap: "wrap",
              }}
            >
              <span style={{ fontFamily: "var(--font-mono)" }}>
                {thread.ref}
              </span>
              <StatusBadge status={status} />
              {thread.urgent && (
                <Badge tone="danger" size="sm" icon="alertTriangle">
                  Urgent
                </Badge>
              )}
              <ConfidentialityBadge level={thread.confidentiality} />
              {thread.kind && <KindBadge kind={thread.kind} />}
              {thread.parent && (
                <span>
                  · Réponse à{" "}
                  <a
                    href={`/correspondance/${thread.parent.ref}`}
                    style={{ color: "var(--primary-600)" }}
                  >
                    {thread.parent.ref}
                  </a>
                </span>
              )}
            </div>
          </div>
          {/* Actions header */}
          <div style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
            {canAck && (
              <AckButton
                correspondenceId={correspondenceId}
                onResult={setFeedback}
              />
            )}
            {canSubmitSig && (
              <SubmitForSigButton
                correspondenceId={correspondenceId}
                onResult={setFeedback}
              />
            )}
            {canSendDraft && (
              <SendDirectButton
                correspondenceId={correspondenceId}
                onResult={setFeedback}
              />
            )}
            {canRecall && (
              <RecallButton
                correspondenceId={correspondenceId}
                onResult={setFeedback}
              />
            )}
            {canClose && (
              <CloseButton
                correspondenceId={correspondenceId}
                onResult={setFeedback}
              />
            )}
            {canArchive && (
              <ArchiveButton
                correspondenceId={correspondenceId}
                onResult={setFeedback}
              />
            )}
          </div>
        </div>
      </header>

      {/* Liste des messages */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "16px 24px",
          background: "var(--ink-50)",
        }}
      >
        <ol
          aria-label="Messages du fil"
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {thread.messages.map((m) => (
            <li key={m.id}>
              <MessageCard message={m} />
            </li>
          ))}
        </ol>

        {/* Pièces jointes globales (non liées à un message spécifique) */}
        {thread.attachments.length > 0 && (
          <section
            aria-labelledby="attachments-heading"
            style={{ marginTop: 24 }}
          >
            <h3
              id="attachments-heading"
              style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}
            >
              Pièces jointes ({thread.attachments.length})
            </h3>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {thread.attachments.map((a) => (
                <li
                  key={a.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: 8,
                    background: "white",
                    border: "1px solid var(--ink-200)",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                >
                  <Icon name="paperclip" size={14} aria-hidden="true" />
                  <span style={{ flex: 1 }}>{a.filename}</span>
                  <span style={{ color: "var(--ink-500)" }}>
                    {formatBytes(a.sizeBytes)}
                  </span>
                  {a.kind === "document" && (
                    <Badge tone="info" size="sm">
                      Acte officiel
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* Composer */}
      {canReply && (
        <ReplyComposer
          correspondenceId={correspondenceId}
          onResult={setFeedback}
        />
      )}

      {/* Région live persistante pour le feedback (RGAA 7.5) */}
      <div
        role={feedback?.ok === false ? "alert" : "status"}
        aria-live={feedback?.ok === false ? "assertive" : "polite"}
        aria-atomic="true"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 50,
          maxWidth: 380,
        }}
      >
        {feedback && (
          <Alert tone={feedback.ok ? "success" : "danger"}>
            {feedback.msg}
          </Alert>
        )}
      </div>

      {/* refresh after action */}
      <RefreshOnFeedback feedback={feedback} router={router} />
    </article>
  )
}

function RefreshOnFeedback({
  feedback,
  router,
}: {
  feedback: { ok: boolean; msg: string } | null
  router: ReturnType<typeof useRouter>
}) {
  useEffect(() => {
    if (feedback?.ok) router.refresh()
  }, [feedback, router])
  return null
}

/* ============================================================
   Sub-composants
   ============================================================ */

function MessageCard({ message }: { message: Message }) {
  if (message.isSystem) {
    return (
      <div
        style={{
          padding: 10,
          background: "var(--ink-100)",
          border: "1px dashed var(--ink-300)",
          borderRadius: 6,
          fontSize: 12.5,
          color: "var(--ink-700)",
          fontStyle: "italic",
        }}
      >
        <Icon
          name="info"
          size={12}
          aria-hidden="true"
          style={{ verticalAlign: "middle", marginRight: 4 }}
        />
        {message.body}
        <span style={{ color: "var(--ink-500)", marginLeft: 8 }}>
          {formatDateTime(message.sentAt)}
        </span>
      </div>
    )
  }
  return (
    <article
      style={{
        background: "white",
        border: "1px solid var(--ink-200)",
        borderRadius: 8,
        padding: 16,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 10,
        }}
      >
        <Avatar name={message.authorName ?? "?"} tone="primary" size={32} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>
            {message.authorName ?? "—"}
            {message.authorOrg && (
              <span style={{ color: "var(--ink-500)", fontWeight: 500 }}>
                {" · "}
                {message.authorOrg}
              </span>
            )}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--ink-600)" }}>
            {formatDateTime(message.sentAt)}
          </div>
        </div>
        {message.signed && (
          <Badge tone="success" size="sm" icon="shieldCheck">
            Signé S/MIME
          </Badge>
        )}
      </header>
      <div
        style={{
          fontSize: 14,
          color: "var(--ink-800)",
          lineHeight: 1.65,
          whiteSpace: "pre-wrap",
        }}
      >
        {message.body}
      </div>
    </article>
  )
}

/* ============================================================
   Boutons d'action
   ============================================================ */

function AckButton({
  correspondenceId,
  onResult,
}: {
  correspondenceId: string
  onResult: (f: { ok: boolean; msg: string }) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        variant="success"
        size="sm"
        icon="check"
        onClick={() => setOpen(true)}
      >
        Accuser réception
      </Button>
      {open && (
        <AckDialog
          correspondenceId={correspondenceId}
          onClose={() => setOpen(false)}
          onResult={onResult}
        />
      )}
    </>
  )
}

function AckDialog({
  correspondenceId,
  onClose,
  onResult,
}: {
  correspondenceId: string
  onClose: () => void
  onResult: (f: { ok: boolean; msg: string }) => void
}) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const noteRef = useRef<HTMLTextAreaElement>(null)
  const [pending, startTransition] = useTransition()
  const [note, setNote] = useState("")
  useModalA11y({ containerRef: dialogRef, initialFocusRef: noteRef, onClose })

  const handle = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    startTransition(async () => {
      const res = await acknowledgeAction(correspondenceId, note)
      if (res.ok) {
        onResult({ ok: true, msg: res.message ?? "OK" })
        onClose()
      } else {
        onResult({ ok: false, msg: res.message ?? "Erreur" })
      }
    })
  }
  return (
    <DialogShell ref={dialogRef} title="Accuser réception" onClose={onClose}>
      <form onSubmit={handle}>
        <p style={{ fontSize: 13, color: "var(--ink-600)" }}>
          Vous confirmez avoir reçu cette correspondance. Ce geste démarre
          formellement le délai de réponse applicable.
        </p>
        <label htmlFor="ack-note" style={fieldLabel}>
          Note (optionnelle)
        </label>
        <textarea
          id="ack-note"
          ref={noteRef}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          style={fieldInput}
        />
        <DialogFooter onClose={onClose} pending={pending} cta="Accuser réception" />
      </form>
    </DialogShell>
  )
}

function SubmitForSigButton({
  correspondenceId,
  onResult,
}: {
  correspondenceId: string
  onResult: (f: { ok: boolean; msg: string }) => void
}) {
  const [pending, startTransition] = useTransition()
  return (
    <Button
      variant="primary"
      size="sm"
      icon="shieldCheck"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await submitForSignatureAction(correspondenceId)
          onResult({
            ok: res.ok,
            msg: res.message ?? (res.ok ? "OK" : "Erreur"),
          })
        })
      }
    >
      {pending ? "…" : "Demander visa"}
    </Button>
  )
}

function SendDirectButton({
  correspondenceId,
  onResult,
}: {
  correspondenceId: string
  onResult: (f: { ok: boolean; msg: string }) => void
}) {
  const [pending, startTransition] = useTransition()
  return (
    <Button
      variant="success"
      size="sm"
      iconRight="arrowRight"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await sendDirectAction(correspondenceId)
          onResult({
            ok: res.ok,
            msg: res.message ?? (res.ok ? "OK" : "Erreur"),
          })
        })
      }
    >
      {pending ? "Envoi…" : "Envoyer"}
    </Button>
  )
}

function RecallButton({
  correspondenceId,
  onResult,
}: {
  correspondenceId: string
  onResult: (f: { ok: boolean; msg: string }) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        variant="danger"
        size="sm"
        icon="alertTriangle"
        onClick={() => setOpen(true)}
      >
        Rappeler
      </Button>
      {open && (
        <RecallDialog
          correspondenceId={correspondenceId}
          onClose={() => setOpen(false)}
          onResult={onResult}
        />
      )}
    </>
  )
}

function RecallDialog({
  correspondenceId,
  onClose,
  onResult,
}: {
  correspondenceId: string
  onClose: () => void
  onResult: (f: { ok: boolean; msg: string }) => void
}) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [reason, setReason] = useState("")
  const [pending, startTransition] = useTransition()
  useModalA11y({ containerRef: dialogRef, initialFocusRef: inputRef, onClose })

  const handle = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    startTransition(async () => {
      const res = await recallAction(correspondenceId, reason)
      if (res.ok) {
        onResult({ ok: true, msg: res.message ?? "OK" })
        onClose()
      } else {
        onResult({ ok: false, msg: res.message ?? "Erreur" })
      }
    })
  }

  return (
    <DialogShell ref={dialogRef} title="Rappeler ce courrier" onClose={onClose}>
      <form onSubmit={handle}>
        <p style={{ fontSize: 13, color: "var(--ink-600)" }}>
          Le courrier sera marqué <strong>rappelé</strong>. Les destinataires
          recevront une notification de rappel. Cette action est impossible si
          un accusé de réception a déjà été enregistré.
        </p>
        <label htmlFor="recall-reason" style={fieldLabel}>
          Motif{" "}
          <span style={{ color: "var(--danger-500)" }} aria-hidden="true">
            *
          </span>
          <span className="sr-only"> (obligatoire)</span>
        </label>
        <textarea
          id="recall-reason"
          ref={inputRef}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
          aria-required="true"
          rows={3}
          style={fieldInput}
        />
        <DialogFooter onClose={onClose} pending={pending} cta="Confirmer le rappel" danger />
      </form>
    </DialogShell>
  )
}

function CloseButton({
  correspondenceId,
  onResult,
}: {
  correspondenceId: string
  onResult: (f: { ok: boolean; msg: string }) => void
}) {
  const [pending, startTransition] = useTransition()
  return (
    <Button
      variant="ghost"
      size="sm"
      icon="check"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await closeAction(correspondenceId)
          onResult({ ok: res.ok, msg: res.message ?? "OK" })
        })
      }
    >
      Clôturer
    </Button>
  )
}

function ArchiveButton({
  correspondenceId,
  onResult,
}: {
  correspondenceId: string
  onResult: (f: { ok: boolean; msg: string }) => void
}) {
  const [pending, startTransition] = useTransition()
  return (
    <Button
      variant="ghost"
      size="sm"
      icon="archive"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await archiveAction(correspondenceId)
          onResult({ ok: res.ok, msg: res.message ?? "OK" })
        })
      }
    >
      Archiver
    </Button>
  )
}

function ReplyComposer({
  correspondenceId,
  onResult,
}: {
  correspondenceId: string
  onResult: (f: { ok: boolean; msg: string }) => void
}) {
  const [body, setBody] = useState("")
  const [pending, startTransition] = useTransition()
  const handle = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!body.trim()) return
    startTransition(async () => {
      const res = await replyAction(correspondenceId, body)
      if (res.ok) {
        setBody("")
        onResult({ ok: true, msg: res.message ?? "OK" })
      } else {
        onResult({ ok: false, msg: res.message ?? "Erreur" })
      }
    })
  }
  return (
    <form
      onSubmit={handle}
      style={{
        borderTop: "1px solid var(--ink-200)",
        padding: 16,
        background: "white",
      }}
    >
      <label htmlFor="reply-body" className="sr-only">
        Rédiger une réponse
      </label>
      <textarea
        id="reply-body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Rédiger une réponse…"
        rows={3}
        style={{
          width: "100%",
          padding: 10,
          fontSize: 13.5,
          border: "1px solid var(--ink-300)",
          borderRadius: 6,
          fontFamily: "inherit",
          resize: "vertical",
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 10,
        }}
      >
        <Badge tone="info" size="sm" icon="shieldCheck">
          Signature S/MIME automatique
        </Badge>
        <div style={{ flex: 1 }} />
        <Button
          type="submit"
          size="sm"
          iconRight="arrowRight"
          disabled={pending || !body.trim()}
        >
          {pending ? "Envoi…" : "Envoyer la réponse"}
        </Button>
      </div>
    </form>
  )
}

/* ============================================================
   Dialog shell (réutilisé)
   ============================================================ */

const DialogShell = (() => {
  return function DialogShellInner({
    children,
    title,
    onClose,
    ref,
  }: {
    children: React.ReactNode
    title: string
    onClose: () => void
    ref?: React.RefObject<HTMLDivElement | null>
  }) {
    const innerRef = useRef<HTMLDivElement>(null)
    const dialogRef = ref ?? innerRef
    return (
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        style={overlayStyle}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
      >
        <div style={dialogStyle}>
          <h2 id="dialog-title" style={{ fontSize: 16, margin: 0 }}>
            {title}
          </h2>
          {children}
        </div>
      </div>
    )
  }
})()

function DialogFooter({
  onClose,
  pending,
  cta,
  danger,
}: {
  onClose: () => void
  pending: boolean
  cta: string
  danger?: boolean
}) {
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
      <Button variant="ghost" type="button" onClick={onClose} disabled={pending}>
        Annuler
      </Button>
      <Button
        type="submit"
        variant={danger ? "danger" : "primary"}
        disabled={pending}
      >
        {pending ? "…" : cta}
      </Button>
    </div>
  )
}

/* ============================================================
   Badges spécialisés
   ============================================================ */

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { tone: "neutral" | "info" | "warning" | "success" | "danger"; label: string; icon: IconName }> = {
    draft: { tone: "neutral", label: "Brouillon", icon: "edit" },
    pending_signature: { tone: "warning", label: "En attente de visa", icon: "clock" },
    sent: { tone: "info", label: "Envoyé", icon: "arrowRight" },
    acknowledged: { tone: "info", label: "Reçu", icon: "check" },
    replied: { tone: "success", label: "Répondu", icon: "messageCircle" },
    closed: { tone: "neutral", label: "Clôturé", icon: "check" },
    archived: { tone: "neutral", label: "Archivé", icon: "archive" },
    recalled: { tone: "danger", label: "Rappelé", icon: "alertTriangle" },
  }
  const m = map[status] ?? { tone: "neutral" as const, label: status, icon: "info" as IconName }
  return (
    <Badge tone={m.tone} size="sm" icon={m.icon}>
      {m.label}
    </Badge>
  )
}

function ConfidentialityBadge({ level }: { level: string }) {
  const tone =
    level === "secret"
      ? "danger"
      : level === "confidential"
        ? "warning"
        : level === "restricted"
          ? "info"
          : "neutral"
  const label =
    level === "secret"
      ? "Secret"
      : level === "confidential"
        ? "Confidentiel"
        : level === "restricted"
          ? "Restreint"
          : "Public"
  return (
    <Badge tone={tone} size="sm" icon="lock">
      {label}
    </Badge>
  )
}

function KindBadge({ kind }: { kind: string }) {
  // Famille → couleur
  const family =
    kind.startsWith("decision_")
      ? { tone: "danger" as const, label: "Décision" }
      : kind.startsWith("instruction_")
        ? { tone: "info" as const, label: "Instruction" }
        : kind.startsWith("cooperation_")
          ? { tone: "success" as const, label: "Coopération" }
          : kind.startsWith("escalation_")
            ? { tone: "warning" as const, label: "Saisine" }
            : kind.startsWith("internal_")
              ? { tone: "neutral" as const, label: "Interne" }
              : kind.startsWith("protocol_")
                ? { tone: "neutral" as const, label: "Protocole" }
                : { tone: "neutral" as const, label: "Autre" }
  return (
    <Badge tone={family.tone} size="sm">
      {family.label}
    </Badge>
  )
}

/* ============================================================
   Styles + helpers
   ============================================================ */

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 200,
  padding: 16,
}

const dialogStyle: React.CSSProperties = {
  background: "white",
  borderRadius: 10,
  padding: 20,
  width: "min(480px, 100%)",
  boxShadow: "0 10px 30px rgba(0,0,0,.2)",
  display: "flex",
  flexDirection: "column",
  gap: 12,
}

const fieldLabel: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 6,
  marginTop: 8,
}

const fieldInput: React.CSSProperties = {
  width: "100%",
  padding: 8,
  fontSize: 13,
  border: "1px solid var(--ink-300)",
  borderRadius: 6,
  fontFamily: "inherit",
  resize: "vertical",
}

function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} Mo`
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(0)} Ko`
  return `${bytes} o`
}

function formatDateTime(ms: number): string {
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
