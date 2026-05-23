import {
  AppHeader,
  Avatar,
  Badge,
  Button,
  Card,
  Frame,
  Icon,
  type IconName,
  PageHeader,
  SectionHeading,
  Select,
  Sidebar,
  StatCard,
} from "@workspace/ui"
import { getCitizenFolder, getCurrentAdmin } from "@workspace/mocks/admin"
import { ADMIN_NAV } from "@/lib/admin-nav"

export default async function AdminCitizenFolderPage({
  params,
}: {
  params: Promise<{ nip: string }>
}) {
  const { nip } = await params
  const [admin, folder] = await Promise.all([getCurrentAdmin(), getCitizenFolder(nip)])
  const { citizen, habilitations, stats, timeline } = folder

  return (
    <Frame width={1440} height={1100}>
      <AppHeader org={admin.org} user={admin.name} role={admin.role} />
      <div style={{ display: "flex" }}>
        <Sidebar items={ADMIN_NAV} current="dossiers" />
        <main style={{ flex: 1, overflow: "hidden" }}>
          <PageHeader
            breadcrumbs={[
              <a key="d" href="/" style={{ color: "inherit" }}>
                Dossiers citoyens
              </a>,
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
                    <div style={{ fontSize: 12, color: "var(--ink-600)" }}>{citizen.age}</div>
                  </div>
                  <Badge tone="archived" dot icon="fingerprint">
                    Identité vérifiée
                  </Badge>
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
                  <span style={{ fontWeight: 500 }}>{citizen.createdAt}</span>
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
                {habilitations.map((h) => (
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
                  value={stats.requests}
                  icon="inbox"
                  hint="depuis 2023"
                />
                <StatCard
                  label="Documents reçus"
                  value={stats.documentsReceived}
                  icon="fileText"
                  hint="dont 14 scellés"
                />
                <StatCard label="Dossiers ouverts" value={stats.openCases} icon="folder" />
                <StatCard label="Ancienneté" value={stats.seniority} icon="clock" />
              </div>

              <Card>
                <SectionHeading
                  title="Timeline inter-administrations"
                  subtitle="Toutes les interactions de la citoyenne avec les administrations gabonaises."
                  level={3}
                  action={
                    <Select defaultValue="all" style={{ width: 200 }}>
                      <option>Toutes administrations</option>
                      <option>DG État Civil</option>
                    </Select>
                  }
                />
                {timeline.map((e, i, arr) => (
                  <div
                    key={`${e.date}-${i}`}
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
                        <Icon name={e.icon as IconName} size={15} />
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
                          {e.date}
                        </span>
                        <Badge tone="neutral" size="sm">
                          {e.org}
                        </Badge>
                        <Badge tone={e.statusTone} size="sm" dot>
                          {e.status}
                        </Badge>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>
                        {e.title}
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
