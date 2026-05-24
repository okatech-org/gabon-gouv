import Link from "next/link"
import type { ReactNode } from "react"
import { Button, Logo, RepublicBar } from "@workspace/ui"

export interface PublicShellProps {
  active?: "demarches" | "administrations" | "mon-espace" | "aide"
  children: ReactNode
}

const NAV: { label: string; href: string; key: PublicShellProps["active"] }[] = [
  { label: "Démarches", href: "/", key: "demarches" },
  { label: "Administrations", href: "/administrations", key: "administrations" },
  { label: "Mon espace", href: "/mon-espace", key: "mon-espace" },
  { label: "Aide", href: "/aide", key: "aide" },
]

const FOOTER_LINKS: { label: string; href: string }[] = [
  { label: "Mentions légales", href: "/mentions-legales" },
  { label: "Accessibilité", href: "/accessibilite" },
  { label: "Contact", href: "/contact" },
  { label: "État du service", href: "/etat-du-service" },
  { label: "CGU", href: "/cgu" },
]

/**
 * Shell des pages publiques citoyennes (hors /mon-espace). Reprend la
 * top-nav et le pied de page utilisés sur la home, factorisés pour les
 * pages d'information (aide, mentions légales, etc.).
 */
export const PublicShell = ({ active, children }: PublicShellProps) => (
  <div
    style={{
      minHeight: "100vh",
      background: "white",
      display: "flex",
      flexDirection: "column",
    }}
  >
    <RepublicBar />
    <header
      style={{
        borderBottom: "1px solid var(--ink-200)",
        padding: "14px 64px",
        display: "flex",
        alignItems: "center",
        gap: 24,
        background: "white",
      }}
    >
      <Logo />
      <nav style={{ display: "flex", gap: 24, marginLeft: 32 }}>
        {NAV.map((l) => {
          const isActive = l.key === active
          return (
            <Link
              key={l.label}
              href={l.href}
              style={{
                fontSize: 14,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? "var(--primary-600)" : "var(--ink-700)",
                textDecoration: "none",
              }}
            >
              {l.label}
            </Link>
          )
        })}
      </nav>
      <div style={{ flex: 1 }} />
      <Link href="/mon-espace" style={{ textDecoration: "none" }}>
        <Button variant="secondary" icon="user">
          Mon espace
        </Button>
      </Link>
    </header>

    <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      {children}
    </main>

    <footer
      style={{
        borderTop: "1px solid var(--ink-200)",
        padding: "24px 64px",
        background: "var(--ink-50)",
        display: "flex",
        gap: 24,
        fontSize: 13,
        color: "var(--ink-600)",
        flexWrap: "wrap",
      }}
    >
      {FOOTER_LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          style={{ color: "var(--ink-700)", textDecoration: "none" }}
        >
          {l.label}
        </Link>
      ))}
      <span style={{ flex: 1 }} />
      <span>© République Gabonaise — Gabon Connect</span>
    </footer>
  </div>
)
