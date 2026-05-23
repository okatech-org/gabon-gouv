import type { ReactNode } from "react"
import { AppHeader, Sidebar } from "@workspace/ui"
import { getCurrentPlatformUser } from "@workspace/mocks/platform"
import { PLATFORM_NAV } from "@/lib/platform-nav"

/**
 * Layout du shell console plateforme (Digitalium). Pose le header et la
 * sidebar pour toutes les pages console. Les pages elles-mêmes ne rendent
 * que leur propre contenu.
 *
 * Pas d'auth pour le moment : récupère juste l'utilisateur courant pour
 * alimenter l'AppHeader depuis les mocks.
 */
export default async function PlatformShellLayout({
  children,
}: {
  children: ReactNode
}) {
  const user = await getCurrentPlatformUser()

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--ink-100)",
      }}
    >
      <AppHeader org={user.org} user={user.name} role={user.role} />
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <Sidebar items={PLATFORM_NAV} />
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
