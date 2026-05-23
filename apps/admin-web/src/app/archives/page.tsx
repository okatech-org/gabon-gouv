import { redirect } from "next/navigation"
import type { Tone } from "@workspace/ui"
import {
  AppHeader,
  Badge,
  Button,
  Card,
  Checkbox,
  Frame,
  Icon,
  PageHeader,
  SectionHeading,
  Sidebar,
  StatCard,
  Table,
  Tabs,
  Td,
  TextInput,
  Th,
  Tr,
} from "@workspace/ui"
import { api } from "@workspace/backend/generated"
import { ADMIN_NAV } from "@/lib/admin-nav"
import { convex } from "@/lib/convex"
import { getCurrentAgent } from "@/lib/current-agent"
import { agentRoleLabel, longDate } from "@/lib/format"

interface ArchiveRow {
  cote: string
  description: string
  versedAt: number
  dua: string
  status: string
  finalSort: string
  sha256: string
}

interface ArchiveStats {
  versedThisMonth: number
  total: number
  pendingDestruction: number
  integrityPct: number
}

function archiveStatusBadge(status: string): { label: string; tone: Tone } {
  switch (status) {
    case "active":
      return { label: "Actif", tone: "active" }
    case "semi_active":
      return { label: "Semi-actif", tone: "semi" }
    case "scheduled_destruction":
      return { label: "Élim. planifiée", tone: "warning" }
    case "destroyed":
      return { label: "Détruit", tone: "neutral" }
    case "permanent":
      return { label: "Conservation déf.", tone: "archived" }
    default:
      return { label: status, tone: "neutral" }
  }
}

function shortHash(sha: string): string {
  if (sha.length <= 12) return sha
  return `${sha.slice(0, 6)}…${sha.slice(-4)}`
}

// TODO: migrer compliance & elimination vers Convex.
const COMPLIANCE = [
  {
    title: "Empreintes SHA-256",
    description: "Recalculées toutes les 24h.",
  },
  {
    title: "Journal d'événements scellé",
    description: "186 472 lignes · scellement quotidien.",
  },
  {
    title: "Réplication géographique",
    description: "Owendo (primaire) + Mvengue (secours).",
  },
  {
    title: "Audit annuel BSI",
    description: "Prochaine échéance : nov. 2026.",
  },
]

const ELIMINATION_LOTS = [
  { title: "Casiers judiciaires expirés (T1 2026)", count: 142, sort: "Destruction physique" },
  { title: "Demandes passeport non abouties", count: 84, sort: "Destruction logique" },
  { title: "Brouillons d'actes annulés", count: 124, sort: "Destruction logique" },
  { title: "Notifications expirées > 90 j", count: 62, sort: "Destruction logique" },
]

