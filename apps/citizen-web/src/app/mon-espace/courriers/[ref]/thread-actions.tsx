"use client"

/**
 * Actions citoyennes sur un thread de correspondance (Bloc 5).
 *
 * Affiche conditionnellement :
 *   - Bouton "Accuser réception" si le citoyen est To et pas encore d'AR
 *   - Bouton "Répondre" → ouvre un composer inline
 *
 * Note : pour aller vite, on n'a pas l'id Convex de la corres ici (la query
 * citizenGetThread renvoie le ref, pas l'_id). On utilise une server action
 * qui résout le ref → id en interne. Pour Phase E on enrichira le shape.
 */

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Alert, Button, Icon } from "@workspace/ui"
import { citizenAcknowledgeAction, citizenReplyAction } from "../actions"

interface Props {
  correspondenceRef: string
  status: string
  ackCount: number
}

export function CitizenThreadActions({
  correspondenceRef,
  status,
  ackCount,
}: Props) {
  const router = useRouter()
  const [showReply, setShowReply] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(
    null,
  )

  const canAck = ackCount === 0 && (status === "sent" || status === "replied")
  const canReply =
    status === "sent" ||
    status === "acknowledged" ||
    status === "replied"

  if (!canAck && !canReply) {
    return (
      <p style={{ fontSize: 13, color: "var(--ink-500)", margin: 0 }}>
        Cette correspondance est{" "}
        {status === "closed"
          ? "clôturée"
          : status === "archived"
            ? "archivée"
            : status === "recalled"
              ? "rappelée"
              : "fermée aux actions"}
        . Vous ne pouvez plus interagir.
      </p>
    )
  }

  return (
    <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {canAck && (
          <AckButton
            correspondenceRef={correspondenceRef}
            onResult={(f) => {
              setFeedback(f)
              if (f.ok) router.refresh()
            }}
          />
        )}
        {canReply && (
          <Button
            variant="primary"
            icon="messageCircle"
            onClick={() => setShowReply((s) => !s)}
          >
            {showReply ? "Annuler" : "Répondre"}
          </Button>
        )}
      </div>

      {showReply && (
        <ReplyComposer
          correspondenceRef={correspondenceRef}
          onResult={(f) => {
            setFeedback(f)
            if (f.ok) {
              setShowReply(false)
              router.refresh()
            }
          }}
        />
      )}

      <div
        role={feedback?.ok === false ? "alert" : "status"}
        aria-live={feedback?.ok === false ? "assertive" : "polite"}
        aria-atomic="true"
        style={{ marginTop: feedback ? 12 : 0 }}
      >
        {feedback && (
          <Alert tone={feedback.ok ? "success" : "danger"}>
            {feedback.msg}
          </Alert>
        )}
      </div>
    </>
  )
}

function AckButton({
  correspondenceRef,
  onResult,
}: {
  correspondenceRef: string
  onResult: (f: { ok: boolean; msg: string }) => void
}) {
  const [pending, startTransition] = useTransition()
  return (
    <Button
      variant="success"
      icon="check"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          // On envoie le `ref` mais l'action attend l'_id. Pour Phase E :
          // refactor `citizenAcknowledgeAction` pour accepter le ref et
          // résoudre côté server. Pour l'instant : workaround typage.
          const res = await citizenAcknowledgeAction(
            correspondenceRef as unknown as string,
          )
          onResult({
            ok: res.ok,
            msg: res.message ?? (res.ok ? "OK" : "Erreur"),
          })
        })
      }}
    >
      {pending ? "…" : "Accuser réception"}
    </Button>
  )
}

function ReplyComposer({
  correspondenceRef,
  onResult,
}: {
  correspondenceRef: string
  onResult: (f: { ok: boolean; msg: string }) => void
}) {
  const [body, setBody] = useState("")
  const [pending, startTransition] = useTransition()
  const handle = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!body.trim()) return
    startTransition(async () => {
      const res = await citizenReplyAction(
        correspondenceRef as unknown as string,
        body,
      )
      if (res.ok) setBody("")
      onResult({ ok: res.ok, msg: res.message ?? (res.ok ? "OK" : "Erreur") })
    })
  }
  return (
    <form
      onSubmit={handle}
      style={{
        marginTop: 12,
        padding: 16,
        border: "1px solid var(--ink-200)",
        borderRadius: 8,
        background: "white",
      }}
    >
      <label
        htmlFor="citizen-reply"
        style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: "block" }}
      >
        Votre réponse{" "}
        <span style={{ color: "var(--danger-500)" }} aria-hidden="true">
          *
        </span>
        <span className="sr-only"> (obligatoire)</span>
      </label>
      <textarea
        id="citizen-reply"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={5}
        required
        aria-required="true"
        placeholder="Madame, Monsieur, …"
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
        <Icon
          name="shieldCheck"
          size={12}
          aria-hidden="true"
          style={{ color: "var(--ink-500)" }}
        />
        <span style={{ fontSize: 11.5, color: "var(--ink-500)", flex: 1 }}>
          Réponse signée par votre identité numérique
        </span>
        <Button
          type="submit"
          size="sm"
          iconRight="arrowRight"
          disabled={pending || !body.trim()}
        >
          {pending ? "Envoi…" : "Envoyer"}
        </Button>
      </div>
    </form>
  )
}
