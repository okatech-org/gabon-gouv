import {
  AppHeader,
  Badge,
  Button,
  Frame,
  Icon,
  PageHeader,
  Sidebar,
  Table,
  Tabs,
  Td,
  TextInput,
  Th,
  Tr,
} from "@workspace/ui"
import { getAdminServices, getCurrentAdmin } from "@workspace/mocks/admin"
import { ADMIN_NAV } from "@/lib/admin-nav"

export default async function AdminServicesPage() {
  const [admin, services] = await Promise.all([getCurrentAdmin(), getAdminServices()])

  return (
    <Frame width={1440} height={900}>
      <AppHeader org={admin.org} user={admin.name} role={admin.role} />
      <div style={{ display: "flex" }}>
        <Sidebar items={ADMIN_NAV} current="services" />
        <main style={{ flex: 1, overflow: "hidden" }}>
          <PageHeader
            breadcrumbs={["Mes services"]}
            title="Services proposés au public"
            subtitle="14 services publiés au catalogue Gabon Connect · 2 en projet"
            actions={
              <>
                <Button variant="outline" icon="copy">
                  Dupliquer
                </Button>
                <Button icon="plus">Créer un service</Button>
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
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Tabs
                tabs={[
                  { id: "all", label: "Tous (16)" },
                  { id: "pub", label: "Publiés (14)" },
                  { id: "draft", label: "Brouillons (2)" },
                  { id: "arch", label: "Archivés" },
                ]}
                current="all"
                variant="pill"
              />
              <div style={{ flex: 1 }} />
              <TextInput
                placeholder="Rechercher un service…"
                icon="search"
                style={{ width: 280 }}
              />
            </div>

            <Table>
              <thead>
                <tr>
                  <Th>Service</Th>
                  <Th>Catégorie</Th>
                  <Th>Statut</Th>
                  <Th sortable>Demandes 30 j</Th>
                  <Th>Délai moyen</Th>
                  <Th>Satisfaction</Th>
                  <Th>Coût</Th>
                  <Th>Mise à jour</Th>
                  <Th>{" "}</Th>
                </tr>
              </thead>
              <tbody>
                {services.map((s) => (
                  <Tr key={s.title}>
                    <Td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Icon
                          name="layers"
                          size={16}
                          style={{ color: "var(--primary-500)" }}
                        />
                        <span style={{ fontWeight: 600 }}>{s.title}</span>
                      </div>
                    </Td>
                    <Td>{s.category}</Td>
                    <Td>
                      <Badge tone={s.statusTone} dot>
                        {s.status}
                      </Badge>
                    </Td>
                    <Td
                      style={{
                        fontWeight: 600,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {s.requests30d}
                    </Td>
                    <Td>{s.delay}</Td>
                    <Td>
                      {s.satisfaction !== "—" ? (
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
                          {s.satisfaction}/5
                        </span>
                      ) : (
                        "—"
                      )}
                    </Td>
                    <Td>{s.fee}</Td>
                    <Td style={{ color: "var(--ink-600)" }}>{s.updatedAt}</Td>
                    <Td>
                      <Icon name="moreH" size={16} style={{ color: "var(--ink-400)" }} />
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
