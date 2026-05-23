import {
  Alert,
  AppHeader,
  Badge,
  Button,
  Card,
  Frame,
  Icon,
  PageHeader,
  Progress,
  SectionHeading,
  Select,
  Sidebar,
  Sparkline,
  StatCard,
  Table,
  Tabs,
  Td,
  Th,
  Tr,
  type IconName,
} from "@workspace/ui"
import {
  getCurrentPlatformUser,
  getPlatformActivity,
  getPlatformHealth,
  getPlatformKpis,
  getPlatformOrgVolumes,
  getPlatformVolume,
} from "@workspace/mocks/platform"
import { PLATFORM_NAV } from "@/lib/platform-nav"

export default async function PlatformSupervisionPage() {
  const [user, kpis, volume, health, orgVolumes, activity] = await Promise.all([
    getCurrentPlatformUser(),
    getPlatformKpis(),
    getPlatformVolume(),
    getPlatformHealth(),
    getPlatformOrgVolumes(),
    getPlatformActivity(),
  ])

  return (
    <Frame width={1440} height={1300}>
      <AppHeader org={user.org} user={user.name} role={user.role} />
      <div style={{ display: "flex" }}>
        <Sidebar items={PLATFORM_NAV} current="home" />
        <main style={{ flex: 1, overflow: "hidden" }}>
          <PageHeader
            breadcrumbs={["Supervision"]}
            title="Vue plateforme · temps réel"
            subtitle="47 organismes connectés · 128 services publiés · 312 480 demandes traitées en 2025"
            meta={
              <>
                <Badge tone="archived" dot icon="checkCircle">
                  Plateforme opérationnelle
                </Badge>
                <span style={{ fontSize: 12, color: "var(--ink-600)" }}>
                  Dernière sync · <b>il y a 4 sec</b>
                </span>
              </>
            }
            actions={
              <>
                <Select defaultValue="7">
                  <option value="7">7 derniers jours</option>
                  <option>30 derniers jours</option>
                  <option>2026 (année)</option>
                </Select>
                <Button variant="outline" icon="download">
                  Rapport
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
            {/* KPI principaux */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10 }}>
              {kpis.map((k) => (
                <StatCard
                  key={k.label}
                  label={k.label}
                  value={k.value}
                  icon={k.icon as IconName}
                  hint={k.hint}
                  delta={k.delta}
                  deltaTone={k.deltaTone}
                  accent={k.accent}
                />
              ))}
            </div>

            {/* Volume + santé */}
            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16 }}>
              <Card>
                <SectionHeading
                  title="Volume de demandes · plateforme entière"
                  level={3}
                  action={
                    <Tabs
                      tabs={[
                        { id: "v", label: "Volume" },
                        { id: "d", label: "Délais" },
                        { id: "s", label: "Satisfaction" },
                      ]}
                      current="v"
                      variant="pill"
                    />
                  }
                />
                <Sparkline values={volume} width={760} height={180} />
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
                <SectionHeading
                  title="Santé des composants"
                  level={3}
                  action={
                    <Badge tone="archived" dot>
                      Tous OK
                    </Badge>
                  }
                />
                {health.map((c) => (
                  <div
                    key={c.title}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 0",
                      borderBottom: "1px solid var(--ink-150)",
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background:
                          c.status === "ok" ? "var(--success-500)" : "var(--warning-500)",
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600 }}>{c.title}</div>
                      <div style={{ fontSize: 12, color: "var(--ink-600)" }}>{c.description}</div>
                    </div>
                    <Badge tone={c.status === "ok" ? "archived" : "warning"} size="sm">
                      {c.status === "ok" ? "OK" : "Dégradé"}
                    </Badge>
                  </div>
                ))}
              </Card>
            </div>

            {/* Top organismes */}
            <Card>
              <SectionHeading
                title="Activité par organisme"
                subtitle="Top 8 organismes par volume de demandes traitées sur 7 jours."
                level={3}
                action={
                  <a
                    href="/organisations"
                    style={{ textDecoration: "none", display: "inline-flex" }}
                  >
                    <Button variant="ghost" iconRight="arrowRight" size="sm">
                      Voir les 47 →
                    </Button>
                  </a>
                }
              />
              <Table>
                <thead>
                  <tr>
                    <Th>Organisme</Th>
                    <Th sortable>Demandes 7 j</Th>
                    <Th>Services actifs</Th>
                    <Th>Délai moy.</Th>
                    <Th>Satisfaction</Th>
                    <Th>Capacité</Th>
                    <Th>Statut</Th>
                  </tr>
                </thead>
                <tbody>
                  {orgVolumes.map((r) => (
                    <Tr key={r.name}>
                      <Td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <Icon
                            name="building"
                            size={16}
                            style={{ color: "var(--primary-500)" }}
                          />
                          <span style={{ fontWeight: 600 }}>{r.name}</span>
                        </div>
                      </Td>
                      <Td style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                        {r.volume.toLocaleString("fr-FR")}
                      </Td>
                      <Td>{r.services}</Td>
                      <Td>{r.delay}</Td>
                      <Td>
                        <span>
                          <Icon
                            name="star"
                            size={12}
                            style={{
                              color: "var(--warning-500)",
                              verticalAlign: "middle",
                              marginRight: 4,
                            }}
                          />
                          {r.satisfaction}/5
                        </span>
                      </Td>
                      <Td style={{ minWidth: 160 }}>
                        <Progress
                          value={r.capacity}
                          label={r.capacity + " %"}
                          tone={r.capacity > 85 ? "warning" : "primary"}
                        />
                      </Td>
                      <Td>
                        <Badge tone={r.statusTone} dot>
                          {r.status}
                        </Badge>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </Card>

            {/* Alertes + activité */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Card>
                <SectionHeading title="Alertes en cours" level={3} />
                <Alert tone="warning" title="CNAMGS · délai de traitement en hausse">
                  Le délai moyen est passé à 4 j (+38 % vs 7 j précédents). Cause probable : pic
                  d&apos;affiliations.
                  <div style={{ marginTop: 6, display: "flex", gap: 10 }}>
                    <a href="#" style={{ fontWeight: 600 }}>
                      Examiner →
                    </a>
                    <a href="#" style={{ fontWeight: 600 }}>
                      Notifier le DG →
                    </a>
                  </div>
                </Alert>
                <div style={{ height: 8 }} />
                <Alert
                  tone="info"
                  title="3 nouvelles administrations en cours d'onboarding"
                >
                  ARSEE (Énergie), Conseil constitutionnel, DG Tourisme. Étape : signature de la
                  convention.
                </Alert>
                <div style={{ height: 8 }} />
                <Alert tone="warning" title="CDN Mvengue · latence p95 élevée">
                  Bascule automatique sur le nœud d&apos;Owendo activée. Aucun impact citoyen
                  détecté.
                </Alert>
              </Card>
              <Card>
                <SectionHeading title="Activité plateforme" level={3} />
                {activity.map((a, i) => (
                  <div
                    key={`${a.who}-${i}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 0",
                      borderBottom:
                        i === activity.length - 1 ? "none" : "1px solid var(--ink-150)",
                    }}
                  >
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        background: "var(--ink-100)",
                        color: "var(--ink-600)",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon name={a.icon as IconName} size={14} />
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13 }}>
                        <b>{a.who}</b> {a.action}{" "}
                        <a href="#" style={{ fontWeight: 600 }}>
                          {a.what}
                        </a>
                      </div>
                    </div>
                    <span style={{ fontSize: 11.5, color: "var(--ink-500)" }}>{a.when}</span>
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
