import Link from "next/link"
import {
  Alert,
  Badge,
  Button,
  Card,
  Icon,
  PageHeader,
  Progress,
  SectionHeading,
  Select,
  Sparkline,
  StatCard,
  Table,
  Tabs,
  Td,
  Th,
  Tr,
  type IconName,
} from "@workspace/ui"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"
import { requirePlatformUser } from "@/lib/current-platform-user"

export default async function PlatformSupervisionPage() {
  const { token } = await requirePlatformUser()
  const data = await convex.query(api.platform.supervision.getSupervision, { token })
  const { kpis, volume, health, orgVolumes, activity } = data

  const activeKpi = kpis.find((k) => k.label === "Organismes actifs")
  const onboardingKpi = kpis.find((k) => k.label === "En onboarding")
  const requests7dKpi = kpis.find((k) => k.label === "Demandes 7 j")

  const subtitle = `${activeKpi?.value ?? "—"} administrations actives · ${onboardingKpi?.value ?? "—"} en onboarding · ${requests7dKpi?.value ?? "—"} demandes sur 7 jours`

  return (
    <>
      <PageHeader
        breadcrumbs={["Supervision"]}
        title="Vue plateforme · temps réel"
        subtitle={subtitle}
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
          maxWidth: 1400,
          width: "100%",
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
              <span>il y a 30 j</span>
              <span>il y a 20 j</span>
              <span>il y a 10 j</span>
              <span>aujourd&apos;hui</span>
            </div>
          </Card>
          <Card>
            <SectionHeading
              title="Santé des composants"
              level={3}
              action={
                <Badge tone={health.every((h) => h.status === "ok") ? "archived" : "warning"} dot>
                  {health.every((h) => h.status === "ok") ? "Tous OK" : "Vigilance"}
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
                      c.status === "ok"
                        ? "var(--success-500)"
                        : c.status === "warning"
                          ? "var(--warning-500)"
                          : "var(--danger-500)",
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{c.title}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-600)" }}>{c.description}</div>
                </div>
                <Badge
                  tone={c.status === "ok" ? "archived" : c.status === "warning" ? "warning" : "danger"}
                  size="sm"
                >
                  {c.status === "ok" ? "OK" : c.status === "warning" ? "Dégradé" : "KO"}
                </Badge>
              </div>
            ))}
          </Card>
        </div>

        {/* Top organismes */}
        <Card>
          <SectionHeading
            title="Activité par organisme"
            subtitle="Top 8 organismes par volume de demandes traitées sur 30 jours."
            level={3}
            action={
              <Link
                href="/organisations"
                style={{ textDecoration: "none", display: "inline-flex" }}
              >
                <Button variant="ghost" iconRight="arrowRight" size="sm">
                  Voir tout →
                </Button>
              </Link>
            }
          />
          <Table>
            <thead>
              <tr>
                <Th>Organisme</Th>
                <Th sortable>Demandes 30 j</Th>
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
                      {r.satisfaction}{r.satisfaction !== "—" ? "/5" : ""}
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
              title={`${onboardingKpi?.value ?? "0"} administrations en cours d'onboarding`}
            >
              Suivez l&apos;avancement dans la console{" "}
              <Link href="/onboarding" style={{ fontWeight: 600 }}>
                Onboarding
              </Link>
              .
            </Alert>
            <div style={{ height: 8 }} />
            <Alert tone="warning" title="CDN Mvengue · latence p95 élevée">
              Bascule automatique sur le nœud d&apos;Owendo activée. Aucun impact citoyen
              détecté.
            </Alert>
          </Card>
          <Card>
            <SectionHeading title="Activité plateforme" level={3} />
            {activity.length === 0 && (
              <div style={{ fontSize: 13, color: "var(--ink-500)", padding: 12 }}>
                Aucune activité enregistrée pour l&apos;instant.
              </div>
            )}
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
                    <span style={{ fontWeight: 600 }}>{a.what}</span>
                  </div>
                </div>
                <span style={{ fontSize: 11.5, color: "var(--ink-500)" }}>{a.when}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </>
  )
}
