import Link from "next/link"
import { notFound } from "next/navigation"
import {
  Avatar,
  Badge,
  Card,
  Icon,
  PageHeader,
  SectionHeading,
} from "@workspace/ui"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"
import { requireCurrentSession } from "@/lib/current-citizen"
import { CitizenThreadActions } from "./thread-actions"

/**
 * Page citoyen — détail d'un courrier officiel.
 *
 * Vue lecture du thread (messages chronologiques signés), avec actions :
 *   - "Accuser réception" si le citoyen est To et pas encore d'AR
 *   - "Répondre" si statut le permet
 *   - PJ + métadonnées + circuit visualisé en bas
 */
export default async function CitizenCourrierDetailPage({
  params,
}: {
  params: Promise<{ ref: string }>
}) {
  const session = await requireCurrentSession()
  const { ref } = await params

  const thread = await convex.query(
    api.citizen.correspondence.citizenGetThread,
    { idnSub: session.idnSub, ref },
  )
  if (!thread) notFound()

  return (
    <>
      <PageHeader
        breadcrumbs={[
          <Link
            key="c"
            href="/mon-espace/courriers"
            style={{ color: "inherit" }}
          >
            Courriers officiels
          </Link>,
          thread.ref,
        ]}
        title={thread.subject}
        subtitle={`De : ${thread.from}`}
      />
      <main
        id="main"
        tabIndex={-1}
        style={{
          padding: "24px 32px",
          maxWidth: 880,
          width: "100%",
          flex: 1,
        }}
      >
        {/* Métadonnées en haut */}
        <Card>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 8,
            }}
          >
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
              {thread.ref}
            </span>
            {thread.urgent && (
              <Badge tone="danger" size="sm" icon="alertTriangle">
                Urgent
              </Badge>
            )}
            <StatusBadge status={thread.status} />
            <ConfidentialityBadge level={thread.confidentiality} />
          </div>
          {thread.dueAckAt && (
            <p
              style={{
                fontSize: 12,
                color: "var(--ink-600)",
                margin: "4px 0 0",
              }}
            >
              Échéance d&apos;accusé de réception :{" "}
              {new Date(thread.dueAckAt).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          )}
        </Card>

        {/* Actions (Acknowledge + Reply) */}
        <div style={{ marginTop: 16 }}>
          <CitizenThreadActions
            correspondenceRef={thread.ref}
            status={thread.status}
            ackCount={thread.acks.length}
          />
        </div>

        {/* Liste des messages */}
        <SectionHeading
          title="Conversation"
          level={2}
          subtitle={`${thread.messages.length} message${thread.messages.length > 1 ? "s" : ""}`}
        />
        <ol
          aria-label="Messages du fil"
          style={{
            listStyle: "none",
            padding: 0,
            margin: "0 0 24px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {thread.messages.map((m) => (
            <li key={m.id}>
              {m.isSystem ? (
                <Card>
                  <p
                    style={{
                      fontSize: 12.5,
                      color: "var(--ink-700)",
                      fontStyle: "italic",
                      margin: 0,
                    }}
                  >
                    <Icon
                      name="info"
                      size={12}
                      aria-hidden="true"
                      style={{
                        verticalAlign: "middle",
                        marginRight: 4,
                      }}
                    />
                    {m.body}
                  </p>
                </Card>
              ) : (
                <Card>
                  <header
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 10,
                    }}
                  >
                    <Avatar
                      name={m.fromKind === "citizen" ? "Vous" : thread.from}
                      tone="primary"
                      size={32}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>
                        {m.fromKind === "citizen" ? "Vous" : thread.from}
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--ink-600)" }}>
                        {formatDateTime(m.sentAt)}
                      </div>
                    </div>
                    {m.signed && (
                      <Badge tone="success" size="sm" icon="shieldCheck">
                        Signé
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
                    {m.body}
                  </div>
                </Card>
              )}
            </li>
          ))}
        </ol>

        {/* Pièces jointes */}
        {thread.attachments.length > 0 && (
          <>
            <SectionHeading
              title="Pièces jointes"
              level={2}
              subtitle={`${thread.attachments.length} document${thread.attachments.length > 1 ? "s" : ""}`}
            />
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: "0 0 24px",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {thread.attachments.map((a) => (
                <li key={a.id}>
                  <Card>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 13,
                      }}
                    >
                      <Icon name="paperclip" size={14} aria-hidden="true" />
                      <span style={{ flex: 1 }}>{a.filename}</span>
                      <span
                        style={{ fontSize: 11.5, color: "var(--ink-500)" }}
                      >
                        {formatBytes(a.sizeBytes)}
                      </span>
                      {a.kind === "document" && (
                        <Badge tone="info" size="sm">
                          Acte officiel
                        </Badge>
                      )}
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<
    string,
    { tone: "neutral" | "info" | "warning" | "success" | "danger"; label: string }
  > = {
    sent: { tone: "info", label: "Envoyé" },
    acknowledged: { tone: "info", label: "Reçu" },
    replied: { tone: "success", label: "Répondu" },
    closed: { tone: "neutral", label: "Clôturé" },
    archived: { tone: "neutral", label: "Archivé" },
    recalled: { tone: "danger", label: "Rappelé" },
  }
  const m = map[status] ?? { tone: "neutral" as const, label: status }
  return (
    <Badge tone={m.tone} size="sm">
      {m.label}
    </Badge>
  )
}

function ConfidentialityBadge({ level }: { level: string }) {
  if (level === "public") return null
  const tone =
    level === "secret"
      ? "danger"
      : level === "confidential"
        ? "warning"
        : "info"
  const label =
    level === "secret"
      ? "Secret"
      : level === "confidential"
        ? "Confidentiel"
        : "Restreint"
  return (
    <Badge tone={tone} size="sm" icon="lock">
      {label}
    </Badge>
  )
}

function formatBytes(b: number): string {
  if (b >= 1_000_000) return `${(b / 1_000_000).toFixed(1)} Mo`
  if (b >= 1_000) return `${(b / 1_000).toFixed(0)} Ko`
  return `${b} o`
}

function formatDateTime(ms: number): string {
  return new Date(ms).toLocaleString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}
