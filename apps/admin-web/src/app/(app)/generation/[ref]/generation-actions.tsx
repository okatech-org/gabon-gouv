"use client"

/**
 * Barre d'actions de la page /generation.
 *
 * 3 états :
 *   1. Pas encore émis ET service à signature simple → bouton "Signer & émettre"
 *   2. Pas encore émis mais circuit multi-étapes → bouton "Aller à la demande"
 *      (l'instructeur doit utiliser prepareDocument depuis /demandes/[ref])
 *   3. Déjà émis → bouton "Télécharger le PDF" + lien vers page demande
 */

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Alert, Badge, Button } from "@workspace/ui"
import { getPdfUrlAction, signAndEmitAction } from "./actions"

interface Props {
  requestRef: string
  hasMultiStepCircuit: boolean
  status: string
  document: {
    id: string
    actNumber: string
    status?: string
    verificationCode?: string
    hasPdf: boolean
  } | null
}

export function GenerationActions({
  requestRef,
  hasMultiStepCircuit,
  status,
  document: doc,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null)

  const isIssued = doc && (doc.status === "issued" || status === "issued")

  const sign = () => {
    setFeedback(null)
    startTransition(async () => {
      const res = await signAndEmitAction(requestRef)
      setFeedback({
        ok: res.ok,
        message: res.message ?? (res.ok ? "OK" : "Erreur"),
      })
      if (res.ok) router.refresh()
    })
  }

  const downloadPdf = () => {
    if (!doc) return
    startTransition(async () => {
      const res = await getPdfUrlAction(doc.id)
      if (res.ok && res.url) {
        window.open(res.url, "_blank", "noopener,noreferrer")
      } else {
        setFeedback({
          ok: false,
          message: res.message ?? "PDF en cours de génération — réessayez dans un instant.",
        })
      }
    })
  }

  return (
    <>
      <div style={{ display: "inline-flex", gap: 8 }}>
        {isIssued ? (
          <>
            <Badge tone="success" icon="check">
              Émis · {doc?.actNumber}
            </Badge>
            <Button
              variant="primary"
              icon="download"
              onClick={downloadPdf}
              disabled={pending || !doc?.hasPdf}
            >
              {pending
                ? "…"
                : doc?.hasPdf
                  ? "Télécharger le PDF"
                  : "PDF en cours de génération"}
            </Button>
            <Link
              href={`/demandes/${requestRef}`}
              style={{ textDecoration: "none" }}
            >
              <Button variant="ghost" iconRight="externalLink">
                Voir la demande
              </Button>
            </Link>
          </>
        ) : hasMultiStepCircuit ? (
          <Link
            href={`/demandes/${requestRef}`}
            style={{ textDecoration: "none" }}
          >
            <Button variant="primary" iconRight="externalLink">
              Préparer l&apos;acte sur la demande
            </Button>
          </Link>
        ) : (
          <Button
            variant="success"
            icon="shieldCheck"
            onClick={sign}
            disabled={pending}
          >
            {pending ? "Signature…" : "Signer & émettre"}
          </Button>
        )}
      </div>
      {feedback && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 50,
            maxWidth: 380,
          }}
        >
          <Alert tone={feedback.ok ? "success" : "danger"}>
            {feedback.message}
          </Alert>
        </div>
      )}
    </>
  )
}
