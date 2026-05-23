import { redirect } from "next/navigation"
import {
  AppHeader,
  Avatar,
  Badge,
  Button,
  Checkbox,
  Frame,
  Icon,
  PageHeader,
  Select,
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
import { isUrgentDue, relativeTime, shortDateTime, statusBadge } from "@/lib/format"

interface QueueRow {
  ref: string
  title: string
  citizen: string
  nip: string
  depositedAt: number
  dueAt?: number
  agent: string
  status: string
  piecesProgress: string
}

export default async function AdminQueuePage() {
  const session = await getCurrentAgent()
  if (!session) redirect("/login")

  const queue = (await convex.query(api.admin.requests.listQueue, {
    token: session.token,
    limit: 50,
  })) as QueueRow[]

  const total = queue.length

  return (
    <Frame width={1440} height={900}>
      <AppHeader
        org={session.agent.organism?.shortName ?? session.agent.organism?.name}
        user={session.agent.name}
        role={agentRoleLabel(session.agent.role)}
      />
      <div style={{ display: "flex" }}>
        <Sidebar items={ADMIN_NAV} current="queue" />
        <main style={{ flex: 1, overflow: "hidden" }}>
          <PageHeader
            breadcrumbs={["Demandes citoyennes"]}
            title="File de demandes"
            subtitle={`${total} demande${total > 1 ? "s" : ""} dans votre organisme.`}
            actions={
              <>
                <Button variant="outline" icon="download">
                  Export CSV
                </Button>
                <Button icon="plus">Nouvelle demande agent</Button>
              </>
            }
          />
          {/* Filtres */}
          <div
            style={{
              padding: "12px 32px",
              borderBottom: "1px solid var(--ink-150)",
              background: "white",
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}
          >
            <TextInput
              placeholder="Rechercher : référence, citoyen, NIP…"
              icon="search"
              style={{ width: 320 }}
            />
            <Select defaultValue="all">
              <option value="all">Tous les types</option>
              <option>Acte de naissance</option>
              <option>Acte de mariage</option>
            </Select>
            <Select defaultValue="all">
              <option value="all">Tous les statuts</option>
              <option>À traiter</option>
              <option>En cours</option>
              <option>Traitée</option>
            </Select>
            <Select defaultValue="all">
              <option value="all">Tous les agents</option>
              <option>Mes demandes</option>
              <option>{session.agent.name}</option>
            </Select>
            <Button variant="ghost" icon="filter">
              Plus de filtres
            </Button>
            <div style={{ flex: 1 }} />
            <Tabs
              tabs={[
                { id: "list", label: "Liste" },
                { id: "board", label: "Tableau" },
              ]}
              current="list"
              variant="pill"
            />
          </div>

          <div style={{ padding: "20px 32px" }}>
            <Table>
              <thead>
                <tr>
                  <Th style={{ width: 32 }}>
                    <Checkbox checked={false} id="all2" />
                  </Th>
                  <Th sortable>Référence</Th>
                  <Th>Démarche</Th>
                  <Th>Citoyen · NIP</Th>
                  <Th sortable>Déposée</Th>
                  <Th>Échéance</Th>
                  <Th>Agent</Th>
                  <Th>Statut</Th>
                  <Th>Pièces</Th>
                  <Th>{" "}</Th>
                </tr>
              </thead>
              <tbody>
                {queue.map((r) => {
                  const status = statusBadge(r.status)
                  const urgent = isUrgentDue(r.dueAt)
                  return (
                    <Tr key={r.ref}>
                      <Td>
                        <Checkbox checked={false} id={r.ref + "-s"} />
                      </Td>
                      <Td
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        <a
                          href={`/demandes/${r.ref}`}
                          style={{ color: "inherit", textDecoration: "none" }}
                        >
                          {r.ref}
                        </a>
                      </Td>
                      <Td>
                        <div style={{ fontWeight: 600 }}>{r.title}</div>
                      </Td>
                      <Td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Avatar name={r.citizen} tone="green" size={22} />
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500 }}>{r.citizen}</div>
                            <div
                              style={{
                                fontFamily: "var(--font-mono)",
                                fontSize: 11,
                                color: "var(--ink-500)",
                              }}
                            >
                              {r.nip}
                            </div>
                          </div>
                        </div>
                      </Td>
                      <Td style={{ color: "var(--ink-600)", fontSize: 12 }}>
                        {shortDateTime(r.depositedAt)}
                      </Td>
                      <Td>
                        {r.dueAt ? (
                          urgent ? (
                            <Badge tone="danger" size="sm" dot>
                              {relativeTime(r.dueAt)}
                            </Badge>
                          ) : (
                            <span>{relativeTime(r.dueAt)}</span>
                          )
                        ) : (
                          <span style={{ color: "var(--ink-400)" }}>—</span>
                        )}
                      </Td>
                      <Td>
                        {r.agent === "Non assigné" ? (
                          <span style={{ color: "var(--ink-500)", fontStyle: "italic" }}>
                            {r.agent}
                          </span>
                        ) : (
                          r.agent
                        )}
                      </Td>
                      <Td>
                        <Badge tone={status.tone} dot>
                          {status.label}
                        </Badge>
                      </Td>
                      <Td>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                          {r.piecesProgress}
                        </span>
                      </Td>
                      <Td>
                        <Icon name="moreH" size={16} style={{ color: "var(--ink-400)" }} />
                      </Td>
                    </Tr>
                  )
                })}
              </tbody>
            </Table>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 16,
                fontSize: 13,
                color: "var(--ink-600)",
              }}
            >
              <span>Affichage 1–{queue.length} sur {total}</span>
              <div style={{ display: "flex", gap: 6 }}>
                <Button variant="ghost" icon="chevronLeft" size="sm">
                  {""}
                </Button>
                <Button variant="ghost" iconRight="chevronRight" size="sm">
                  {""}
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </Frame>
  )
}

function agentRoleLabel(role: string): string {
  switch (role) {
    case "agent_instructeur":
      return "Agent instructeur"
    case "chef_service":
      return "Chef de service"
    case "officier_signataire":
      return "Officier signataire"
    case "admin_organisme":
      return "Admin organisme"
    case "admin_technique":
      return "Admin technique"
    default:
      return role
  }
}
