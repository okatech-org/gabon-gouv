import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import {
  Avatar,
  Badge,
  Button,
  Card,
  Icon,
  type IconName,
  PageHeader,
  SectionHeading,
  Select,
  StatCard,
} from "@workspace/ui"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"
import { getCurrentAgent } from "@/lib/current-agent"
import { longDate, statusBadge } from "@/lib/format"

interface CitizenFolderData {
  citizen: {
    name: string
    nip: string
    email: string
    phone: string
    address: string
    birthDate: string
    birthPlace: string
    identityVerified: boolean
    createdAt: number
    sex: string
  }
  stats: {
    requestsCount: number
    documentsCount: number
  }
  timeline: {
    ref: string
    occurredAt: number
    organism: string
    title: string
    status: string
  }[]
}

function computeAge(birthDate: string): string {
  // birthDate like "14 mars 1992" — extract year for a quick age.
  const year = birthDate.match(/(\d{4})/)?.[1]
  if (!year) return birthDate
  const age = new Date().getFullYear() - Number(year)
  return `${age} ans · ${birthDate}`
}

function computeSeniority(createdAt: number): string {
  const years = Math.max(
    1,
    Math.floor((Date.now() - createdAt) / (365.25 * 24 * 60 * 60 * 1000)),
  )
  return `${years} an${years > 1 ? "s" : ""}`
}

// TODO: placeholder — pas encore de query Convex pour les habilitations.
const HABILITATIONS = [
  { org: "DG État Civil", scope: "Pleine", tone: "archived" as const },
  { org: "DG Documentation", scope: "Lecture seule", tone: "neutral" as const },
  { org: "DGI", scope: "Lecture seule", tone: "neutral" as const },
  { org: "CNAMGS", scope: "Lecture seule", tone: "neutral" as const },
]

function iconForStatus(status: string): IconName {
  switch (status) {
    case "issued":
    case "signed":
      return "checkCircle"
    case "in_instruction":
    case "submitted":
      return "refresh"
    case "rejected":
    case "cancelled":
      return "alertTriangle"
    default:
      return "fileText"
  }
}

