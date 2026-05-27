import Link from "next/link"
import { Button, Frame, Logo, RepublicBar } from "@workspace/ui"

/**
 * Page 404 brandée admin-web. Capturée par Next.js pour toutes les URLs
 * inexistantes. Volontairement standalone (pas de PublicShell ni de
 * AppHeader/Sidebar car on peut être hors session).
 */
export default function NotFound() {
  return (
    <Frame
      width={1440}
      height={900}
      style={{
        background: "var(--ink-50)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <RepublicBar />
      <header
        style={{
          padding: "20px 64px",
          background: "white",
          borderBottom: "1px solid var(--ink-200)",
          display: "flex",
          alignItems: "center",
        }}
      >
        <Logo href="/" />
      </header>
      <main
        id="main"
        tabIndex={-1}
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 32,
        }}
      >
        <div
          role="region"
          aria-labelledby="nf-title"
          style={{
            background: "white",
            border: "1px solid var(--ink-200)",
            borderRadius: 10,
            maxWidth: 520,
            width: "100%",
            padding: 32,
            boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
          }}
        >
          <p
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "var(--ink-500)",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              margin: 0,
              marginBottom: 8,
            }}
          >
            Erreur 404
          </p>
          <h1
            id="nf-title"
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "var(--ink-900)",
              marginTop: 0,
              marginBottom: 12,
            }}
          >
            Page introuvable
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "var(--ink-700)",
              lineHeight: 1.6,
              margin: 0,
              marginBottom: 20,
            }}
          >
            La page que vous cherchez n&apos;existe pas dans le back-office.
            Vérifiez l&apos;URL ou retournez à votre tableau de bord.
          </p>
          <Link href="/" style={{ textDecoration: "none" }}>
            <Button variant="primary" icon="home">
              Retour au tableau de bord
            </Button>
          </Link>
        </div>
      </main>
    </Frame>
  )
}
