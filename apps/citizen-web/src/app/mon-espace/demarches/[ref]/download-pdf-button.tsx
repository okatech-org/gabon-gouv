"use client"

/**
 * Bouton "Télécharger l'acte" côté citoyen.
 *
 * 3 états :
 *   1. Demande pas encore émise → bouton désactivé "En attente d'émission"
 *   2. Émise mais PDF en cours → bouton "PDF en préparation (réessayer)"
 *      qui re-fetch
 *   3. Émise + PDF disponible → bouton actif qui ouvre le PDF en nouvel onglet
 *
 * Affiche aussi un bandeau "Vérifier l'authenticité" (placeholder Bloc 4)
 * avec le code de vérification quand disponible.
 */

import { useEffect, useState, useTransition } from "react"
import { Alert, Button, Icon } from "@workspace/ui"
import { getMyPdfUrlAction } from "./actions"

interface Props {
  requestRef: string
  /** Status de la demande (issued, in_instruction, etc.) */
  status: string
}

export function DownloadPdfButton({ requestRef, status }: Props) {
  const [pending, startTransition] = useTransition()
  const [info, setInfo] = useState<{
    url: string | null
    actNumber?: string
    verificationCode?: string | null
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isIssued = status === "issued"

  // Au mount, si la demande est émise, on précharge l'info (pour afficher
  // le code de vérification + le bouton actif).
  useEffect(() => {
    if (!isIssued) return
    let cancelled = false
    getMyPdfUrlAction(requestRef).then((res) => {
      if (cancelled) return
      if (res.ok) {
        setInfo({
          url: res.url ?? null,
          actNumber: res.actNumber,
          verificationCode: res.verificationCode,
        })
      } else {
        setError(res.message ?? "Erreur.")
      }
    })
    return () => {
      cancelled = true
    }
  }, [requestRef, isIssued])

  const refetch = () => {
    setError(null)
    startTransition(async () => {
      const res = await getMyPdfUrlAction(requestRef)
      if (res.ok) {
        setInfo({
          url: res.url ?? null,
          actNumber: res.actNumber,
          verificationCode: res.verificationCode,
        })
        if (res.url) {
          window.open(res.url, "_blank", "noopener,noreferrer")
        }
      } else {
        setError(res.message ?? "Erreur.")
      }
    })
  }

  if (!isIssued) {
    return (
      <Button
        variant="outline"
        icon="clock"
        disabled
        style={{ width: "100%", justifyContent: "flex-start" }}
        aria-describedby="download-help"
      >
        Acte non encore émis
      </Button>
    )
  }

  const ready = info?.url !== null && info?.url !== undefined

  return (
    <>
      <Button
        variant={ready ? "primary" : "outline"}
        icon="download"
        onClick={refetch}
        disabled={pending}
        style={{ width: "100%", justifyContent: "flex-start" }}
        aria-describedby="download-help"
      >
        {pending
          ? "Chargement…"
          : ready
            ? "Télécharger l'acte"
            : "PDF en préparation — réessayer"}
      </Button>
      <p
        id="download-help"
        style={{
          fontSize: 11,
          color: "var(--ink-500)",
          margin: "6px 0 0",
        }}
      >
        {ready
          ? "Le PDF officiel s'ouvrira dans un nouvel onglet."
          : "Le PDF est généré automatiquement après émission ; cela prend quelques secondes."}
      </p>
      {error && (
        <div style={{ marginTop: 8 }}>
          <Alert tone="danger">{error}</Alert>
        </div>
      )}

      {/* Bandeau vérification d'authenticité — placeholder Bloc 4 */}
      {info?.verificationCode && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            background: "var(--primary-50)",
            border: "1px solid var(--primary-200)",
            borderRadius: 6,
            fontSize: 12,
          }}
        >
          <div
            style={{
              fontWeight: 700,
              color: "var(--primary-700)",
              marginBottom: 4,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Icon name="shieldCheck" size={12} aria-hidden="true" />
            Vérifier l&apos;authenticité
          </div>
          <p style={{ margin: "0 0 6px", color: "var(--ink-700)" }}>
            Code de vérification :{" "}
            <strong style={{ fontFamily: "var(--font-mono)" }}>
              {info.verificationCode}
            </strong>
          </p>
          <p style={{ margin: 0, color: "var(--ink-600)", fontSize: 11 }}>
            La vérification publique sera disponible prochainement sur
            gabon.connect/verifier/{info.verificationCode}.
          </p>
        </div>
      )}
    </>
  )
}
