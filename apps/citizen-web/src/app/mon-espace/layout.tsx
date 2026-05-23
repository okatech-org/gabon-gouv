import type { ReactNode } from "react"
import { AppHeader, Sidebar } from "@workspace/ui"
import { getCurrentCitizen } from "@workspace/mocks/citizen"
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
  const citizen = await getCurrentCitizen()
  const navItems = buildCitizenNav()

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
      <AppHeader user={citizen.name} role="Citoyenne" />
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <Sidebar items={navItems} />
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
    </>
  )
}
