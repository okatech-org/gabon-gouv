import Link from "next/link"
import { notFound } from "next/navigation"
import {
  Avatar,
  Badge,
  Button,
  Card,
  Icon,
  PageHeader,
  SectionHeading,
  type Tone,
} from "@workspace/ui"
import { api } from "@workspace/backend/generated"
import { getCitizenConvex } from "@/lib/convex"
import { requireCurrentSession } from "@/lib/current-citizen"
import { CancelRequestButton } from "./cancel-request-button"
import { SendMessageBox } from "./send-message-box"
import { DownloadPdfButton } from "./download-pdf-button"

export default async function CitizenTrackingPage({
  params,
}: {
  params: Promise<{ ref: string }>
}) {
  const { ref } = await params
  const session = await requireCurrentSession()
  const convex = await getCitizenConvex(session)
  const tracking = await convex.query(api.citizen.requests.getMyRequest, {
    ref,
  })
  if (!tracking) notFound()

  return (
    <>
      <PageHeader
        breadcrumbs={[
          <Link key="m" href="/mon-espace" style={{ color: "inherit" }}>
            Mes demandes
          </Link>,
          tracking.ref,
        ]}
        title={tracking.title}
        subtitle={tracking.subtitle}
        actions={
          <>
            {tracking.canCancel && (
              <CancelRequestButton requestRef={tracking.ref} />
            )}
            <Button variant="outline" icon="download">
              Récépissé
            </Button>
          </>
        }
      />
      <div
        style={{
          padding: "24px 32px",
          display: "grid",
          gridTemplateColumns: "1fr 320px",
          gap: 20,
          maxWidth: 1400,
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          {/* Timeline */}
          <Card>
            <SectionHeading
              title="Suivi du traitement"
              level={3}
              action={
                <Badge tone={tracking.statusTone as Tone} dot>
                  {tracking.status}
                </Badge>
              }
            />
            {tracking.events.map((e, i, arr) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background:
                        e.status === "done"
                          ? "var(--success-500)"
                          : e.status === "active"
                            ? "var(--primary-500)"
                            : "white",
                      border: `1.5px solid ${
                        e.status === "done"
                          ? "var(--success-500)"
                          : e.status === "active"
                            ? "var(--primary-500)"
                            : "var(--ink-300)"
                      }`,
                      color:
                        e.status === "pending"
                          ? "var(--ink-500)"
                          : "white",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {e.status === "done" ? (
                      <Icon name="check" size={13} stroke={3} />
                    ) : (
                      i + 1
                    )}
                  </span>
                  {i < arr.length - 1 && (
                    <span
                      style={{
                        width: 1.5,
                        flex: 1,
                        minHeight: 38,
                        background:
                          e.status === "pending"
                            ? "var(--ink-200)"
                            : "var(--ink-300)",
                      }}
                    />
                  )}
                </div>
                <div style={{ flex: 1, paddingBottom: 18 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: 14 }}>
                      {e.title}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--ink-500)",
                      }}
                    >
                      {e.date}
                    </span>
                    {e.who && (
                      <Badge tone="neutral" size="sm">
                        {e.who}
                      </Badge>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--ink-600)",
                      marginTop: 4,
                    }}
                  >
                    {e.log}
                  </div>
                </div>
              </div>
            ))}
          </Card>

          {/* Échanges */}
          <Card>
            <SectionHeading
              title="Échanges avec l'administration"
              level={3}
              action={<SendMessageBox requestRef={tracking.ref} />}
            />
            {tracking.exchanges.map((m, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: m.me ? "row-reverse" : "row",
                  gap: 12,
                  marginTop: i === 0 ? 0 : 12,
                }}
              >
                <Avatar
                  name={m.from}
                  tone={m.me ? "primary" : "green"}
                  size={32}
                />
                <div
                  style={{
                    maxWidth: 480,
                    background: m.me
                      ? "var(--primary-50)"
                      : "var(--ink-100)",
                    padding: "10px 14px",
                    borderRadius: 10,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--ink-600)",
                      marginBottom: 4,
                    }}
                  >
                    {m.from} ·{" "}
                    <span style={{ fontWeight: 400 }}>{m.when}</span>
                  </div>
                  <div
                    style={{
                      fontSize: 13.5,
                      color: "var(--ink-900)",
                      lineHeight: 1.5,
                    }}
                  >
                    {m.description}
                  </div>
                </div>
              </div>
            ))}
          </Card>
        </div>

        {/* Sidebar */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <Card>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--ink-500)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Référence
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 14,
                fontWeight: 700,
                marginTop: 4,
              }}
            >
              {tracking.ref}
            </div>
            <div
              style={{
                height: 1,
                background: "var(--ink-150)",
                margin: "14px 0",
              }}
            />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px 8px",
                fontSize: 13,
              }}
            >
              <div style={{ color: "var(--ink-500)" }}>Statut</div>
              <div>
                <Badge tone={tracking.statusTone as Tone} dot>
                  {tracking.status}
                </Badge>
              </div>
              <div style={{ color: "var(--ink-500)" }}>Avancement</div>
              <div style={{ fontWeight: 600 }}>{tracking.progress} %</div>
              <div style={{ color: "var(--ink-500)" }}>Délai estimé</div>
              <div style={{ fontWeight: 600 }}>{tracking.estimatedDelay}</div>
              <div style={{ color: "var(--ink-500)" }}>Agent</div>
              <div style={{ fontWeight: 600 }}>{tracking.agent}</div>
            </div>
          </Card>
          <Card>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--ink-500)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 8,
              }}
            >
              Pièces du dossier
            </div>
            {tracking.files.map((f) => (
              <div
                key={f}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 0",
                  borderBottom: "1px solid var(--ink-150)",
                }}
              >
                <Icon
                  name="fileText"
                  size={14}
                  style={{ color: "var(--ink-500)" }}
                />
                <span style={{ fontSize: 13, flex: 1 }}>{f}</span>
                <Icon
                  name="download"
                  size={14}
                  style={{ color: "var(--ink-500)" }}
                />
              </div>
            ))}
          </Card>
          <Card>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--ink-500)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 8,
              }}
            >
              Actions
            </div>
            <DownloadPdfButton
              requestRef={tracking.ref}
              status={tracking.rawStatus}
            />
            {tracking.canCancel && (
              <>
                <div style={{ height: 12 }} />
                <CancelRequestButton requestRef={tracking.ref} />
              </>
            )}
          </Card>
        </div>
      </div>
    </>
  )
}
