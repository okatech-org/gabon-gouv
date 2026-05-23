import {
  Badge,
  Button,
  Card,
  Icon,
  PageHeader,
  Select,
  StatCard,
  Table,
  Tabs,
  Td,
  TextInput,
  Th,
  Tr,
} from "@workspace/ui"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"
import { requirePlatformUser } from "@/lib/current-platform-user"
import { RegisterOrganismDialog } from "./register-organism-dialog"
import { OrganismActionsMenu } from "./organism-actions-menu"

export default async function PlatformOrgsPage() {
  const { token } = await requirePlatformUser()
  const [orgs, stats] = await Promise.all([
    convex.query(api.platform.organisms.listOrganisms, { token }),
    convex.query(api.platform.organisms.getRegistryStats, { token }),
  ])

  return (
    <>
      <PageHeader
        breadcrumbs={["Organisations"]}
        title="Organisations enregistrées"
        subtitle={`${stats.active} actives · ${stats.onboarding} en onboarding · ${stats.suspended} suspendue${stats.suspended > 1 ? "s" : ""}`}
        actions={
          <>
            <Button variant="outline" icon="download">
              Export
            </Button>
            <RegisterOrganismDialog />
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
          <StatCard label="Total" value={String(stats.total)} icon="building" />
          <StatCard
            label="Actives"
            value={String(stats.active)}
            icon="checkCircle"
            hint={
              stats.total > 0
                ? `${Math.round((stats.active / stats.total) * 100)} %`
                : "—"
            }
          />
          <StatCard label="En onboarding" value={String(stats.onboarding)} icon="userCheck" />
          <StatCard label="Suspendues" value={String(stats.suspended)} icon="alertTriangle" />
          <StatCard
            label="Provinces couvertes"
            value={`${stats.provinces} / 9`}
            icon="mapPin"
          />
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
                { id: "all", label: `Toutes (${stats.total})` },
                { id: "act", label: `Actives (${stats.active})` },
                { id: "on", label: `Onboarding (${stats.onboarding})` },
                { id: "sus", label: `Suspendues (${stats.suspended})` },
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
                <Tr key={o.id}>
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
                    <OrganismActionsMenu
                      organismId={o.id}
                      organismName={o.shortName ?? o.name}
                      status={o.rawStatus}
                    />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>
    </>
  )
}
