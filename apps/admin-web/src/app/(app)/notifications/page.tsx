import Link from "next/link"
import { redirect } from "next/navigation"
import {
  Badge,
  Card,
  Icon,
  PageHeader,
  type Tone,
} from "@workspace/ui"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"
import { getCurrentAgent } from "@/lib/current-agent"
import { relativeTime } from "@/lib/format"
import { MarkAllReadButton } from "./mark-all-read-button"

/**
 * Page /notifications admin (fix B4 — la cloche du header pointe ici).
 * Liste toutes les notifs de l'agent connecté avec liens contextuels.
 */

export const dynamic = "force-dynamic"

interface PageProps {
  searchParams: Promise<{ scope?: string }>
}

export default async function NotificationsPage({ searchParams }: PageProps) {
  const session = await getCurrentAgent()
  if (!session) redirect("/login")
  const sp = await searchParams
  const scope: "all" | "unread" = sp.scope === "unread" ? "unread" : "all"

  const data = await convex.query(api.admin.notifications.listForAgent, {
    token: session.token,
    scope,
  })

  return (
    <>
      <PageHeader
        breadcrumbs={["Mon espace", "Notifications"]}
        title="Notifications"
        subtitle={`${data.total} notification${data.total > 1 ? "s" : ""}${data.unreadCount > 0 ? ` · ${data.unreadCount} non lue${data.unreadCount > 1 ? "s" : ""}` : ""}.`}
        actions={
          data.unreadCount > 0 ? <MarkAllReadButton /> : null
        }
      />
      <div
        style={{
          padding: "24px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          maxWidth: 1000,
          width: "100%",
        }}
      >
        {/* Tabs scopes */}
        <nav
          aria-label="Filtrer les notifications"
          style={{ display: "flex", gap: 4 }}
        >
          {(
            [
              { id: "all", label: `Toutes (${data.total + (scope === "unread" ? data.unreadCount - data.total : 0)})` },
              { id: "unread", label: `Non lues (${data.unreadCount})` },
            ] as { id: "all" | "unread"; label: string }[]
          ).map((t) => {
            const active = scope === t.id
            return (
              <Link
                key={t.id}
                href={`/notifications?scope=${t.id}`}
                aria-current={active ? "page" : undefined}
                style={{
                  padding: "6px 12px",
                  fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  color: active ? "var(--primary-700)" : "var(--ink-700)",
                  background: active ? "var(--primary-50)" : "transparent",
                  borderRadius: 6,
                  textDecoration: "none",
                }}
              >
                {t.label}
              </Link>
            )
          })}
        </nav>

        {data.rows.length === 0 ? (
          <Card>
            <div
              style={{
                padding: 48,
                textAlign: "center",
                color: "var(--ink-600)",
              }}
            >
              <Icon
                name="checkCircle"
                size={36}
                aria-hidden="true"
                style={{ color: "var(--success-500)", marginBottom: 12 }}
              />
              <p style={{ fontSize: 14, margin: 0 }}>
                {scope === "unread"
                  ? "Vous êtes à jour. Aucune notification non lue."
                  : "Aucune notification."}
              </p>
            </div>
          </Card>
        ) : (
          <Card padded={false}>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {data.rows.map((n, i) => {
                const unread = !n.readAt
                const inner = (
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      padding: "14px 16px",
                      borderTop: i === 0 ? undefined : "1px solid var(--ink-100)",
                      background: unread ? "var(--primary-50)" : "transparent",
                    }}
                  >
                    <div
                      aria-hidden="true"
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: unread
                          ? "var(--primary-500)"
                          : "transparent",
                        marginTop: 8,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 4,
                        }}
                      >
                        <Badge tone={severityTone(n.severity)} size="sm">
                          {severityLabel(n.severity)}
                        </Badge>
                        <span
                          style={{
                            fontSize: 13.5,
                            fontWeight: unread ? 700 : 600,
                            color: "var(--ink-900)",
                          }}
                        >
                          {n.title}
                        </span>
                      </div>
                      {n.body && (
                        <p
                          style={{
                            fontSize: 13,
                            color: "var(--ink-700)",
                            margin: "0 0 4px",
                          }}
                        >
                          {n.body}
                        </p>
                      )}
                      <span
                        style={{
                          fontSize: 11.5,
                          color: "var(--ink-500)",
                        }}
                      >
                        {relativeTime(n.createdAt)}
                      </span>
                    </div>
                  </div>
                )
                return (
                  <li key={n.id}>
                    {n.linkTo ? (
                      <Link
                        href={n.linkTo}
                        style={{
                          display: "block",
                          textDecoration: "none",
                          color: "inherit",
                        }}
                      >
                        {inner}
                      </Link>
                    ) : (
                      inner
                    )}
                  </li>
                )
              })}
            </ul>
          </Card>
        )}
      </div>
    </>
  )
}

function severityLabel(s: string): string {
  switch (s) {
    case "info":
      return "Info"
    case "warning":
      return "Attention"
    case "danger":
      return "Urgent"
    case "success":
      return "OK"
    default:
      return s
  }
}

function severityTone(s: string): Tone {
  switch (s) {
    case "info":
      return "info"
    case "warning":
      return "warning"
    case "danger":
      return "danger"
    case "success":
      return "success"
    default:
      return "neutral"
  }
}
