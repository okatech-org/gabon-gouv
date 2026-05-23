import { redirect } from "next/navigation"
import {
  AppHeader,
  Avatar,
  Badge,
  Button,
  Frame,
  Icon,
  PageHeader,
  Select,
  Sidebar,
  Table,
  Td,
  TextInput,
  Th,
  Tr,
} from "@workspace/ui"
import { api } from "@workspace/backend/generated"
import { ADMIN_NAV } from "@/lib/admin-nav"
import { convex } from "@/lib/convex"
import { getCurrentAgent } from "@/lib/current-agent"
import { agentRoleLabel } from "@/lib/format"

interface DirectoryRow {
  name: string
  shortName?: string
  category: string
  tutelage?: string
  province?: string
  servicesCount: number
  connection?: string
  referent: string
}

function categoryLabel(c: string): string {
  switch (c) {
    case "direction_generale":
      return "Direction générale"
    case "ministere":
      return "Ministère"
    case "agence":
      return "Agence"
    case "etablissement_public":
      return "Établissement public"
    case "mairie":
      return "Mairie"
    case "prefecture":
      return "Préfecture"
    case "tribunal":
      return "Tribunal"
    case "caisse":
      return "Caisse"
    default:
      return c
  }
}

function connectionLabel(c?: string): string {
  if (!c) return "—"
  switch (c) {
    case "api_sso":
      return "API + SSO"
    case "api":
      return "API"
    case "sso":
      return "SSO"
    case "manual":
      return "Manuelle"
    default:
      return c
  }
}

export default async function AdminDirectoryPage() {
  const session = await getCurrentAgent()
  if (!session) redirect("/login")

  const directory = (await convex.query(api.admin.directory.list, {
    token: session.token,
  })) as DirectoryRow[]

  const total = directory.length

  return (
    <Frame width={1440} height={950}>
      <AppHeader
        org={session.agent.organism?.shortName ?? session.agent.organism?.name}
        user={session.agent.name}
        role={agentRoleLabel(session.agent.role)}
      />
      <div style={{ display: "flex" }}>
        <Sidebar items={ADMIN_NAV} current="annuaire" />
        <main style={{ flex: 1, overflow: "hidden" }}>
          <PageHeader
            breadcrumbs={["Annuaire des administrations"]}
            title="Annuaire inter-administrations"
            subtitle={`${total} administration${total > 1 ? "s" : ""} connectée${total > 1 ? "s" : ""} · contacts officiels & circuits validés`}
            actions={
              <>
                <Button variant="outline" icon="download">
                  Export
                </Button>
                <Button variant="outline" icon="filter">
                  Filtres
                </Button>
              </>
            }
          />
          <div style={{ padding: "20px 32px" }}>
            <div style={{ display: "flex", gap: 12, marginBottom: 18 }}>
              <TextInput
                placeholder="Rechercher une administration, un service, un contact…"
                icon="search"
                style={{ width: 420 }}
              />
              <Select defaultValue="all" style={{ width: 200 }}>
                <option value="all">Toutes les catégories</option>
              </Select>
              <Select defaultValue="all" style={{ width: 200 }}>
                <option value="all">Toutes provinces</option>
              </Select>
            </div>

            <Table>
              <thead>
                <tr>
                  <Th>Administration</Th>
                  <Th>Catégorie</Th>
                  <Th>Tutelle</Th>
                  <Th>Services</Th>
                  <Th>Référent</Th>
                  <Th>Connexion</Th>
                  <Th>{" "}</Th>
                </tr>
              </thead>
              <tbody>
                {directory.map((o) => {
                  const connLabel = connectionLabel(o.connection)
                  return (
                    <Tr key={o.name}>
                      <Td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <Icon
                            name="building"
                            size={16}
                            style={{ color: "var(--primary-500)" }}
                          />
                          <span style={{ fontWeight: 600 }}>
                            {o.shortName ?? o.name}
                          </span>
                        </div>
                      </Td>
                      <Td>{categoryLabel(o.category)}</Td>
                      <Td style={{ color: "var(--ink-600)" }}>{o.tutelage ?? "—"}</Td>
                      <Td>
                        <Badge tone="primary" size="sm">
                          {o.servicesCount} services
                        </Badge>
                      </Td>
                      <Td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Avatar name={o.referent} tone="primary" size={22} />
                          <span>{o.referent}</span>
                        </div>
                      </Td>
                      <Td>
                        {connLabel === "API + SSO" ? (
                          <Badge tone="archived" size="sm" dot>
                            {connLabel}
                          </Badge>
                        ) : (
                          <Badge tone="neutral" size="sm" dot>
                            {connLabel}
                          </Badge>
                        )}
                      </Td>
                      <Td>
                        <Button variant="ghost" size="sm" iconRight="arrowRight">
                          Contacter
                        </Button>
                      </Td>
                    </Tr>
                  )
                })}
              </tbody>
            </Table>
          </div>
        </main>
      </div>
    </Frame>
  )
}
