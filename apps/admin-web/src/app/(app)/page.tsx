import Link from "next/link"
import { redirect } from "next/navigation"
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  Icon,
  type IconName,
  PageHeader,
  SectionHeading,
  Sparkline,
  StatCard,
  Table,
  Tabs,
  Td,
  Th,
  Tr,
} from "@workspace/ui"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"
import { getCurrentAgent } from "@/lib/current-agent"
import {
  isUrgentDue,
  relativeTime,
  shortDateTime,
  statusBadge,
} from "@/lib/format"

interface DashboardKpi {
  label: string
  value: string
  icon: string
  hint?: string
}

interface AssignedRequest {
  ref: string
  title: string
  citizen: string
  status: string
  statusKey: string
  dueAt?: number
  depositedAt: number
  progressPct: number
}

interface DashboardData {
  kpis: DashboardKpi[]
  assigned: AssignedRequest[]
}

// TODO: placeholder — pas encore de query Convex pour ces données.
const VOLUME_LAST_30_DAYS = [
  42, 58, 51, 73, 64, 88, 79, 92, 71, 84, 96, 81, 103, 94, 88, 112, 106, 98, 124, 117, 109,
  134, 128, 119, 142, 138, 126, 151, 146, 148,
]

// TODO: placeholder — pas encore de query Convex pour la répartition par type.
const DISTRIBUTION = [
  { title: "Acte de naissance", count: 142, pct: 48, color: "var(--primary-500)" },
  { title: "Acte de mariage", count: 68, pct: 23, color: "var(--success-500)" },
  { title: "Certificat de nationalité", count: 52, pct: 17, color: "var(--warning-500)" },
  { title: "Acte de décès", count: 26, pct: 9, color: "var(--ink-500)" },
  { title: "Autres", count: 10, pct: 3, color: "var(--ink-300)" },
]

// TODO: placeholder — pas encore de query Convex pour l'activité équipe.
const TEAM_ACTIVITY = [
  { who: "P. MOUSSAVOU", action: "a signé", what: "Acte EC-LBV-2026-04812", when: "il y a 12 min" },
  { who: "C. NDONG", action: "a versé", what: "32 actes au SAE", when: "il y a 1 h" },
  { who: "L. EYEGHE", action: "a transféré", what: "Dossier #4812 à DGI", when: "il y a 3 h" },
  { who: "Système", action: "a généré", what: "14 certificats automatiques", when: "il y a 5 h" },
]

