import { redirect } from "next/navigation"
import type { ReactNode } from "react"
import { AppHeader, Sidebar } from "@workspace/ui"
import { ADMIN_NAV } from "@/lib/admin-nav"
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

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--ink-100)",
      }}
    >
      <AppHeader
        org={session.agent.organism?.shortName ?? session.agent.organism?.name}
        user={session.agent.name}
        role={agentRoleLabel(session.agent.role)}
      />
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <Sidebar items={ADMIN_NAV} />
        <main
          style={{
            flex: 1,
            minWidth: 0,
            overflow: "auto",
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
