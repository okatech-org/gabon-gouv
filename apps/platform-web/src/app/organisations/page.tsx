import {
  AppHeader,
  Badge,
  Button,
  Card,
  Frame,
  Icon,
  PageHeader,
  Select,
  Sidebar,
  StatCard,
  Table,
  Tabs,
  Td,
  TextInput,
  Th,
  Tr,
} from "@workspace/ui"
import {
  getCurrentPlatformUser,
  getPlatformOrgs,
} from "@workspace/mocks/platform"
import { PLATFORM_NAV } from "@/lib/platform-nav"

export default async function PlatformOrgsPage() {
  const [user, orgs] = await Promise.all([
    getCurrentPlatformUser(),
    getPlatformOrgs(),
  ])

  return (
    <Frame width={1440} height={1000}>
      <AppHeader org={user.org} user={user.name} role={user.role} />
      <div style={{ display: "flex" }}>
        <Sidebar items={PLATFORM_NAV} current="orgs" />
        <main style={{ flex: 1, overflow: "hidden" }}>
          <PageHeader
            breadcrumbs={["Organisations"]}
            title="Organisations enregistrées"
            subtitle="47 administrations actives · 3 en onboarding · 1 suspendue"
            actions={
              <>
                <Button variant="outline" icon="download">
                  Export
                </Button>
                <Button icon="plus">Enregistrer une administration</Button>
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
              <StatCard label="Total" value="51" icon="building" />
              <StatCard label="Actives" value="47" icon="checkCircle" hint="92 %" />
              <StatCard label="En onboarding" value="3" icon="userCheck" />
              <StatCard label="Suspendues" value="1" icon="alertTriangle" />
              <StatCard label="Provinces couvertes" value="9 / 9" icon="mapPin" />
            </div>

            <Card>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <Tabs
                  tabs={[
                    { id: "all", label: "Toutes (51)" },
                    { id: "act", label: "Actives (47)" },
                    { id: "on", label: "Onboarding (3)" },
                    { id: "sus", label: "Suspendues (1)" },
                  ]}
                  current="all"
                  variant="pill"
                />
                <div style={{ flex: 1 }} />
                <TextInput placeholder="Rechercher…" icon="search" style={{ width: 240 }} />
                <Select defaultValue="all" style={{ width: 180 }}>
                  <option value="all">Toutes catégories</option>
                </Select>
              </div>
              <Table>
                <thead>
                  <tr>
                    <Th>Organisation</Th>
                    <Th>Catégorie</Th>
                    <Th>Province</Th>
                    <Th>Statut</Th>
                    <Th>Connexion</Th>
                    <Th sortable>Services</Th>
                    <Th sortable>Volume 30 j</Th>
                    <Th>Conv. signée</Th>
                    <Th>{" "}</Th>
                  </tr>
                </thead>
                <tbody>
                  {orgs.map((o) => (
                    <Tr key={o.name}>
                      <Td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <Icon
                            name="building"
                            size={16}
                            style={{ color: "var(--primary-500)" }}
                          />
                          <span style={{ fontWeight: 600 }}>{o.name}</span>
                        </div>
                      </Td>
                      <Td>{o.category}</Td>
                      <Td>{o.province}</Td>
                      <Td>
                        <Badge tone={o.statusTone} dot>
                          {o.status}
                        </Badge>
                      </Td>
                      <Td>
                        {o.connection !== "—" ? (
                          <Badge
                            tone={o.connection === "API + SSO" ? "archived" : "neutral"}
                            size="sm"
                          >
                            {o.connection}
                          </Badge>
                        ) : (
                          <span style={{ color: "var(--ink-400)" }}>—</span>
                        )}
                      </Td>
                      <Td style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                        {o.services}
                      </Td>
                      <Td style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                        {o.volume}
                      </Td>
                      <Td>{o.signedAt}</Td>
                      <Td>
                        <Icon name="moreH" size={16} style={{ color: "var(--ink-400)" }} />
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          </div>
        </main>
      </div>
    </Frame>
  )
}
