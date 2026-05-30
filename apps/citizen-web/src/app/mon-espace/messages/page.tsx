import Link from "next/link"
import {
  Badge,
  Card,
  Icon,
  PageHeader,
  StatCard,
  type IconName,
  type Tone,
} from "@workspace/ui"
import { api } from "@workspace/backend/generated"
import { getCitizenConvex } from "@/lib/convex"
import { requireCurrentSession } from "@/lib/current-citizen"
import { MarkReadButton } from "./mark-read-button"

const FILTERS = [
  { id: "all", label: "Tous" },
  { id: "unread", label: "Non lus" },
  { id: "agent", label: "Messages d'agents" },
  { id: "notification", label: "Notifications" },
] as const

type FilterId = (typeof FILTERS)[number]["id"]

interface PageProps {
  searchParams: Promise<{ filtre?: string }>
}

export default async function CitizenMessagesPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const filter = (FILTERS.find((f) => f.id === sp.filtre)?.id ??
    "all") as FilterId

  const session = await requireCurrentSession()
  const convex = await getCitizenConvex(session)
  const { messages, stats } = await convex.query(
    api.citizen.messages.listMyMessages,
    {},
  )

  const filtered = messages.filter((m) => {
    switch (filter) {
      case "all":
        return true
      case "unread":
        return m.unread
      case "agent":
        return m.source === "agent_message"
      case "notification":
        return m.source === "notification"
    }
  })

  return (
    <>
      <PageHeader
        breadcrumbs={["Mon espace", "Messages"]}
        title="Messages"
        subtitle={
          stats.total === 0
            ? "Vous n'avez encore reçu aucun message."
            : `${stats.total} message${stats.total > 1 ? "s" : ""} · ${stats.unread} non lu${stats.unread > 1 ? "s" : ""}.`
        }
      />
      <div
        style={{
          padding: "24px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
          maxWidth: 1100,
          width: "100%",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
          }}
          role="group"
          aria-label="Statistiques messages"
        >
          <StatCard
            label="Total"
            value={String(stats.total)}
            icon="mail"
          />
          <StatCard
            label="Non lus"
            value={String(stats.unread)}
            icon="bell"
            accent={stats.unread > 0}
          />
          <StatCard
            label="Messages d'agents"
            value={String(stats.agentMessages)}
            icon="messageSquare"
          />
        </div>

        <nav aria-label="Filtrer les messages">
          <ul
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              padding: 0,
              margin: 0,
              listStyle: "none",
            }}
          >
            {FILTERS.map((f) => {
              const active = f.id === filter
              return (
                <li key={f.id}>
                  <Link
                    href={
                      f.id === "all"
                        ? "/mon-espace/messages"
                        : `/mon-espace/messages?filtre=${f.id}`
                    }
                    aria-current={active ? "page" : undefined}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "6px 14px",
                      borderRadius: 999,
                      border: `1px solid ${active ? "var(--primary-500)" : "var(--ink-200)"}`,
                      background: active ? "var(--primary-500)" : "white",
                      color: active ? "white" : "var(--ink-800)",
                      fontSize: 13,
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                  >
                    {f.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {filtered.length === 0 ? (
          <Card>
            <div
              style={{
                padding: "48px 24px",
                textAlign: "center",
                color: "var(--ink-600)",
              }}
            >
              <Icon
                name="mail"
                size={36}
                style={{ color: "var(--ink-400)", marginBottom: 12 }}
                aria-hidden="true"
              />
              <h2 style={{ fontSize: 17, marginBottom: 6 }}>
                Aucun message dans cette catégorie
              </h2>
              <p style={{ fontSize: 14, color: "var(--ink-600)" }}>
                {stats.total === 0
                  ? "Les notifications et messages d'agents apparaîtront ici."
                  : "Essayez un autre filtre."}
              </p>
            </div>
          </Card>
        ) : (
          <Card padded={false}>
            <ul
              style={{
                margin: 0,
                padding: 0,
                listStyle: "none",
              }}
              aria-label={`${filtered.length} messages`}
            >
              {filtered.map((m, i) => {
                const isAgent = m.source === "agent_message"
                return (
                  <li
                    key={m.id}
                    style={{
                      display: "flex",
                      gap: 14,
                      padding: 18,
                      borderTop: i === 0 ? "none" : "1px solid var(--ink-150)",
                      background: m.unread ? "var(--primary-50)" : "transparent",
                    }}
                  >
                    {/* Marker non-lu */}
                    <span
                      aria-hidden={m.unread ? "false" : "true"}
                      aria-label={m.unread ? "Non lu" : undefined}
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: m.unread
                          ? "var(--primary-500)"
                          : "transparent",
                        marginTop: 8,
                        flexShrink: 0,
                      }}
                    />
                    {/* Icône type */}
                    <span
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: isAgent
                          ? "var(--primary-50)"
                          : severityBg(m.severity),
                        color: isAgent
                          ? "var(--primary-600)"
                          : severityFg(m.severity),
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon
                        name={isAgent ? "messageSquare" : severityIcon(m.severity)}
                        size={18}
                        aria-hidden="true"
                      />
                    </span>
                    {/* Contenu */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          alignItems: "baseline",
                        }}
                      >
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <span
                            style={{
                              fontSize: 13.5,
                              fontWeight: 700,
                              color: "var(--ink-800)",
                            }}
                          >
                            {m.who}
                          </span>
                          {m.whoSub && (
                            <Badge tone="neutral" size="sm">
                              {m.whoSub}
                            </Badge>
                          )}
                          {m.severity && (
                            <Badge tone={severityTone(m.severity)} size="sm" dot>
                              {severityLabel(m.severity)}
                            </Badge>
                          )}
                        </div>
                        <time
                          style={{
                            fontSize: 12,
                            color: "var(--ink-500)",
                            flexShrink: 0,
                            fontVariantNumeric: "tabular-nums",
                          }}
                          dateTime={new Date(m.createdAt).toISOString()}
                        >
                          {m.readable}
                        </time>
                      </div>
                      <h3
                        style={{
                          fontSize: 14.5,
                          fontWeight: m.unread ? 700 : 600,
                          marginTop: 2,
                          marginBottom: 4,
                          color: "var(--ink-900)",
                        }}
                      >
                        {m.title}
                      </h3>
                      <p
                        style={{
                          fontSize: 13.5,
                          color: "var(--ink-700)",
                          lineHeight: 1.55,
                          margin: 0,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {m.body}
                      </p>
                      <div
                        style={{
                          marginTop: 10,
                          display: "flex",
                          gap: 12,
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        {m.linkTo && (
                          <Link
                            href={m.linkTo}
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: "var(--primary-600)",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            Ouvrir la démarche
                            <Icon
                              name="arrowRight"
                              size={12}
                              aria-hidden="true"
                            />
                          </Link>
                        )}
                        {m.unread && (
                          <MarkReadButton
                            source={m.source}
                            messageId={m.id}
                          />
                        )}
                      </div>
                    </div>
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

// ────────── helpers visuels ──────────

function severityIcon(s: string | null): IconName {
  switch (s) {
    case "warning":
      return "alertTriangle"
    case "danger":
      return "alertTriangle"
    case "success":
      return "checkCircle"
    default:
      return "bell"
  }
}

function severityBg(s: string | null): string {
  switch (s) {
    case "warning":
      return "var(--warning-100, #fef3c7)"
    case "danger":
      return "var(--danger-100, #fee2e2)"
    case "success":
      return "var(--success-100, #dcfce7)"
    default:
      return "var(--ink-100)"
  }
}

function severityFg(s: string | null): string {
  switch (s) {
    case "warning":
      return "var(--warning-600, #b45309)"
    case "danger":
      return "var(--danger-600, #b91c1c)"
    case "success":
      return "var(--success-600, #15803d)"
    default:
      return "var(--ink-600)"
  }
}

function severityTone(s: string): Tone {
  switch (s) {
    case "warning":
      return "warning"
    case "danger":
      return "danger"
    case "success":
      return "archived"
    case "info":
      return "primary"
    default:
      return "neutral"
  }
}

function severityLabel(s: string): string {
  switch (s) {
    case "warning":
      return "Vigilance"
    case "danger":
      return "Important"
    case "success":
      return "OK"
    case "info":
      return "Info"
    default:
      return s
  }
}
