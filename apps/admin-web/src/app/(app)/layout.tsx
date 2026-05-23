import { redirect } from "next/navigation"
import type { ReactNode } from "react"
import { AppHeader, Sidebar } from "@workspace/ui"
import { api } from "@workspace/backend/generated"
import { buildAdminNav } from "@/lib/admin-nav"
import { convex } from "@/lib/convex"
import { getCurrentAgent } from "@/lib/current-agent"
import { agentRoleLabel } from "@/lib/format"

/**
 * Layout authentifié pour le back-office admin. Pose le shell (header + sidebar)
 * autour de toutes les pages du back-office. Les pages elles-mêmes ne rendent
 * que leur contenu `<main>` — pas de Frame, pas de re-déclaration du header.
 *
 * Vérifie aussi la session à l'entrée et redirige vers /login si absente.
 */
export default async function AppShellLayout({ children }: { children: ReactNode }) {
  const session = await getCurrentAgent()
  if (!session) redirect("/login")

  // Compteurs vivants depuis les agrégats Convex (ADR-0007) — file de
  // demandes en attente + correspondances non lues pour l'agent connecté.
  const sidebarCounts = await convex
    .query(api.admin.dashboard.getSidebarCounts, { token: session.token })
    .catch(() => ({ queue: 0, correspondenceUnread: 0 }))

  const nav = buildAdminNav({
    queue: sidebarCounts.queue,
    correspondenceUnread: sidebarCounts.correspondenceUnread,
  })

  return (
    <div
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "var(--ink-100)",
        overflow: "hidden",
      }}
    >
      <AppHeader
        org={session.agent.organism?.shortName ?? session.agent.organism?.name}
        user={session.agent.name}
        role={agentRoleLabel(session.agent.role)}
      />
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <Sidebar items={nav} />
        <main
          style={{
            flex: 1,
            minWidth: 0,
            overflowY: "auto",
            overflowX: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
