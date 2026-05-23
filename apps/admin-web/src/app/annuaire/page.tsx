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
import { getAdminDirectory, getCurrentAdmin } from "@workspace/mocks/admin"
import { ADMIN_NAV } from "@/lib/admin-nav"

export default async function AdminDirectoryPage() {
  const [admin, directory] = await Promise.all([getCurrentAdmin(), getAdminDirectory()])

  return (
    <Frame width={1440} height={950}>
      <AppHeader org={admin.org} user={admin.name} role={admin.role} />
      <div style={{ display: "flex" }}>
        <Sidebar items={ADMIN_NAV} current="annuaire" />
        <main style={{ flex: 1, overflow: "hidden" }}>
          <PageHeader
            breadcrumbs={["Annuaire des administrations"]}
            title="Annuaire inter-administrations"
            subtitle="47 administrations connectées · contacts officiels & circuits validés"
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
                {directory.map((o) => (
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
                    <Td style={{ color: "var(--ink-600)" }}>{o.tutelage}</Td>
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
                      {o.connection === "API + SSO" ? (
                        <Badge tone="archived" size="sm" dot>
                          {o.connection}
                        </Badge>
                      ) : (
                        <Badge tone="neutral" size="sm" dot>
                          {o.connection}
                        </Badge>
                      )}
                    </Td>
                    <Td>
                      <Button variant="ghost" size="sm" iconRight="arrowRight">
                        Contacter
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </div>
        </main>
      </div>
    </Frame>
  )
}
