import { Badge, PageHeader, StatCard } from "@workspace/ui"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"
import { getCurrentAgent } from "@/lib/current-agent"
import { TeamManager } from "./team-manager"

/**
 * Page /equipe — gestion d'équipe intra-organisme (Phase Trous B).
 *
 * Server component qui charge :
 *   - listTeamMembers : agents + stats
 *   - listInvitations : invitations pending/acceptées/révoquées
 *   - canManage (depuis listTeamMembers) : si l'agent peut inviter/désactiver
 *
 * Délègue l'interactivité à `TeamManager` (client component avec dialogs
 * a11y, tabs Membres/Invitations, actions par ligne).
 */

export default async function AdminEquipePage() {
  const session = await getCurrentAgent()
  if (!session) redirect("/login")
  const { token, agent } = session

  const [team, invitations, hdrs] = await Promise.all([
    convex.query(api.admin.team.listTeamMembers, { token }),
    convex.query(api.admin.team.listInvitations, { token, scope: "all" }),
    headers(),
  ])

  const { members, stats, canManage } = team

  // Base URL pour générer les liens d'enrôlement à partager
  const proto = hdrs.get("x-forwarded-proto") ?? "http"
  const host = hdrs.get("host") ?? "localhost:3001"
  const enrollmentBaseUrl = `${proto}://${host}`

  const pendingCount = invitations.filter((i) => i.state === "pending").length

  return (
    <>
      <PageHeader
        breadcrumbs={["Mon espace", "Équipe"]}
        title="Équipe de l'organisme"
        subtitle={`${stats.total} membre${stats.total > 1 ? "s" : ""} · ${stats.active} actif${stats.active > 1 ? "s" : ""}${pendingCount ? ` · ${pendingCount} invitation${pendingCount > 1 ? "s" : ""} en attente` : ""}.`}
        meta={
          <Badge tone="primary" dot icon="users">
            {agent.organism?.shortName ?? agent.organism?.name ?? "Organisme"}
          </Badge>
        }
      />
      <main
        id="main"
        tabIndex={-1}
        style={{
          padding: "24px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
          maxWidth: 1400,
          width: "100%",
          flex: 1,
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
          <StatCard
            label="Actifs"
            value={String(stats.active)}
            icon="checkCircle"
          />
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

        <TeamManager
          members={members}
          invitations={invitations}
          canManage={canManage}
          enrollmentBaseUrl={enrollmentBaseUrl}
        />
      </main>
    </>
  )
}
