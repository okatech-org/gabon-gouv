"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@workspace/ui"
import {
  duplicateServiceAction,
  publishServiceAction,
  unpublishServiceAction,
} from "../actions"

interface Props {
  slug: string
  status: string
  title: string
  checklist: { ready: boolean; missing: string[] }
}

export function ServiceLifecycleActions({
  slug,
  status,
  title,
  checklist,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const run = (
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
    <div style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
      {error && (
        <span
          role="alert"
          style={{
            fontSize: 12,
            color: "var(--danger-700)",
            maxWidth: 260,
          }}
        >
          {error}
        </span>
      )}

      <Button
        variant="ghost"
        icon="copy"
        onClick={() =>
          run(
            () => duplicateServiceAction(slug),
            `Créer une copie de « ${title} » ?`,
          )
        }
        disabled={pending}
        aria-label="Dupliquer ce service"
      >
        Dupliquer
      </Button>

      {status === "draft" && (
        <Button
          icon="checkCircle"
          onClick={() => run(() => publishServiceAction(slug))}
          disabled={pending || !checklist.ready}
          aria-label={
            checklist.ready
              ? "Publier ce service"
              : `Publication bloquée — ${checklist.missing.length} prérequis manquants`
          }
          aria-describedby={
            checklist.ready ? undefined : "publication-blocked"
          }
        >
          {checklist.ready ? "Publier" : "Publier (bloqué)"}
        </Button>
      )}
      {!checklist.ready && status === "draft" && (
        <span id="publication-blocked" className="sr-only">
          {checklist.missing.length} prérequis manquants — voir la bannière
          ci-dessous.
        </span>
      )}

      {status === "published" && (
        <Button
          variant="outline"
          icon="refresh"
          onClick={() =>
            run(
              () => unpublishServiceAction(slug),
              `Repasser « ${title} » en brouillon ?\nLe service ne sera plus visible au public.`,
            )
          }
          disabled={pending}
          aria-label="Dépublier ce service"
        >
          Dépublier
        </Button>
      )}

      {status === "archived" && (
        <Button
          icon="checkCircle"
          onClick={() => run(() => publishServiceAction(slug))}
          disabled={pending || !checklist.ready}
          aria-label="Republier ce service archivé"
        >
          Republier
        </Button>
      )}
    </div>
  )
}