export default async function AdminCitizenFolderPage({
  params,
}: {
  params: Promise<{ nip: string }>
}) {
  const session = await getCurrentAgent()
  if (!session) redirect("/login")

  const { nip } = await params
  const folder = (await convex.query(api.admin.citizens.getFolder, {
    token: session.token,
    nip,
  })) as CitizenFolderData | null

  if (!folder) notFound()

  const { citizen, stats, timeline } = folder
  const ageLabel = computeAge(citizen.birthDate)

  return (
    <>
      <PageHeader
        breadcrumbs={[
          <Link key="d" href="/" style={{ color: "inherit" }}>
            Dossiers citoyens
          </Link>,
          citizen.name,
        ]}
        title={`Dossier citoyen · ${citizen.name}`}
        subtitle={`NIP ${citizen.nip} · vue inter-administrations consolidée`}
        actions={
          <>
            <Button variant="ghost" icon="share">
              Partager
            </Button>
            <Button variant="secondary" icon="lock">
              Habilitations
            </Button>
            <Button icon="download">Export PDF</Button>
          </>
        }
      />
      <div
        style={{
          padding: "24px 32px",
          display: "grid",
          gridTemplateColumns: "320px 1fr",
          gap: 20,
          maxWidth: 1400,
          width: "100%",
        }}
      >
        {/* Profile card */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Card>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
                paddingBottom: 14,
                borderBottom: "1px solid var(--ink-150)",
              }}
            >
              <Avatar name={citizen.name} tone="green" size={72} />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 17, fontWeight: 700 }}>{citizen.name}</div>
                <div style={{ fontSize: 12, color: "var(--ink-600)" }}>{ageLabel}</div>
              </div>
              {citizen.identityVerified && (
                <Badge tone="archived" dot icon="fingerprint">
                  Identité vérifiée
                </Badge>
              )}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "110px 1fr",
                gap: "10px 14px",
                fontSize: 12.5,
                marginTop: 14,
              }}
            >
              <span style={{ color: "var(--ink-500)" }}>NIP</span>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                {citizen.nip}
              </span>
              <span style={{ color: "var(--ink-500)" }}>E-mail</span>
              <span style={{ fontWeight: 500 }}>{citizen.email}</span>
              <span style={{ color: "var(--ink-500)" }}>Téléphone</span>
              <span style={{ fontWeight: 500 }}>{citizen.phone}</span>
              <span style={{ color: "var(--ink-500)" }}>Domicile</span>
              <span style={{ fontWeight: 500 }}>{citizen.address}</span>
              <span style={{ color: "var(--ink-500)" }}>Compte créé</span>
              <span style={{ fontWeight: 500 }}>{longDate(citizen.createdAt)}</span>
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
              Habilitations sur ce dossier
            </div>
            {/* TODO: placeholder — pas encore de query Convex pour les habilitations. */}
            {HABILITATIONS.map((h) => (
              <div
                key={h.org}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 0",
                  borderBottom: "1px solid var(--ink-150)",
                  fontSize: 13,
                }}
              >
                <span style={{ fontWeight: 500 }}>{h.org}</span>
                <Badge tone={h.tone} size="sm">
                  {h.scope}
                </Badge>
              </div>
            ))}
            <Button variant="ghost" icon="plus" size="sm" style={{ marginTop: 6 }}>
              Demander un accès
            </Button>
          </Card>
        </div>

        {/* Right pane */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 10,
            }}
          >
            <StatCard
              label="Demandes"
              value={String(stats.requestsCount)}
              icon="inbox"
              hint="dans nos systèmes"
            />
            <StatCard
              label="Documents reçus"
              value={String(stats.documentsCount)}
              icon="fileText"
            />
            <StatCard
              label="Dossiers ouverts"
              value={String(stats.requestsCount)}
              icon="folder"
            />
            <StatCard
              label="Ancienneté"
              value={computeSeniority(citizen.createdAt)}
              icon="clock"
            />
          </div>

          <Card>
            <SectionHeading
              title="Timeline inter-administrations"
              subtitle="Toutes les interactions du citoyen avec les administrations gabonaises."
              level={3}
              action={
                <Select defaultValue="all" style={{ width: 200 }}>
                  <option value="all">Toutes administrations</option>
                  <option>{session.agent.organism?.shortName ?? "—"}</option>
                </Select>
              }
            />
            {timeline.length === 0 ? (
              <div
                style={{
                  padding: 20,
                  textAlign: "center",
                  color: "var(--ink-500)",
                  fontSize: 13,
                }}
              >
                Aucune interaction enregistrée pour ce dossier.
              </div>
            ) : (
              timeline.map((e, i, arr) => {
                const status = statusBadge(e.status)
                return (
                  <div
                    key={`${e.ref}-${i}`}
                    style={{ display: "flex", gap: 14, paddingTop: i === 0 ? 4 : 0 }}
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
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: "var(--primary-50)",
                          color: "var(--primary-500)",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Icon name={iconForStatus(e.status)} size={15} />
                      </span>
                      {i < arr.length - 1 && (
                        <span
                          style={{
                            width: 1.5,
                            flex: 1,
                            minHeight: 28,
                            background: "var(--ink-200)",
                          }}
                        />
                      )}
                    </div>
                    <div
                      style={{
                        flex: 1,
                        paddingBottom: i === arr.length - 1 ? 0 : 16,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: "var(--ink-600)",
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                          }}
                        >
                          {longDate(e.occurredAt)}
                        </span>
                        <Badge tone="neutral" size="sm">
                          {e.organism}
                        </Badge>
                        <Badge tone={status.tone} size="sm" dot>
                          {status.label}
                        </Badge>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>
                        <Link
                          href={`/demandes/${e.ref}`}
                          style={{ color: "inherit", textDecoration: "none" }}
                        >
                          {e.title}
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </Card>
        </div>
      </div>
    </>
  )
}