export default async function AdminDashboardPage() {
  const session = await getCurrentAgent()
  if (!session) redirect("/login")

  const dashboard = (await convex.query(api.admin.dashboard.getDashboard, {
    token: session.token,
  })) as DashboardData

  const firstName = session.agent.name.split(" ")[0]
  const queuedKpi = dashboard.kpis.find((k) => k.label === "En file d'attente")?.value ?? "—"
  const inProgressKpi =
    dashboard.kpis.find((k) => k.label === "En cours")?.value ?? "—"
  const assignedCount = dashboard.assigned.length

  return (
    <>
      <PageHeader
        breadcrumbs={[
          session.agent.organism?.shortName ?? "Organisme",
          "Tableau de bord",
        ]}
        title={`Bonjour ${firstName} 👋`}
        subtitle={`${queuedKpi} demande${Number(queuedKpi) > 1 ? "s" : ""} en file d'attente · ${assignedCount} vous ${assignedCount > 1 ? "sont" : "est"} assignée${assignedCount > 1 ? "s" : ""} · ${inProgressKpi} en cours.`}
        actions={
          <>
            <Button variant="secondary" icon="download">
              Exporter
            </Button>
            <Button icon="plus">Nouvelle action</Button>
          </>
        }
      />
      <div
        style={{
          padding: "24px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
          maxWidth: 1400,
          width: "100%",
        }}
      >
        {/* KPI top */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
          {dashboard.kpis.map((k) => (
            <StatCard
              key={k.label}
              label={k.label}
              value={k.value}
              icon={k.icon as IconName}
              hint={k.hint}
            />
          ))}
        </div>

        {/* Volume + breakdown */}
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16 }}>
          <Card>
            <SectionHeading
              title="Volume traité · 30 derniers jours"
              level={3}
              action={
                <Tabs
                  tabs={[
                    { id: "d", label: "Demandes" },
                    { id: "d2", label: "Délais" },
                  ]}
                  current="d"
                  variant="pill"
                />
              }
            />
            <Sparkline values={VOLUME_LAST_30_DAYS} width={760} height={160} />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                color: "var(--ink-500)",
                marginTop: 4,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <span>21 avr.</span>
              <span>1 mai</span>
              <span>10 mai</span>
              <span>20 mai</span>
            </div>
          </Card>
          <Card>
            <SectionHeading title="Répartition par type" level={3} />
            {DISTRIBUTION.map((r) => (
              <div key={r.title} style={{ marginTop: 8 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12.5,
                    marginBottom: 4,
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 2,
                        background: r.color,
                      }}
                    />
                    {r.title}
                  </span>
                  <span style={{ fontWeight: 600 }}>
                    {r.count} · {r.pct} %
                  </span>
                </div>
                <div style={{ height: 5, background: "var(--ink-150)", borderRadius: 999 }}>
                  <div
                    style={{
                      width: `${r.pct}%`,
                      height: "100%",
                      background: r.color,
                      borderRadius: 999,
                    }}
                  />
                </div>
              </div>
            ))}
          </Card>
        </div>

        {/* Mes demandes assignées */}
        <Card>
          <SectionHeading
            title="Mes demandes assignées"
            level={3}
            action={
              <div style={{ display: "flex", gap: 8 }}>
                <Tabs
                  tabs={[
                    { id: "a", label: `À traiter (${assignedCount})` },
                    { id: "b", label: "En attente citoyen" },
                    { id: "c", label: "Terminées" },
                  ]}
                  current="a"
                  variant="pill"
                />
              </div>
            }
          />
          <Table>
            <thead>
              <tr>
                <Th>
                  <Checkbox checked={false} id="all" />
                </Th>
                <Th sortable>Référence</Th>
                <Th>Démarche</Th>
                <Th>Citoyen</Th>
                <Th sortable>Déposée</Th>
                <Th>Échéance</Th>
                <Th>Statut</Th>
                <Th>{" "}</Th>
              </tr>
            </thead>
            <tbody>
              {dashboard.assigned.map((r) => {
                const status = statusBadge(r.statusKey)
                const urgent = isUrgentDue(r.dueAt)
                return (
                  <Tr key={r.ref}>
                    <Td>
                      <Checkbox checked={false} id={r.ref} />
                    </Td>
                    <Td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                      <Link
                        href={`/demandes/${r.ref}`}
                        style={{ color: "inherit", textDecoration: "none" }}
                      >
                        {r.ref}
                      </Link>
                    </Td>
                    <Td style={{ fontWeight: 600 }}>{r.title}</Td>
                    <Td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Avatar name={r.citizen} tone="green" size={24} />
                        <span>{r.citizen}</span>
                      </div>
                    </Td>
                    <Td style={{ color: "var(--ink-600)" }}>
                      {shortDateTime(r.depositedAt)}
                    </Td>
                    <Td>
                      {r.dueAt ? (
                        urgent ? (
                          <Badge tone="danger" size="sm" dot>
                            {relativeTime(r.dueAt)}
                          </Badge>
                        ) : (
                          <span style={{ color: "var(--ink-700)" }}>
                            {relativeTime(r.dueAt)}
                          </span>
                        )
                      ) : (
                        <span style={{ color: "var(--ink-400)" }}>—</span>
                      )}
                    </Td>
                    <Td>
                      <Badge tone={status.tone} dot>
                        {status.label}
                      </Badge>
                    </Td>
                    <Td>
                      <Icon
                        name="chevronRight"
                        size={16}
                        style={{ color: "var(--ink-400)" }}
                      />
                    </Td>
                  </Tr>
                )
              })}
            </tbody>
          </Table>
        </Card>

        {/* Alerts row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Card>
            <SectionHeading title="Activité de l&apos;équipe" level={3} />
            {/* TODO: placeholder — pas encore de query Convex pour l'activité équipe. */}
            {TEAM_ACTIVITY.map((a, i) => (
              <div
                key={`${a.who}-${i}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 0",
                  borderBottom:
                    i === TEAM_ACTIVITY.length - 1 ? "none" : "1px solid var(--ink-150)",
                }}
              >
                <Avatar
                  name={a.who}
                  tone={a.who === "Système" ? "amber" : "primary"}
                  size={28}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13 }}>
                    <b>{a.who}</b> {a.action}{" "}
                    <a href="#" style={{ fontWeight: 600 }}>
                      {a.what}
                    </a>
                  </div>
                </div>
                <span style={{ fontSize: 12, color: "var(--ink-500)" }}>{a.when}</span>
              </div>
            ))}
          </Card>
          <Card>
            <SectionHeading title="À votre attention" level={3} />
            <Alert tone="danger" title="2 dossiers en retard">
              Échéance dépassée pour les références GC-2026-EC-002814 et GC-2026-EC-002791.
              <div style={{ marginTop: 6 }}>
                <Link href="/demandes" style={{ fontWeight: 600 }}>
                  Voir les dossiers →
                </Link>
              </div>
            </Alert>
            <div style={{ height: 8 }} />
            <Alert tone="warning" title="Maintenance SAE planifiée">
              Indisponibilité prévue le 28 mai entre 2h et 4h du matin.
            </Alert>
            <div style={{ height: 8 }} />
            <Alert tone="info" title="Nouveau service publié">
              « Légalisation de signature » est désormais ouvert au catalogue citoyen.
            </Alert>
          </Card>
        </div>
      </div>
    </>
  )
}
