import Link from "next/link"
import { Button, PageHeader } from "@workspace/ui"
import { PublicShell } from "@/components/public-shell"

/**
 * Page 404 brandée — capture toutes les URLs inexistantes.
 * Évite la 404 brute Next.js sans design.
 */
export default function NotFound() {
  return (
    <PublicShell>
      <PageHeader
        title="Page introuvable"
        subtitle="La page que vous cherchez n'existe pas ou a été déplacée."
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          padding: "32px 24px",
          maxWidth: 560,
          margin: "0 auto",
        }}
      >
        <p
          style={{
            fontSize: 14,
            color: "var(--ink-600)",
            textAlign: "center",
            lineHeight: 1.6,
          }}
        >
          Si vous avez tapé l&apos;adresse manuellement, vérifiez qu&apos;elle
          ne contient pas de faute de frappe. Sinon le lien que vous avez
          suivi est peut-être obsolète.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <Button variant="primary" icon="home">
              Retour à l&apos;accueil
            </Button>
          </Link>
          <Link href="/aide" style={{ textDecoration: "none" }}>
            <Button variant="secondary" icon="info">
              Centre d&apos;aide
            </Button>
          </Link>
        </div>
      </div>
    </PublicShell>
  )
}
