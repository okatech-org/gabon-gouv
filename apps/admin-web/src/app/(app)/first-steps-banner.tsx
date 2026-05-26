"use client"

/**
 * Banner "Premiers pas" sur le dashboard admin (Phase Trous C).
 *
 * S'affiche pour un admin_organisme dont l'organisme est en statut
 * `onboarding`. Donne une checklist 3 étapes :
 *   1. Inviter l'équipe (lien /equipe)
 *   2. Configurer le SAE (lien /parametres, ou skip si déjà fait)
 *   3. Publier un service (lien /services)
 * + bouton "Activer l'organisme" qui appelle `finalizeActivation`.
 *
 * L'admin peut activer même si tout n'est pas coché (la checklist est
 * informationnelle). Une fois activé, le banner disparaît.
 */

import Link from "next/link"
import { useTransition, useState } from "react"
import { Badge, Button, Card, Icon } from "@workspace/ui"
import { finalizeActivationAction } from "./actions"

interface Props {
  organismName: string
  checklist: {
    teamInvited: boolean
    saeConfigured: boolean
    servicesPublished: boolean
  }
  completedCount: number
  totalSteps: number
}

export function FirstStepsBanner({
  organismName,
  checklist,
  completedCount,
  totalSteps,
}: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const activate = () => {
    if (
      !confirm(
        `Activer définitivement ${organismName} ? Vous pourrez ensuite recevoir des demandes citoyennes.`,
      )
    )
      return
    setError(null)
    startTransition(async () => {
      const r = await finalizeActivationAction()
      if (!r.ok) setError(r.message ?? "Échec de l'activation.")
      // Si succès : la page se rafraîchit via revalidatePath et le banner
      // disparaîtra (status passe à active).
    })
  }

  return (
    <Card>
      <div
        role="region"
        aria-labelledby="first-steps-title"
        style={{
          display: "flex",
          gap: 16,
          alignItems: "flex-start",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            background: "var(--primary-50)",
            color: "var(--primary-700)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon name="checkCircle" size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 4,
            }}
          >
            <h2
              id="first-steps-title"
              style={{
                fontSize: 16,
                fontWeight: 700,
                margin: 0,
                color: "var(--ink-900)",
              }}
            >
              Premiers pas — {organismName}
            </h2>
            <Badge tone="warning" size="sm">
              En onboarding
            </Badge>
            <span style={{ fontSize: 12, color: "var(--ink-600)" }}>
              {completedCount} / {totalSteps} étape{totalSteps > 1 ? "s" : ""}
            </span>
          </div>
          <p
            style={{
              fontSize: 13,
              color: "var(--ink-700)",
              margin: "0 0 12px",
              lineHeight: 1.5,
            }}
          >
            Votre organisme est en mode onboarding. Configurez les éléments
            ci-dessous puis activez-le pour recevoir des demandes citoyennes.
          </p>

          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: "0 0 14px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <ChecklistItem
              done={checklist.teamInvited}
              title="Inviter mon équipe"
              hint="Au moins 1 invitation envoyée"
              href="/equipe"
            />
            <ChecklistItem
              done={checklist.saeConfigured}
              title="Configurer le SAE"
              hint="Provider local ou Digitalium"
              href="/parametres"
            />
            <ChecklistItem
              done={checklist.servicesPublished}
              title="Publier mon premier service"
              hint="Au moins 1 service status=published"
              href="/services"
            />
          </ul>

          {error && (
            <div
              role="alert"
              style={{
                background: "var(--danger-50)",
                color: "var(--danger-700)",
                padding: "8px 12px",
                borderRadius: 6,
                fontSize: 13,
                marginBottom: 10,
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button
              variant="primary"
              onClick={activate}
              disabled={pending}
              icon="checkCircle"
            >
              {pending ? "Activation…" : "Activer l'organisme"}
            </Button>
            {completedCount < totalSteps && (
              <span
                style={{
                  fontSize: 12,
                  color: "var(--ink-600)",
                  alignSelf: "center",
                }}
              >
                Vous pouvez activer même sans avoir tout coché — la checklist
                est informationnelle.
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

function ChecklistItem({
  done,
  title,
  hint,
  href,
}: {
  done: boolean
  title: string
  hint: string
  href: string
}) {
  return (
    <li
      style={{
        display: "flex",
        gap: 10,
        alignItems: "center",
        padding: "8px 12px",
        background: done ? "var(--success-50)" : "var(--ink-50)",
        borderRadius: 6,
        border: `1px solid ${done ? "var(--success-200)" : "var(--ink-150)"}`,
      }}
    >
      <Icon
        name={done ? "checkCircle" : "clock"}
        size={18}
        aria-hidden="true"
        style={{
          color: done ? "var(--success-600)" : "var(--ink-400)",
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 13.5,
            fontWeight: 600,
            color: done ? "var(--ink-800)" : "var(--ink-900)",
            textDecoration: done ? "line-through" : "none",
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 12, color: "var(--ink-600)" }}>{hint}</div>
      </div>
      {!done && (
        <Link
          href={href}
          style={{
            fontSize: 12.5,
            color: "var(--primary-600)",
            fontWeight: 600,
            textDecoration: "underline",
          }}
        >
          Y aller →
        </Link>
      )}
    </li>
  )
}
