import {
  Avatar,
  Badge,
  Card,
  Icon,
  PageHeader,
  StatCard,
  Table,
  Td,
  Th,
  Tr,
  type Tone,
} from "@workspace/ui"
import { redirect } from "next/navigation"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"
import { getCurrentAgent } from "@/lib/current-agent"

export default async function AdminEquipePage() {
  const session = await getCurrentAgent()
  if (!session) redirect("/login")
  const { token, agent } = session

  const { members, stats } = await convex.query(
    api.admin.team.listTeamMembers,
    { token },
  )

  return (
    <>
      <PageHeader
        breadcrumbs={["Mon espace", "Équipe"]}
        title="Équipe de l'organisme"
        subtitle={`${stats.total} membre${stats.total > 1 ? "s" : ""} · ${stats.active} actif${stats.active > 1 ? "s" : ""} dans ${agent.organism?.shortName ?? agent.organism?.name ?? "votre organisme"}.`}
        meta={
          <Badge tone="primary" dot icon="users">
            {agent.organism?.shortName ?? agent.organism?.name ?? "Organisme"}
          </Badge>
        }
      />
      <div
        style={{
          padding: "24px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
          maxWidth: 1400,
          width: "100%",
        }}
      >
        {/* KPI */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
          }}
          role="group"
          aria-label="Statistiques équipe"
        >
          <StatCard label="Membres" value={String(stats.total)} icon="users" />
          <StatCard label="Actifs" value={String(stats.active)} icon="checkCircle" />
          <StatCard
            label="Instructeurs"
            value={String(stats.byRole.agent_instructeur ?? 0)}
            icon="user"
          />
          <StatCard
            label="Signataires"
            value={String(
              (stats.byRole.officier_signataire ?? 0) +
                (stats.byRole.chef_service ?? 0),
            )}
            icon="shieldCheck"
          />
        </div>

        <Card>
          {members.length === 0 ? (
            <div
              style={{
                padding: "48px 24px",
                textAlign: "center",
                color: "var(--ink-600)",
              }}
            >
              <Icon
                name="users"
                size={36}
                style={{ color: "var(--ink-400)", marginBottom: 12 }}
                aria-hidden="true"
              />
              <h2 style={{ fontSize: 17, marginBottom: 6 }}>
                Aucun membre dans cet organisme
              </h2>
              <p style={{ fontSize: 14, color: "var(--ink-600)" }}>
                Demandez à l&apos;admin plateforme de provisionner des agents.
              </p>
            </div>
          ) : (
            <Table>
              <caption className="sr-only">
                Liste des membres de l&apos;organisme,{" "}
                {members.length} agent{members.length > 1 ? "s" : ""}
              </caption>
              <thead>
                <tr>
                  <Th scope="col">Agent</Th>
                  <Th scope="col">Rôle</Th>
                  <Th scope="col">Fonction</Th>
                  <Th scope="col">Authentification</Th>
                  <Th scope="col">Demandes assignées</Th>
                  <Th scope="col">Statut</Th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <Tr key={m.id} selected={m.isMe}>
                    <Td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <Avatar name={m.name} size={32} tone="primary" />
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontWeight: 600 }}>
                            {m.name}
                            {m.isMe && (
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: "var(--primary-600)",
                                  marginLeft: 6,
                                }}
                                aria-label="C'est vous"
                              >
                                · Vous
                              </span>
                            )}
                          </span>
                          <span
                            style={{
                              fontSize: 12,
                              color: "var(--ink-500)",
                              fontFamily: "var(--font-mono)",
                            }}
                          >
                            {m.email}
                          </span>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <Badge tone={roleTone(m.role)} size="sm">
                        {m.roleLabel}
                      </Badge>
                    </Td>
                    <Td style={{ color: "var(--ink-700)" }}>{m.function}</Td>
                    <Td>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 12.5,
                          color: "var(--ink-700)",
                        }}
                      >
                        <Icon
                          name="fingerprint"
                          size={12}
                          style={{ color: "var(--ink-500)" }}
                          aria-hidden="true"
                        />
                        {m.authMethodLabel}
                      </span>
                    </Td>
                    <Td
                      style={{
                        fontVariantNumeric: "tabular-nums",
                        fontWeight: 600,
                      }}
                    >
                      {m.assignedCount}
                    </Td>
                    <Td>
                      {m.active ? (
                        <Badge tone="archived" dot>
                          Actif
                        </Badge>
                      ) : (
                        <Badge tone="neutral" dot>
                          Inactif
                        </Badge>
                      )}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card>
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
              padding: 16,
              background: "var(--ink-50)",
              borderRadius: 8,
            }}
          >
            <Icon
              name="info"
              size={18}
              style={{ color: "var(--primary-500)", flexShrink: 0, marginTop: 2 }}
              aria-hidden="true"
            />
            <div>
              <p
                style={{
                  fontSize: 13.5,
                  color: "var(--ink-800)",
                  margin: 0,
                  fontWeight: 600,
                }}
              >
                Provisioning des agents
              </p>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--ink-600)",
                  marginTop: 4,
                  lineHeight: 1.5,
                }}
              >
                L&apos;ajout, le changement de rôle ou la suspension d&apos;un
                agent passent par la console plateforme Digitalium pour assurer
                la traçabilité ANINF. Contactez l&apos;admin plateforme de votre
                organisme pour toute modification.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </>
  )
}

function roleTone(role: string): Tone {
  switch (role) {
    case "admin_organisme":
      return "primary"
    case "officier_signataire":
      return "warning"
    case "chef_service":
      return "active"
    case "agent_superviseur":
      return "info"
    case "agent_instructeur":
      return "neutral"
    case "admin_technique":
      return "semi"
    case "platform_admin":
      return "danger"
    default:
      return "neutral"
  }
}
