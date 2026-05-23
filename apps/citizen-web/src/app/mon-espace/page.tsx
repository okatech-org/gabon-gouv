import {
  AppHeader,
  Badge,
  Button,
  Card,
  Frame,
  Icon,
  PageHeader,
  Progress,
  SectionHeading,
  Sidebar,
  StatCard,
  Table,
  Td,
  Th,
  Tr,
  type IconName,
} from "@workspace/ui"
import {
  getCitizenDashboardStats,
  getCitizenMessages,
  getCitizenRecommendations,
  getCitizenRequests,
  getCurrentCitizen,
} from "@workspace/mocks/citizen"
import { buildCitizenNav } from "@/lib/citizen-nav"

export default async function CitizenDashboardPage() {
  const [citizen, stats, requests, recommendations, messages] = await Promise.all([
    getCurrentCitizen(),
    getCitizenDashboardStats(),
    getCitizenRequests(),
    getCitizenRecommendations(),
    getCitizenMessages(),
  ])

  const unreadCount = messages.filter((m) => m.unread).length
  const navItems = buildCitizenNav({
    requestsInProgress: stats.inProgress,
    documentsReceived: stats.documentsReceived,
    unreadMessages: unreadCount,
  })

  const firstName = citizen.name.split(" ")[0]

  return (
    <Frame width={1440} height={900}>
      <AppHeader user={citizen.name} role="Citoyenne" />
      <div style={{ display: "flex", minHeight: "calc(900px - 63px)" }}>
        <Sidebar items={navItems} current="home" />
        <main style={{ flex: 1, overflow: "auto" }}>
          <PageHeader
            breadcrumbs={["Mon espace"]}
            title={`Bonjour ${firstName}`}
            subtitle={`${stats.inProgress} demandes en cours, 1 document à télécharger.`}
            actions={
              <>
                <a
                  href="/mon-espace/documents/EC-LBV-2026-04812"
                  style={{ textDecoration: "none", display: "inline-flex" }}
                >
                  <Button variant="secondary" icon="folderOpen">
                    Mes documents
                  </Button>
                </a>
                <a
                  href="/mon-espace/demarches/nouvelle"
                  style={{ textDecoration: "none", display: "inline-flex" }}
                >
                  <Button icon="plus">Nouvelle démarche</Button>
                </a>
              </>
            }
          />
          <div
            style={{
              padding: "24px 32px",
              display: "flex",
              flexDirection: "column",
              gap: 24,
            }}
          >
            {/* Stats */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 12,
              }}
            >
              <StatCard
                label="Demandes en cours"
                value={String(stats.inProgress)}
                icon="inbox"
                hint="dont 1 en attente"
              />
              <StatCard
                label="Documents reçus"
                value={String(stats.documentsReceived)}
                icon="fileText"
                hint="cette année"
              />
              <StatCard
                label="Délai moyen"
                value={stats.averageDelay}
                icon="clock"
                delta={stats.delayDelta?.value}
                deltaTone={stats.delayDelta?.tone}
                hint="vs 2024"
              />
              <StatCard
                label="Notifications"
                value={String(stats.notifications)}
                icon="bell"
                hint={stats.notificationsHint}
              />
            </div>

            {/* Demandes en cours */}
            <div>
              <SectionHeading
                title="Demandes en cours"
                action={
                  <a
                    href="/mon-espace/demarches/GC-2026-EC-002841"
                    style={{ fontSize: 13, fontWeight: 600 }}
                  >
                    Tout voir →
                  </a>
                }
              />
              <Table>
                <thead>
                  <tr>
                    <Th>Démarche</Th>
                    <Th>Administration</Th>
                    <Th>Référence</Th>
                    <Th>Déposée le</Th>
                    <Th>Statut</Th>
                    <Th>Avancement</Th>
                    <Th>{" "}</Th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <Tr key={r.ref}>
                      <Td>
                        <a
                          href={`/mon-espace/demarches/${r.ref}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            textDecoration: "none",
                            color: "inherit",
                          }}
                        >
                          <Icon
                            name="fileText"
                            size={16}
                            style={{ color: "var(--ink-500)" }}
                          />
                          <span style={{ fontWeight: 600 }}>{r.title}</span>
                        </a>
                      </Td>
                      <Td style={{ color: "var(--ink-600)" }}>{r.org}</Td>
                      <Td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 12,
                        }}
                      >
                        {r.ref}
                      </Td>
                      <Td>{r.depositedAt}</Td>
                      <Td>
                        <Badge tone={r.tone} dot>
                          {r.status}
                        </Badge>
                      </Td>
                      <Td style={{ minWidth: 160 }}>
                        <Progress
                          value={r.progress}
                          label={`${r.progress} %`}
                          tone={r.progress === 100 ? "success" : "primary"}
                        />
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
            </div>

            {/* Recommandations + Messages */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.4fr 1fr",
                gap: 16,
              }}
            >
              <Card>
                <SectionHeading
                  title="Démarches recommandées"
                  subtitle="Selon votre profil et vos précédentes démarches."
                  level={3}
                />
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                  }}
                >
                  {recommendations.map((r) => (
                    <a
                      key={r.id}
                      href="#"
                      style={{
                        border: "1px solid var(--ink-200)",
                        borderRadius: 8,
                        padding: 14,
                        display: "flex",
                        gap: 12,
                        textDecoration: "none",
                        color: "inherit",
                      }}
                    >
                      <span
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 6,
                          background: r.urgent
                            ? "var(--warning-100)"
                            : "var(--primary-50)",
                          color: r.urgent
                            ? "var(--warning-600)"
                            : "var(--primary-500)",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Icon name={r.icon as IconName} size={16} />
                      </span>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 700 }}>{r.title}</div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--ink-600)",
                            marginTop: 2,
                          }}
                        >
                          {r.description}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </Card>
              <Card>
                <SectionHeading
                  title="Derniers messages"
                  level={3}
                  action={
                    unreadCount > 0 ? (
                      <Badge tone="danger" size="sm">
                        {unreadCount} nouveau
                      </Badge>
                    ) : null
                  }
                />
                {messages.map((m, i) => (
                  <div
                    key={m.id}
                    style={{
                      display: "flex",
                      gap: 12,
                      paddingTop: i === 0 ? 0 : 14,
                      paddingBottom: 14,
                      borderBottom:
                        i === messages.length - 1 ? "none" : "1px solid var(--ink-150)",
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
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "var(--ink-600)",
                          }}
                        >
                          {m.who}
                        </span>
                        <span style={{ fontSize: 11, color: "var(--ink-500)" }}>
                          {m.when}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 13.5,
                          fontWeight: m.unread ? 700 : 600,
                          marginTop: 2,
                        }}
                      >
                        {m.title}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: "var(--ink-600)",
                          marginTop: 2,
                        }}
                      >
                        {m.description}
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
