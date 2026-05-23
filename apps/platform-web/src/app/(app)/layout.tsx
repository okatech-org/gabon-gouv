import type { ReactNode } from "react"
import { AppHeader, Sidebar } from "@workspace/ui"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"
import { requirePlatformUser } from "@/lib/current-platform-user"
import { buildPlatformNav } from "@/lib/platform-nav"

/**
 * Shell de la console plateforme — guard d'auth + sidebar live.
 */
export default async function PlatformShellLayout({
  children,
}: {
  children: ReactNode
}) {
  const { token, user } = await requirePlatformUser()
  const counts = await convex
    .query(api.platform.supervision.getSidebarCounts, { token })
    .catch(() => ({ orgs: undefined, services: undefined, onboarding: undefined }))

  const nav = buildPlatformNav({
    orgs: counts.orgs,
    services: counts.services,
    onboarding: counts.onboarding,
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
        org={user.organism?.name ?? "Gabon Connect — Console plateforme"}
        user={user.name}
        role="Admin plateforme"
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
