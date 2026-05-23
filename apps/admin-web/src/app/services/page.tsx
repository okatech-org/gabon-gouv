import { redirect } from "next/navigation"
import type { Tone } from "@workspace/ui"
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
import { api } from "@workspace/backend/generated"
import { ADMIN_NAV } from "@/lib/admin-nav"
import { convex } from "@/lib/convex"
import { getCurrentAgent } from "@/lib/current-agent"
import { agentRoleLabel } from "@/lib/format"

interface ServiceRow {
  slug: string
  title: string
  category: string
  status: string
  requests30d: number
  fee: string
  delayHours: number
  satisfaction?: number
}

function serviceStatusBadge(status: string): { label: string; tone: Tone } {
  switch (status) {
    case "published":
      return { label: "Publié", tone: "archived" }
    case "draft":
      return { label: "Brouillon", tone: "warning" }
    case "archived":
      return { label: "Archivé", tone: "neutral" }
    default:
      return { label: status, tone: "neutral" }
  }
}

function categoryLabel(c: string): string {
  switch (c) {
    case "etat_civil":
      return "État civil"
    case "documentation":
      return "Documentation"
    case "fiscalite":
      return "Fiscalité"
    case "social":
      return "Social"
    case "education":
      return "Éducation"
    case "sante":
      return "Santé"
    default:
      return c
  }
}

function formatDelay(hours: number): string {
  if (hours >= 48) {
    const d = Math.floor(hours / 24)
    const h = hours % 24
    return h > 0 ? `${d} j ${h} h` : `${d} j`
  }
  return `${hours} h`
}

function formatFee(fee: string): string {
  if (fee === "0" || fee === "0 FCFA" || fee === "gratuit") return "Gratuit"
  return fee
}

export default async function AdminServicesPage() {
  const session = await getCurrentAgent()
  if (!session) redirect("/login")

  const services = (await convex.query(api.admin.services.list, {
    token: session.token,
  })) as ServiceRow[]

  const published = services.filter((s) => s.status === "published").length
  const drafts = services.filter((s) => s.status === "draft").length
  const archived = services.filter((s) => s.status === "archived").length

  return (
    <Frame width={1440} height={900}>
      <AppHeader
        org={session.agent.organism?.shortName ?? session.agent.organism?.name}
        user={session.agent.name}
        role={agentRoleLabel(session.agent.role)}
      />
      <div style={{ display: "flex" }}>
        <Sidebar items={ADMIN_NAV} current="services" />
        <main style={{ flex: 1, overflow: "hidden" }}>
          <PageHeader
            breadcrumbs={["Mes services"]}
            title="Services proposés au public"
            subtitle={`${published} service${published > 1 ? "s" : ""} publié${published > 1 ? "s" : ""} au catalogue Gabon Connect · ${drafts} en projet`}
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
                  { id: "all", label: `Tous (${services.length})` },
                  { id: "pub", label: `Publiés (${published})` },
                  { id: "draft", label: `Brouillons (${drafts})` },
                  { id: "arch", label: `Archivés (${archived})` },
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
                  <Th>{" "}</Th>
                </tr>
              </thead>
              <tbody>
                {services.map((s) => {
                  const status = serviceStatusBadge(s.status)
                  return (
                    <Tr key={s.slug}>
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
                      <Td>{categoryLabel(s.category)}</Td>
                      <Td>
                        <Badge tone={status.tone} dot>
                          {status.label}
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
                      <Td>{formatDelay(s.delayHours)}</Td>
                      <Td>
                        {typeof s.satisfaction === "number" ? (
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
                            {s.satisfaction.toFixed(1).replace(".", ",")}/5
                          </span>
                        ) : (
                          "—"
                        )}
                      </Td>
                      <Td>{formatFee(s.fee)}</Td>
                      <Td>
                        <Icon name="moreH" size={16} style={{ color: "var(--ink-400)" }} />
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
