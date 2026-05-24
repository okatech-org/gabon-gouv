import { Frame, Logo, RepublicBar } from "@workspace/ui"
import { LoginButton } from "./login-button"

export const metadata = {
  title: "Connexion · Gabon Connect",
}

interface PageProps {
  searchParams: Promise<{ from?: string; reason?: string }>
}

export default async function CitizenLoginPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const reason = sp.reason

  let banner: { tone: "warning" | "info"; title: string; body: string } | null = null
  if (reason === "not-provisioned") {
    banner = {
      tone: "warning",
      title: "Compte non encore relié",
      body:
        "Votre identité numérique a bien été reconnue, mais aucun compte citoyen Gabon Connect n'y est associé. Un administrateur doit provisionner votre compte avant la première connexion.",
    }
  }

  return (
    <Frame
      width={1440}
      height={900}
      style={{ background: "var(--ink-50)", display: "flex", flexDirection: "column" }}
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
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 64,
            maxWidth: 1080,
            alignItems: "center",
          }}
        >
          <div style={{ color: "var(--ink-800)" }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--primary-600)",
                marginBottom: 12,
              }}
            >
              Identité Numérique Gabonaise
            </div>
            <h1
              style={{
                fontSize: 38,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                marginBottom: 14,
              }}
            >
              Connectez-vous avec votre{" "}
              <span style={{ color: "var(--primary-500)" }}>identité numérique</span>.
            </h1>
            <p
              style={{
                fontSize: 16,
                color: "var(--ink-600)",
                lineHeight: 1.55,
                marginBottom: 24,
                maxWidth: 480,
              }}
            >
              Gabon Connect utilise le portail{" "}
              <b>citoyen.ga</b> pour vérifier votre identité (niveau LoA 2 minimum).
              Vous serez redirigé vers identité.ga, puis ramené ici une fois connecté.
            </p>
          </div>

          <div
            style={{
              background: "white",
              border: "1px solid var(--ink-200)",
              borderRadius: 12,
              padding: 32,
              boxShadow: "var(--shadow-md)",
              minWidth: 380,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--ink-500)",
                    marginBottom: 6,
                  }}
                >
                  Espace citoyen
                </div>
                <h2 style={{ fontSize: 22, letterSpacing: "-0.01em" }}>
                  Accéder à mon espace
                </h2>
                <p style={{ fontSize: 13.5, color: "var(--ink-600)", marginTop: 4 }}>
                  Authentification fédérée OIDC via Identité Numérique Gabonaise.
                </p>
              </div>
              {banner && (
                <div
                  style={{
                    background:
                      banner.tone === "warning"
                        ? "var(--warning-100, #fef3c7)"
                        : "var(--info-100, #e0f2fe)",
                    border: `1px solid ${banner.tone === "warning" ? "var(--warning-300, #fcd34d)" : "var(--info-300, #93c5fd)"}`,
                    padding: 12,
                    borderRadius: 8,
                    fontSize: 13,
                  }}
                >
                  <strong style={{ display: "block", marginBottom: 4 }}>
                    {banner.title}
                  </strong>
                  {banner.body}
                </div>
              )}
              <LoginButton from={sp.from} />
              <div
                style={{
                  fontSize: 12,
                  color: "var(--ink-500)",
                  borderTop: "1px solid var(--ink-150)",
                  marginTop: 4,
                  paddingTop: 12,
                }}
              >
                Vous n&apos;avez pas encore d&apos;identité numérique ?{" "}
                <a
                  href="https://identite.ga"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--primary-500)", fontWeight: 600 }}
                >
                  Créez-en une sur identité.ga
                </a>
                .
              </div>
            </div>
          </div>
        </div>
      </main>
      <footer
        style={{
          padding: "16px 64px",
          fontSize: 12,
          color: "var(--ink-500)",
          textAlign: "center",
          borderTop: "1px solid var(--ink-200)",
          background: "white",
        }}
      >
        République Gabonaise · Gabon Connect
      </footer>
    </Frame>
  )
}
