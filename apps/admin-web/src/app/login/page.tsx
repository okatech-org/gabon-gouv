import { Frame, Logo, RepublicBar } from "@workspace/ui"
import { LoginForm } from "./login-form"

export const metadata = {
  title: "Connexion · Gabon Connect — Administrations",
}

export default function LoginPage() {
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
        <Logo href={null} />
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
          {/* Marketing side */}
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
              Console des administrations
            </div>
            <h1
              style={{
                fontSize: 38,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                marginBottom: 14,
              }}
            >
              Identifiez-vous avec votre <span style={{ color: "var(--primary-500)" }}>NIP</span> d&apos;agent.
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
              L&apos;accès au back-office est réservé aux agents habilités des administrations gabonaises. Votre NIP est rattaché à votre fiche organisme.
            </p>
            <div
              style={{
                padding: 18,
                background: "white",
                border: "1px dashed var(--ink-300)",
                borderRadius: 10,
                fontSize: 13,
                color: "var(--ink-700)",
                maxWidth: 460,
              }}
            >
              <b>NIPs de démonstration :</b>
              <ul style={{ marginTop: 8, paddingLeft: 16, lineHeight: 1.7 }}>
                <li>
                  <span style={{ fontFamily: "var(--font-mono)" }}>198501100001</span> — Yolande NGUEMA · DG État Civil (instructrice)
                </li>
                <li>
                  <span style={{ fontFamily: "var(--font-mono)" }}>196812100003</span> — Patrice MOUSSAVOU · DG État Civil (signataire)
                </li>
                <li>
                  <span style={{ fontFamily: "var(--font-mono)" }}>197004100004</span> — Faustin MBOUMBA · DG Documentation
                </li>
              </ul>
            </div>
          </div>

          {/* Form side */}
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
            <LoginForm />
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
        République Gabonaise · Gabon Connect — Administrations
      </footer>
    </Frame>
  )
}
