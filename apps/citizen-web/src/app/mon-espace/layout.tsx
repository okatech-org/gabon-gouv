import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { AppHeader, Sidebar } from "@workspace/ui"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"
import { requireCurrentSession } from "@/lib/current-citizen"
import { buildCitizenNav } from "@/lib/citizen-nav"

/**
 * Layout du sous-domaine /mon-espace côté citoyen. Pose le header et la
 * sidebar « citoyen » autour de toutes les routes /mon-espace/*. Les pages
 * publiques de la home et de l'annuaire utilisent leur propre top-nav et
 * n'héritent pas de ce layout.
 *
 * Les counts (demandes en cours, documents, messages non lus) sont laissés à
 * `undefined` ici : chaque page les remontera plus précisément si besoin via
 * son propre rendu. Cela évite de bloquer le layout sur des queries lourdes.
 */
export default async function CitizenSpaceLayout({
  children,
}: {
  children: ReactNode
}) {
  const session = await requireCurrentSession()
  // Récupère le profil citoyen Convex pour avoir le nom officiel (état civil).
  // Si le sub IDN n'est lié à aucun compte, on renvoie sur /login avec un
  // bandeau "compte non provisionné".
  let displayName: string
  let counts = { requestsInProgress: 0, documentsReceived: 0, unreadMessages: 0 }
  try {
    const dashboard = await convex.query(api.citizen.dashboard.getDashboard, {
      idnSub: session.idnSub,
    })
    displayName = dashboard.profile.name
    counts = {
      requestsInProgress: dashboard.stats.inProgress,
      documentsReceived: dashboard.stats.documentsReceived,
      unreadMessages: dashboard.messages.filter((m) => m.unread).length,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : ""
    if (msg.includes("provisionn")) {
      redirect("/login?reason=not-provisioned")
    }
    throw error
  }
  const navItems = buildCitizenNav(counts)

  return (
    <>
      {/* Verrouille html/body au viewport pour ce sous-arbre afin d'éviter
          une double scrollbar (body + main). Scoped à /mon-espace pour
          préserver le scroll naturel des pages publiques citoyennes. */}
      <style>{`html, body { height: 100%; overflow: hidden; margin: 0; }`}</style>
    <div
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "var(--ink-100)",
        overflow: "hidden",
      }}
    >
      {/* Skip link RGAA 12.7. */}
      <a href="#main" className="skip-link">
        Aller au contenu principal
      </a>
      <AppHeader user={displayName} role="Citoyenne" />
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <Sidebar items={navItems} />
        <main
          id="main"
          tabIndex={-1}
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
    </>
  )
}