export default async function AdminArchivesPage() {
  const session = await getCurrentAgent()
  if (!session) redirect("/login")

  const [archives, stats] = await Promise.all([
    convex.query(api.admin.archives.list, { token: session.token }) as Promise<
      ArchiveRow[]
    >,
    convex.query(api.admin.archives.stats, { token: session.token }) as Promise<
      ArchiveStats
    >,
  ])

  const producerLabel =
    session.agent.organism?.shortName ?? session.agent.organism?.name ?? "—"

  return (
    <Frame width={1440} height={950}>
      <AppHeader
        org={session.agent.organism?.shortName ?? session.agent.organism?.name}
        user={session.agent.name}
        role={agentRoleLabel(session.agent.role)}
      />
      <div style={{ display: "flex" }}>
        <Sidebar items={ADMIN_NAV} current="archives" />
        <main style={{ flex: 1, overflow: "hidden" }}>
          <PageHeader
            breadcrumbs={["Archives (SAE)"]}
            title="Archives à valeur probante"
            subtitle={`Système d'Archivage Électronique conforme NF Z42-013 · ${stats.total.toLocaleString("fr-FR")} unités d'archives`}
            meta={
              <>
                <Badge tone="archived" dot icon="shieldCheck">
                  NF Z42-013
                </Badge>
                <Badge tone="active" icon="database">
                  Hébergé au Gabon
                </Badge>
                <span style={{ fontSize: 12, color: "var(--ink-600)" }}>
                  Stockage utilisé · <b>2,4 To / 5 To</b>
                </span>
              </>
            }
            actions={
              <>
                <Button variant="outline" icon="upload">
                  Verser au SAE
                </Button>
                <Button variant="outline" icon="search">
                  Recherche avancée
                </Button>
              </>
            }
          />
          <div
            style={{
              padding: "20px 32px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 12,
              }}
            >
              <StatCard
                label="Versés ce mois"
                value={stats.versedThisMonth.toLocaleString("fr-FR")}
                icon="upload"
              />
              <StatCard
                label="Empreintes scellées"
                value={stats.total.toLocaleString("fr-FR")}
                icon="shieldCheck"
              />
              <StatCard
                label="En attente d&apos;élim."
                value={stats.pendingDestruction.toLocaleString("fr-FR")}
                icon="trash"
                hint="DUA dépassée"
              />
              <StatCard
                label="Intégrité"
                value={`${stats.integrityPct} %`}
                icon="checkCircle"
                hint="dernier contrôle 19/05"
              />
            </div>

            <Card>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 14,
                }}
              >
                <Tabs
                  tabs={[
                    { id: "recent", label: "Versements récents" },
                    { id: "fonds", label: "Fonds (ISAD-G)" },
                    { id: "elim", label: "Plan d'élimination" },
                    { id: "comm", label: "Communications" },
                  ]}
                  current="recent"
                  variant="line"
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <TextInput
                    placeholder="Cote, mots-clés…"
                    icon="search"
                    style={{ width: 220 }}
                  />
                  <Button variant="ghost" icon="filter">
                    Filtrer
                  </Button>
                </div>
              </div>
              <Table>
                <thead>
                  <tr>
                    <Th>Cote</Th>
                    <Th>Description</Th>
                    <Th>Producteur</Th>
                    <Th>Versement</Th>
                    <Th>DUA</Th>
                    <Th>Statut</Th>
                    <Th>Sort final</Th>
                    <Th>Empreinte</Th>
                  </tr>
                </thead>
                <tbody>
                  {archives.map((r) => {
                    const status = archiveStatusBadge(r.status)
                    return (
                      <Tr key={r.cote}>
                        <Td
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          {r.cote}
                        </Td>
                        <Td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <Icon
                              name="fileText"
                              size={14}
                              style={{ color: "var(--ink-500)" }}
                            />
                            <span style={{ fontWeight: 500 }}>{r.description}</span>
                          </div>
                        </Td>
                        <Td>{producerLabel}</Td>
                        <Td style={{ color: "var(--ink-600)" }}>{longDate(r.versedAt)}</Td>
                        <Td style={{ fontWeight: 600 }}>{r.dua}</Td>
                        <Td>
                          <Badge tone={status.tone} dot>
                            {status.label}
                          </Badge>
                        </Td>
                        <Td style={{ fontSize: 12, color: "var(--ink-700)" }}>
                          {r.finalSort}
                        </Td>
                        <Td
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 11,
                            color: "var(--ink-600)",
                          }}
                        >
                          {shortHash(r.sha256)}
                        </Td>
                      </Tr>
                    )
                  })}
                </tbody>
              </Table>
            </Card>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              <Card>
                <SectionHeading title="Conformité NF Z42-013" level={3} />
                {/* TODO: migrer compliance vers Convex */}
                {COMPLIANCE.map((c) => (
                  <div
                    key={c.title}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      padding: "8px 0",
                      borderBottom: "1px solid var(--ink-150)",
                    }}
                  >
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: "var(--success-500)",
                        color: "white",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      <Icon name="check" size={11} stroke={3} />
                    </span>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600 }}>{c.title}</div>
                      <div style={{ fontSize: 12.5, color: "var(--ink-600)" }}>
                        {c.description}
                      </div>
                    </div>
                  </div>
                ))}
              </Card>
              <Card>
                <SectionHeading
                  title="Élimination réglementaire"
                  subtitle={`${stats.pendingDestruction} unités d'archives à éliminer après visa du Directeur des Archives Nationales.`}
                  level={3}
                  action={
                    <Button variant="secondary" icon="trash" size="sm">
                      Préparer bordereau
                    </Button>
                  }
                />
                <div
                  style={{
                    background: "var(--warning-50)",
                    border: "1px solid #f0c269",
                    borderRadius: 6,
                    padding: 12,
                    fontSize: 13,
                    color: "var(--ink-700)",
                  }}
                >
                  <Icon
                    name="alertTriangle"
                    size={13}
                    style={{
                      verticalAlign: "middle",
                      marginRight: 6,
                      color: "var(--warning-600)",
                    }}
                  />
                  <b>{ELIMINATION_LOTS.length} lots à valider.</b> Bordereau
                  d&apos;élimination généré le 18/05, en attente du visa de la DGAN.
                </div>
                {/* TODO: migrer elimination lots vers Convex */}
                {ELIMINATION_LOTS.map((l) => (
                  <div
                    key={l.title}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 0",
                      borderBottom: "1px solid var(--ink-150)",
                    }}
                  >
                    <Checkbox checked={true} id={l.title} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600 }}>{l.title}</div>
                      <div style={{ fontSize: 12, color: "var(--ink-600)" }}>
                        {l.count} unités · {l.sort}
                      </div>
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          </div>
        </main>
      </div>
    </Frame>
  )
}
