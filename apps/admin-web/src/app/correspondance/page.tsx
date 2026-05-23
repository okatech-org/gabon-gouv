import { redirect } from "next/navigation"
import {
  AppHeader,
  Avatar,
  Badge,
  Button,
  Frame,
  Icon,
  PageHeader,
  Sidebar,
  TextArea,
  TextInput,
} from "@workspace/ui"
import { api } from "@workspace/backend/generated"
import { ADMIN_NAV } from "@/lib/admin-nav"
import { convex } from "@/lib/convex"
import { getCurrentAgent } from "@/lib/current-agent"
import {
  agentRoleLabel,
  relativeTime,
  shortDateTime,
} from "@/lib/format"

interface InboxItem {
  ref: string
  from: string
  subject: string
  sentAt: number
  urgent: boolean
  confidentiality: string
  unread: boolean
  attachmentCount: number
}

interface ThreadMessage {
  fromAgentName: string
  fromOrganism: string
  body: string
  signed: boolean
  sentAt: number
}

interface ThreadData {
  ref: string
  subject: string
  sentAt: number
  dueAt?: number
  urgent: boolean
  confidentiality: string
  archivePolicy: string
  from: string
  to: string
  messages: ThreadMessage[]
  linkedCitizen?: { name: string; nip: string } | null
  linkedRequest?: { ref: string; status: string } | null
}

function confidentialityLabel(c: string): string {
  switch (c) {
    case "restricted":
      return "Restreint"
    case "confidential":
      return "Confidentiel"
    case "public":
      return "Public"
    default:
      return c
  }
}

function archiveLabel(p: string): string {
  switch (p) {
    case "2y":
      return "2 ans"
    case "5y":
      return "5 ans"
    case "10y":
      return "10 ans"
    case "indef":
      return "Indéfini"
    default:
      return p
  }
}

