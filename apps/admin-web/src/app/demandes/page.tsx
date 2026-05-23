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
import { getAdminQueue, getCurrentAdmin } from "@workspace/mocks/admin"
import { ADMIN_NAV } from "@/lib/admin-nav"

export default async function AdminQueuePage() {
  const [admin, queue] = await Promise.all([getCurrentAdmin(), getAdminQueue()])

  return (
    <Frame width={1440} height={900}>
      <AppHeader org={admin.org} user={admin.name} role={admin.role} />
      <div style={{ display: "flex" }}>
        <Sidebar items={ADMIN_NAV} current="queue" />
        <main style={{ flex: 1, overflow: "hidden" }}>
          <PageHeader
            breadcrumbs={["Demandes citoyennes"]}
            title="File de demandes"
            subtitle="847 demandes — 47 à traiter, 124 en cours, 676 traitées."
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
              <option>Y. NGUEMA</option>
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
            {/* Bulk bar */}
            <div
              style={{
                background: "var(--primary-50)",
                border: "1px solid var(--primary-200)",
                borderRadius: 8,
                padding: "10px 16px",
                display: "flex",
                alignItems: "center",
                gap: 14,
                marginBottom: 12,
              }}
            >
              <Icon name="checkCircle" size={16} style={{ color: "var(--primary-500)" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--primary-700)" }}>
                3 demandes sélectionnées
              </span>
              <Button variant="secondary" size="sm" icon="userCheck">
                M&apos;assigner
              </Button>
              <Button variant="secondary" size="sm" icon="share">
                Transférer
              </Button>
              <Button
                variant="ghost"
                size="sm"
                icon="xCircle"
                style={{ color: "var(--danger-500)" }}
              >
                Désélectionner
              </Button>
            </div>

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
                {queue.map((r) => (
                  <Tr key={r.ref} selected={r.selected}>
                    <Td>
                      <Checkbox checked={!!r.selected} id={r.ref + "-s"} />
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
                    <Td style={{ color: "var(--ink-600)", fontSize: 12 }}>{r.depositedAt}</Td>
                    <Td>
                      {r.dueAt === "aujourd'hui" || r.dueAt === "dans 6 h" ? (
                        <Badge tone="danger" size="sm" dot>
                          {r.dueAt}
                        </Badge>
                      ) : r.dueAt === "traité" ? (
                        <Badge tone="archived" size="sm">
                          {r.dueAt}
                        </Badge>
                      ) : (
                        <span>{r.dueAt}</span>
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
                      <Badge tone={r.tone} dot>
                        {r.status}
                      </Badge>
                    </Td>
                    <Td>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                        {r.pieces}
                      </span>
                    </Td>
                    <Td>
                      <Icon name="moreH" size={16} style={{ color: "var(--ink-400)" }} />
                    </Td>
                  </Tr>
                ))}
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
              <span>Affichage 1–8 sur 847</span>
              <div style={{ display: "flex", gap: 6 }}>
                <Button variant="ghost" icon="chevronLeft" size="sm">
                  {""}
                </Button>
                {["1", "2", "3", "...", "106"].map((p, i) => (
                  <button
                    key={`${p}-${i}`}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 6,
                      border: "1px solid var(--ink-200)",
                      background: p === "1" ? "var(--primary-500)" : "white",
                      color: p === "1" ? "white" : "var(--ink-800)",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {p}
                  </button>
                ))}
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
