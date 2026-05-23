import {
  Alert,
  AppHeader,
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  Frame,
  Icon,
  type IconName,
  PageHeader,
  SectionHeading,
  Sidebar,
  Sparkline,
  StatCard,
  Table,
  Tabs,
  Td,
  Th,
  Tr,
} from "@workspace/ui"
import {
  getAdminAssignedRequests,
  getAdminDashboardKpis,
  getAdminDistribution,
  getAdminTeamActivity,
  getAdminVolume30Days,
  getCurrentAdmin,
} from "@workspace/mocks/admin"
import { ADMIN_NAV } from "@/lib/admin-nav"

export default async function AdminDashboardPage() {
  const [admin, kpis, volume, distribution, assigned, activity] = await Promise.all([
    getCurrentAdmin(),
    getAdminDashboardKpis(),
    getAdminVolume30Days(),
    getAdminDistribution(),
    getAdminAssignedRequests(),
    getAdminTeamActivity(),
  ])

  return (
    <Frame width={1440} height={1100}>
      <AppHeader org={admin.org} user={admin.name} role={admin.role} />
      <div style={{ display: "flex", minHeight: "calc(1100px - 63px)" }}>
        <Sidebar items={ADMIN_NAV} current="home" />
        <main style={{ flex: 1, overflow: "hidden" }}>
          <PageHeader
            breadcrumbs={["DG État Civil", "Tableau de bord"]}
            title="Bonjour Yolande 👋"
            subtitle="47 demandes en file d'attente · 12 vous sont assignées · 3 en retard."
            actions={
              <>
                <Button variant="secondary" icon="download">
                  Exporter
                </Button>
                <Button icon="plus">Nouvelle action</Button>
              </>
            }
          />
          <div style={{ padding: "24px 32px", display: "flex", flexDirection: "column", gap: 24 }}>
            {/* KPI top */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
              {kpis.map((k) => (
                <StatCard
                  key={k.label}
                  label={k.label}
                  value={k.value}
                  icon={k.icon as IconName}
                  delta={k.delta}
                  deltaTone={k.deltaTone}
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
                <Sparkline values={volume} width={760} height={160} />
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
                {distribution.map((r) => (
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
                        { id: "a", label: "À traiter (12)" },
                        { id: "b", label: "En attente citoyen (4)" },
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
                  {assigned.map((r) => (
                    <Tr key={r.ref}>
                      <Td>
                        <Checkbox checked={false} id={r.ref} />
                      </Td>
                      <Td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                        <a
                          href={`/demandes/${r.ref}`}
                          style={{ color: "inherit", textDecoration: "none" }}
                        >
                          {r.ref}
                        </a>
                      </Td>
                      <Td style={{ fontWeight: 600 }}>{r.title}</Td>
                      <Td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Avatar name={r.citizen} tone="green" size={24} />
                          <span>{r.citizen}</span>
                        </div>
                      </Td>
                      <Td style={{ color: "var(--ink-600)" }}>{r.depositedAt}</Td>
                      <Td>
                        {r.urgent ? (
                          <Badge tone="danger" size="sm" dot>
                            {r.dueAt}
                          </Badge>
                        ) : (
                          <span style={{ color: "var(--ink-700)" }}>{r.dueAt}</span>
                        )}
                      </Td>
                      <Td>
                        <Badge tone={r.tone} dot>
                          {r.status}
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
                  ))}
                </tbody>
              </Table>
            </Card>

            {/* Alerts row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Card>
                <SectionHeading title="Activité de l'équipe" level={3} />
                {activity.map((a, i) => (
                  <div
                    key={`${a.who}-${i}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 0",
                      borderBottom:
                        i === activity.length - 1 ? "none" : "1px solid var(--ink-150)",
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
                    <a href="/demandes" style={{ fontWeight: 600 }}>
                      Voir les dossiers →
                    </a>
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
        </main>
      </div>
    </Frame>
  )
}
