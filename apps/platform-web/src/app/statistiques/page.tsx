import {
  AppHeader,
  Button,
  Card,
  Donut,
  Frame,
  PageHeader,
  SectionHeading,
  Select,
  Sidebar,
  Sparkline,
  StatCard,
  Tabs,
  type IconName,
} from "@workspace/ui"
import {
  getCurrentPlatformUser,
  getImpactKpis,
  getProvinces,
  getSatisfactionDistribution,
  getTopDemands,
  getYearVolume,
} from "@workspace/mocks/platform"
import { PLATFORM_NAV } from "@/lib/platform-nav"

const MONTHS = ["Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc.", "Janv.", "Févr.", "Mars", "Avril", "Mai"]

export default async function PlatformStatsPage() {
  const [user, impactKpis, yearVolume, topDemands, provinces, satisfaction] = await Promise.all([
    getCurrentPlatformUser(),
    getImpactKpis(),
    getYearVolume(),
    getTopDemands(),
    getProvinces(),
    getSatisfactionDistribution(),
  ])

  return (
    <Frame width={1440} height={1200}>
      <AppHeader org={user.org} user={user.name} role={user.role} />
      <div style={{ display: "flex" }}>
        <Sidebar items={PLATFORM_NAV} current="stats" />
        <main style={{ flex: 1, overflow: "hidden" }}>
          <PageHeader
            breadcrumbs={["Statistiques"]}
            title="Statistiques d'usage"
            subtitle="Rapport public · indicateurs d'impact de la transformation numérique"
            actions={
              <>
                <Select defaultValue="2026">
                  <option value="2026">Année 2026</option>
                  <option>2025</option>
                </Select>
                <Button variant="outline" icon="printer">
                  Rapport PDF
                </Button>
                <Button variant="outline" icon="share">
                  Partager
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
            {/* Key impact */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {impactKpis.map((k) => (
                <StatCard
                  key={k.label}
                  label={k.label}
                  value={k.value}
                  icon={k.icon as IconName}
                  delta={k.delta}
                  deltaTone={k.deltaTone}
                  hint={k.hint}
                  accent={k.accent}
                />
              ))}
            </div>

            {/* Évolution annuelle */}
            <Card>
              <SectionHeading
                title="Demandes traitées · 12 derniers mois"
                level={3}
                action={
                  <Tabs
                    tabs={[
                      { id: "v", label: "Volume" },
                      { id: "d", label: "Délais" },
                      { id: "c", label: "Catégories" },
                    ]}
                    current="v"
                    variant="pill"
                  />
                }
              />
              <Sparkline values={yearVolume} width={1200} height={200} />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  color: "var(--ink-500)",
                  marginTop: 4,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {MONTHS.map((m) => (
                  <span key={m}>{m}</span>
                ))}
              </div>
            </Card>

            {/* Decomposition + provinces */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Card>
                <SectionHeading title="Top 8 démarches" level={3} />
                {topDemands.map((r) => (
                  <div
                    key={r.title}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 80px",
                      alignItems: "center",
                      gap: 12,
                      padding: "8px 0",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 13,
                          marginBottom: 4,
                        }}
                      >
                        <span style={{ fontWeight: 500 }}>{r.title}</span>
                        <span
                          style={{
                            fontVariantNumeric: "tabular-nums",
                            color: "var(--ink-600)",
                            fontSize: 12,
                          }}
                        >
                          {r.value.toLocaleString("fr-FR")}
                        </span>
                      </div>
                      <div style={{ height: 6, background: "var(--ink-150)", borderRadius: 999 }}>
                        <div
                          style={{
                            width: `${r.pct}%`,
                            height: "100%",
                            background: "var(--primary-500)",
                            borderRadius: 999,
                          }}
                        />
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--ink-700)",
                        textAlign: "right",
                      }}
                    >
                      {r.pct} %
                    </span>
                  </div>
                ))}
              </Card>
              <Card>
                <SectionHeading
                  title="Répartition par province"
                  subtitle="Demandes émises en 2026, en milliers."
                  level={3}
                />
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-end",
                    gap: 6,
                    height: 220,
                    paddingTop: 12,
                  }}
                >
                  {provinces.map((b, i) => (
                    <div
                      key={b.province}
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 6,
                        height: "100%",
                      }}
                    >
                      <div
                        style={{
                          flex: 1,
                          width: "100%",
                          display: "flex",
                          alignItems: "flex-end",
                        }}
                      >
                        <div
                          style={{
                            width: "100%",
                            height: `${b.pct}%`,
                            background:
                              i === 0 ? "var(--primary-500)" : "var(--primary-400)",
                            borderRadius: "4px 4px 0 0",
                            position: "relative",
                          }}
                        >
                          <span
                            style={{
                              position: "absolute",
                              top: -18,
                              left: "50%",
                              transform: "translateX(-50%)",
                              fontSize: 11,
                              fontWeight: 700,
                              color: "var(--ink-700)",
                            }}
                          >
                            {b.value} k
                          </span>
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          color: "var(--ink-600)",
                          textAlign: "center",
                          whiteSpace: "nowrap",
                          transform: "rotate(-30deg)",
                          transformOrigin: "top right",
                        }}
                      >
                        {b.province}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* SLA + Satisfaction */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              <Card>
                <SectionHeading title="Respect des SLA" level={3} />
                <div style={{ display: "flex", justifyContent: "center", padding: "14px 0" }}>
                  <Donut value={87} label="87 %" color="var(--success-500)" />
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--ink-600)",
                    textAlign: "center",
                  }}
                >
                  <b style={{ color: "var(--ink-900)" }}>271 678 / 312 480</b> demandes respectent
                  leur délai contractuel.
                </div>
              </Card>
              <Card>
                <SectionHeading title="Satisfaction citoyenne" level={3} />
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "14px 0",
                  }}
                >
                  <div
                    style={{
                      fontSize: 48,
                      fontWeight: 800,
                      letterSpacing: "-0.02em",
                      color: "var(--primary-500)",
                    }}
                  >
                    4,5
                    <span style={{ fontSize: 22, color: "var(--ink-500)" }}>/5</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    {[5, 4, 3, 2, 1].map((s) => (
                      <div
                        key={s}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 4,
                        }}
                      >
                        <span style={{ fontSize: 11, color: "var(--ink-600)", width: 12 }}>
                          {s}
                        </span>
                        <div
                          style={{
                            flex: 1,
                            height: 5,
                            background: "var(--ink-150)",
                            borderRadius: 999,
                          }}
                        >
                          <div
                            style={{
                              width: satisfaction[5 - s] + "%",
                              height: "100%",
                              background: "var(--warning-500)",
                              borderRadius: 999,
                            }}
                          />
                        </div>
                        <span
                          style={{
                            fontSize: 11,
                            color: "var(--ink-500)",
                            width: 32,
                            textAlign: "right",
                          }}
                        >
                          {satisfaction[5 - s]} %
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--ink-500)",
                    textAlign: "center",
                  }}
                >
                  Sur 18 412 avis vérifiés
                </div>
              </Card>
              <Card>
                <SectionHeading title="Adoption mobile" level={3} />
                <div style={{ display: "flex", justifyContent: "center", padding: "14px 0" }}>
                  <Donut value={68} label="68 %" color="var(--primary-500)" />
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--ink-600)",
                    textAlign: "center",
                  }}
                >
                  des démarches effectuées{" "}
                  <b style={{ color: "var(--ink-900)" }}>depuis un smartphone</b>.
                </div>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </Frame>
  )
}