export default async function AdminCorrespondencePage() {
  const session = await getCurrentAgent()
  if (!session) redirect("/login")

  const inbox = (await convex.query(api.admin.correspondence.listInbox, {
    token: session.token,
  })) as InboxItem[]

  // Conversation par défaut affichée : la première (ou CR-2026-1842 si présente).
  const activeRef =
    inbox.find((i) => i.ref === "CR-2026-1842")?.ref ?? inbox[0]?.ref ?? "CR-2026-1842"

  const thread = (await convex.query(api.admin.correspondence.getThread, {
    token: session.token,
    ref: activeRef,
  })) as ThreadData | null

  const unreadCount = inbox.filter((i) => i.unread).length

  return (
    <Frame width={1440} height={900}>
      <AppHeader
        org={session.agent.organism?.shortName ?? session.agent.organism?.name}
        user={session.agent.name}
        role={agentRoleLabel(session.agent.role)}
      />
      <div style={{ display: "flex" }}>
        <Sidebar items={ADMIN_NAV} current="correspondance" />
        <main
          style={{
            flex: 1,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <PageHeader
            breadcrumbs={["Correspondance inter-administrations"]}
            title="Messagerie sécurisée inter-admin"
            subtitle={`Échanges officiels entre ${session.agent.organism?.shortName ?? "votre organisme"} et les autres administrations gabonaises.`}
            actions={
              <>
                <Button variant="outline" icon="filter">
                  Filtres
                </Button>
                <Button icon="plus">Nouveau courrier</Button>
              </>
            }
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "300px 1fr 360px",
              flex: 1,
              overflow: "hidden",
            }}
          >
            {/* List */}
            <div style={{ borderRight: "1px solid var(--ink-200)", overflow: "auto" }}>
              <div style={{ padding: 14, borderBottom: "1px solid var(--ink-150)" }}>
                <TextInput placeholder="Rechercher…" icon="search" />
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 4,
                  padding: "10px 14px",
                  borderBottom: "1px solid var(--ink-150)",
                }}
              >
                {[`Reçus (${inbox.length})`, "Envoyés", "Brouillons"].map((t, i) => (
                  <button
                    key={t}
                    style={{
                      padding: "4px 10px",
                      fontSize: 12,
                      fontWeight: 600,
                      background: i === 0 ? "var(--primary-50)" : "transparent",
                      color: i === 0 ? "var(--primary-700)" : "var(--ink-600)",
                      border: "none",
                      borderRadius: 4,
                      cursor: "pointer",
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
              {inbox.map((m) => {
                const isActive = m.ref === activeRef
                return (
                  <div
                    key={m.ref}
                    style={{
                      padding: "12px 14px",
                      borderBottom: "1px solid var(--ink-150)",
                      background: isActive
                        ? "var(--primary-50)"
                        : m.unread
                          ? "white"
                          : "var(--ink-50)",
                      cursor: "pointer",
                      display: "flex",
                      gap: 10,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: m.unread ? "var(--primary-500)" : "transparent",
                        marginTop: 8,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: m.unread ? 700 : 600,
                            color: "var(--ink-900)",
                          }}
                        >
                          {m.from}
                        </span>
                        <span style={{ fontSize: 11, color: "var(--ink-500)" }}>
                          {relativeTime(m.sentAt)}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: "var(--ink-800)",
                          marginTop: 2,
                          whiteSpace: "nowrap",
                          textOverflow: "ellipsis",
                          overflow: "hidden",
                        }}
                      >
                        {m.subject}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          marginTop: 4,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 10.5,
                            color: "var(--ink-500)",
                          }}
                        >
                          {m.ref}
                        </span>
                        {m.urgent && (
                          <Badge tone="danger" size="sm">
                            Urgent
                          </Badge>
                        )}
                        {m.attachmentCount > 0 && (
                          <span style={{ fontSize: 11, color: "var(--ink-600)" }}>
                            <Icon
                              name="paperclip"
                              size={11}
                              style={{ verticalAlign: "middle" }}
                            />{" "}
                            {m.attachmentCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Conversation */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "14px 24px",
                  borderBottom: "1px solid var(--ink-200)",
                  background: "white",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <h2 style={{ fontSize: 17 }}>
                      {thread?.subject ?? "Aucun courrier sélectionné"}
                    </h2>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginTop: 4,
                        fontSize: 12.5,
                        color: "var(--ink-600)",
                      }}
                    >
                      {thread && (
                        <>
                          <span style={{ fontFamily: "var(--font-mono)" }}>
                            {thread.ref}
                          </span>
                          {thread.urgent && (
                            <Badge tone="danger" size="sm">
                              Urgent
                              {thread.dueAt
                                ? ` · ${relativeTime(thread.dueAt)}`
                                : ""}
                            </Badge>
                          )}
                          <span>{thread.messages.length} message{thread.messages.length > 1 ? "s" : ""}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Button variant="ghost" size="sm" icon="archive">
                      {""}
                    </Button>
                    <Button variant="ghost" size="sm" icon="share">
                      {""}
                    </Button>
                    <Button variant="ghost" size="sm" icon="moreH">
                      {""}
                    </Button>
                  </div>
                </div>
              </div>

              <div
                style={{
                  flex: 1,
                  overflow: "auto",
                  padding: "20px 24px",
                  background: "var(--ink-50)",
                }}
              >
                {thread?.messages.map((msg, i) => (
                  <div
                    key={`${msg.sentAt}-${i}`}
                    style={{
                      background: "white",
                      border: "1px solid var(--ink-200)",
                      borderRadius: 8,
                      padding: 18,
                      marginBottom: 14,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 10,
                      }}
                    >
                      <Avatar name={msg.fromOrganism} tone="primary" size={32} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>
                          {msg.fromOrganism} · {msg.fromAgentName}
                        </div>
                        <div style={{ fontSize: 11.5, color: "var(--ink-600)" }}>
                          Pour : {thread.to} · {shortDateTime(msg.sentAt)}
                        </div>
                      </div>
                      {msg.signed && (
                        <Badge tone="archived" size="sm" icon="shieldCheck">
                          Signé S/MIME
                        </Badge>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        color: "var(--ink-800)",
                        lineHeight: 1.65,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {msg.body}
                    </div>
                  </div>
                ))}

                {thread && (
                  <div
                    style={{
                      background: "var(--info-50)",
                      border: "1px dashed var(--primary-300)",
                      borderRadius: 8,
                      padding: 14,
                      marginBottom: 14,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Icon name="cpu" size={14} style={{ color: "var(--primary-500)" }} />
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: "var(--primary-700)",
                        }}
                      >
                        Réponse suggérée par Gabon Connect
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--ink-700)",
                        marginTop: 8,
                        lineHeight: 1.55,
                      }}
                    >
                      L&apos;acte référencé dans votre demande est conforme au registre.
                      Nous confirmons l&apos;authenticité du document. Aucune mention
                      marginale n&apos;a été constatée à ce jour.
                    </p>
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <Button size="sm" icon="check">
                        Utiliser cette réponse
                      </Button>
                      <Button variant="ghost" size="sm">
                        Éditer
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Composer */}
              <div
                style={{
                  padding: 16,
                  borderTop: "1px solid var(--ink-200)",
                  background: "white",
                }}
              >
                <TextArea
                  placeholder="Rédiger une réponse…"
                  defaultValue=""
                  style={{ minHeight: 76, fontSize: 13.5 }}
                />
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 10,
                  }}
                >
                  <Button variant="ghost" size="sm" icon="paperclip">
                    Joindre
                  </Button>
                  <Button variant="ghost" size="sm" icon="shieldCheck">
                    Signer S/MIME
                  </Button>
                  <div style={{ flex: 1 }} />
                  <Button variant="secondary" size="sm" icon="save">
                    Brouillon
                  </Button>
                  <Button size="sm" iconRight="arrowRight">
                    Envoyer
                  </Button>
                </div>
              </div>
            </div>

            {/* Right pane */}
            <aside
              style={{
                borderLeft: "1px solid var(--ink-200)",
                overflow: "auto",
                padding: 20,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--ink-500)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 10,
                }}
              >
                Circuit de validation
              </div>
              {/* TODO: placeholder — pas encore de query Convex pour le circuit de validation. */}
              {[
                { who: "Y. NGUEMA", role: "Agent instructeur", st: "done" as const },
                { who: "C. NDONG", role: "Chef de service", st: "active" as const },
                {
                  who: "P. MOUSSAVOU",
                  role: "Officier signataire",
                  st: "pending" as const,
                },
              ].map((s, i, arr) => (
                <div key={s.who} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        background:
                          s.st === "done"
                            ? "var(--success-500)"
                            : s.st === "active"
                              ? "var(--primary-500)"
                              : "white",
                        border: `1.5px solid ${
                          s.st === "done"
                            ? "var(--success-500)"
                            : s.st === "active"
                              ? "var(--primary-500)"
                              : "var(--ink-300)"
                        }`,
                        color: s.st === "pending" ? "var(--ink-500)" : "white",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {s.st === "done" ? <Icon name="check" size={11} stroke={3} /> : i + 1}
                    </span>
                    {i < arr.length - 1 && (
                      <span
                        style={{
                          width: 1.5,
                          flex: 1,
                          minHeight: 24,
                          background:
                            s.st === "pending" ? "var(--ink-200)" : "var(--ink-300)",
                        }}
                      />
                    )}
                  </div>
                  <div style={{ flex: 1, paddingBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{s.who}</div>
                    <div style={{ fontSize: 12, color: "var(--ink-600)" }}>{s.role}</div>
                  </div>
                </div>
              ))}
              <div
                style={{
                  height: 1,
                  background: "var(--ink-150)",
                  margin: "6px 0 14px",
                }}
              />
              {thread?.linkedCitizen && (
                <>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--ink-500)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: 10,
                    }}
                  >
                    Dossier rattaché
                  </div>
                  <a
                    href={`/dossiers/${thread.linkedCitizen.nip.replace(/\s/g, "")}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: 10,
                      background: "var(--ink-50)",
                      borderRadius: 6,
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <Icon name="folder" size={16} style={{ color: "var(--ink-500)" }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        {thread.linkedCitizen.name}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--ink-600)" }}>
                        NIP{" "}
                        <span style={{ fontFamily: "var(--font-mono)" }}>
                          {thread.linkedCitizen.nip}
                        </span>
                      </div>
                    </div>
                  </a>
                  <div style={{ height: 14 }} />
                </>
              )}
              {thread && (
                <>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--ink-500)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: 10,
                    }}
                  >
                    Métadonnées
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "8px 12px",
                      fontSize: 12,
                    }}
                  >
                    <span style={{ color: "var(--ink-500)" }}>Référence</span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontWeight: 600,
                      }}
                    >
                      {thread.ref}
                    </span>
                    <span style={{ color: "var(--ink-500)" }}>Confidentialité</span>
                    <Badge tone="warning" size="sm">
                      {confidentialityLabel(thread.confidentiality)}
                    </Badge>
                    <span style={{ color: "var(--ink-500)" }}>Échéance</span>
                    <span style={{ fontWeight: 600 }}>
                      {thread.dueAt ? shortDateTime(thread.dueAt) : "—"}
                    </span>
                    <span style={{ color: "var(--ink-500)" }}>Archivage</span>
                    <Badge tone="active" size="sm" dot>
                      {archiveLabel(thread.archivePolicy)}
                    </Badge>
                  </div>
                </>
              )}
              {!thread && (
                <div style={{ fontSize: 12, color: "var(--ink-500)" }}>
                  Sélectionnez un courrier pour voir ses métadonnées.
                </div>
              )}
              <div style={{ height: 10 }} />
              {unreadCount > 0 && (
                <div style={{ fontSize: 11, color: "var(--ink-500)" }}>
                  {unreadCount} courrier{unreadCount > 1 ? "s" : ""} non lu
                  {unreadCount > 1 ? "s" : ""}.
                </div>
              )}
            </aside>
          </div>
        </main>
      </div>
    </Frame>
  )
}
