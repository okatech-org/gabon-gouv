import {
  Badge,
  Card,
  Icon,
  PageHeader,
  Progress,
  SectionHeading,
  StatCard,
  type Tone,
} from "@workspace/ui"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"
import { requirePlatformUser } from "@/lib/current-platform-user"

export default async function PlatformInfrastructurePage() {
  const { token } = await requirePlatformUser()
  const { components, stats } = await convex.query(
    api.platform.infrastructure.listInfrastructure,
    { token },
  )

  const allOk = stats.degraded === 0 && stats.down === 0

  return (
    <>
      <PageHeader
        breadcrumbs={["Plateforme", "Infrastructure"]}
        title="Infrastructure & hébergement"
        subtitle={`${stats.total} composants supervisés · hébergement souverain Owendo + secours Mvengue.`}
        meta={
          allOk ? (
            <Badge tone="archived" dot icon="checkCircle">
              Plateforme opérationnelle
            </Badge>
          ) : (
            <Badge tone="warning" dot icon="alertTriangle">
              {stats.degraded} dégradé{stats.degraded > 1 ? "s" : ""}
              {stats.down > 0
                ? ` · ${stats.down} indisponible${stats.down > 1 ? "s" : ""}`
                : ""}
            </Badge>
          )
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
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 12,
          }}
          role="group"
          aria-label="Statistiques infrastructure"
        >
          <StatCard label="Composants" value={String(stats.total)} icon="server" />
          <StatCard
            label="Opérationnels"
            value={String(stats.ok)}
            icon="checkCircle"
            accent
          />
          <StatCard
            label="Dégradés"
            value={String(stats.degraded)}
            icon="alertTriangle"
          />
          <StatCard
            label="Indisponibles"
            value={String(stats.down)}
            icon="x"
          />
          <StatCard
            label="Uptime moyen 30 j"
            value={
              isFinite(stats.avgUptime) && stats.avgUptime > 0
                ? `${stats.avgUptime.toFixed(2)} %`
                : "—"
            }
            icon="activity"
          />
        </div>

        <SectionHeading
          title="État des composants"
          subtitle="Sondes mesurées toutes les 60 sec. Bascule automatique sur le nœud de secours en cas de dégradation."
          level={2}
        />

        <ul
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
            gap: 16,
            padding: 0,
            margin: 0,
            listStyle: "none",
          }}
          aria-label={`${components.length} composants`}
        >
          {components.map((c) => (
            <li key={c.id}>
              <article
                aria-labelledby={`comp-${c.id}`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  padding: 18,
                  background: "white",
                  border: `1px solid ${borderForStatus(c.currentStatus)}`,
                  borderRadius: 10,
                  boxShadow: "0 1px 2px rgba(14,26,43,.04)",
                  height: "100%",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <span
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: `${bgForStatus(c.currentStatus)}`,
                        color: `${fgForStatus(c.currentStatus)}`,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                      aria-hidden="true"
                    >
                      <Icon
                        name="server"
                        size={18}
                      />
                    </span>
                    <h3
                      id={`comp-${c.id}`}
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        margin: 0,
                        lineHeight: 1.3,
                      }}
                    >
                      {c.label}
                    </h3>
                  </div>
                  <Badge tone={toneForStatus(c.currentStatus)} dot>
                    {c.statusLabel}
                  </Badge>
                </div>
                {c.description && (
                  <p
                    style={{
                      fontSize: 12.5,
                      color: "var(--ink-600)",
                      margin: 0,
                      lineHeight: 1.4,
                    }}
                  >
                    {c.description}
                  </p>
                )}
                <dl
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr",
                    gap: "6px 12px",
                    fontSize: 12.5,
                    margin: 0,
                  }}
                >
                  <dt style={{ color: "var(--ink-500)" }}>Uptime 30 j</dt>
                  <dd style={{ margin: 0 }}>
                    {c.uptimePct30d != null ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span
                          style={{
                            fontVariantNumeric: "tabular-nums",
                            fontWeight: 600,
                          }}
                        >
                          {c.uptimePct30d.toFixed(2)} %
                        </span>
                        <div style={{ flex: 1 }}>
                          <Progress
                            value={c.uptimePct30d}
                            label=""
                            tone={
                              c.uptimePct30d >= 99.9
                                ? "success"
                                : c.uptimePct30d >= 99
                                  ? "primary"
                                  : "warning"
                            }
                          />
                        </div>
                      </div>
                    ) : (
                      "—"
                    )}
                  </dd>
                  <dt style={{ color: "var(--ink-500)" }}>Latence p95</dt>
                  <dd
                    style={{
                      margin: 0,
                      fontVariantNumeric: "tabular-nums",
                      fontWeight: 600,
                    }}
                  >
                    {c.latencyMsP95 != null ? `${c.latencyMsP95} ms` : "—"}
                  </dd>
                  {c.region && (
                    <>
                      <dt style={{ color: "var(--ink-500)" }}>Région</dt>
                      <dd style={{ margin: 0 }}>{c.region}</dd>
                    </>
                  )}
                  <dt style={{ color: "var(--ink-500)" }}>Dernière sonde</dt>
                  <dd style={{ margin: 0, color: "var(--ink-600)" }}>
                    {c.lastCheckedAt ? (
                      <time
                        dateTime={new Date(c.lastCheckedAt).toISOString()}
                      >
                        {c.lastCheckedRelative}
                      </time>
                    ) : (
                      "—"
                    )}
                  </dd>
                </dl>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}

function toneForStatus(s: string): Tone {
  switch (s) {
    case "ok":
      return "archived"
    case "degraded":
      return "warning"
    case "down":
      return "danger"
    case "maintenance":
      return "info"
    default:
      return "neutral"
  }
}

function bgForStatus(s: string): string {
  switch (s) {
    case "ok":
      return "var(--success-100, #dcfce7)"
    case "degraded":
      return "var(--warning-100, #fef3c7)"
    case "down":
      return "var(--danger-100, #fee2e2)"
    case "maintenance":
      return "var(--info-100, #e0f2fe)"
    default:
      return "var(--ink-100)"
  }
}

function fgForStatus(s: string): string {
  switch (s) {
    case "ok":
      return "var(--success-600, #15803d)"
    case "degraded":
      return "var(--warning-600, #b45309)"
    case "down":
      return "var(--danger-600, #b91c1c)"
    case "maintenance":
      return "var(--primary-600)"
    default:
      return "var(--ink-600)"
  }
}

function borderForStatus(s: string): string {
  switch (s) {
    case "down":
      return "var(--danger-300, #fca5a5)"
    case "degraded":
      return "var(--warning-300, #fcd34d)"
    default:
      return "var(--ink-200)"
  }
}
