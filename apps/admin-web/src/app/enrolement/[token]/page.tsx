import { Frame, Logo, RepublicBar } from "@workspace/ui"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"
import { EnrollmentForm } from "./enrollment-form"

/**
 * Page publique d'enrôlement (Phase Trous B).
 *
 * URL : `/enrolement/[token]` — accessible sans session.
 * Le token (64 chars hex) est le secret partagé par l'admin invitant.
 *
 * Cas couverts :
 *   - invitation valide pending → form NIP + nom + fonction
 *   - invitation acceptée / révoquée / expirée → message explicite
 *   - token inconnu → message d'erreur générique (404)
 */

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ token: string }>
}

export const metadata = {
  title: "Enrôlement · Gabon Connect — Administrations",
}

export default async function EnrollmentPage({ params }: PageProps) {
  const { token } = await params
  const invitation = await convex.query(api.admin.team.getInvitationByToken, {
    token,
  })

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
        <Logo href={null} />
      </header>

      <main
        id="main"
        tabIndex={-1}
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
            background: "white",
            border: "1px solid var(--ink-200)",
            borderRadius: 10,
            maxWidth: 520,
            width: "100%",
            padding: 32,
            boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
          }}
        >
          {!invitation ? (
            <ErrorState
              title="Invitation introuvable"
              body="Ce lien d'enrôlement n'existe pas. Vérifiez que l'URL a été copiée intégralement, ou demandez à votre admin organisme de vous renvoyer une invitation."
            />
          ) : invitation.state !== "pending" ? (
            <ErrorState
              title={
                invitation.state === "accepted"
                  ? "Invitation déjà utilisée"
                  : invitation.state === "revoked"
                    ? "Invitation révoquée"
                    : "Invitation expirée"
              }
              body={
                invitation.state === "accepted"
                  ? `Cette invitation a déjà servi à créer un compte pour ${invitation.email}. Connectez-vous avec votre NIP, ou contactez votre admin si vous avez perdu l'accès.`
                  : invitation.state === "revoked"
                    ? "Votre admin organisme a révoqué cette invitation. Demandez-lui d'en générer une nouvelle si besoin."
                    : "Le délai de 14 jours est dépassé. Demandez à votre admin organisme de relancer une invitation."
              }
            />
          ) : (
            <EnrollmentForm
              token={token}
              email={invitation.email}
              roleLabel={
                "roleLabel" in invitation && invitation.roleLabel
                  ? invitation.roleLabel
                  : "Agent"
              }
              functionTitle={
                "functionTitle" in invitation
                  ? invitation.functionTitle
                  : null
              }
              organismName={
                ("organismShortName" in invitation &&
                  invitation.organismShortName) ||
                invitation.organismName ||
                "votre organisme"
              }
              expiresAt={
                "expiresAt" in invitation ? invitation.expiresAt : Date.now()
              }
            />
          )}
        </div>
      </main>
    </Frame>
  )
}

function ErrorState({ title, body }: { title: string; body: string }) {
  return (
    <div role="region" aria-labelledby="enrol-err-title">
      <h1
        id="enrol-err-title"
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: "var(--danger-700)",
          marginTop: 0,
          marginBottom: 12,
        }}
      >
        {title}
      </h1>
      <p
        style={{
          fontSize: 14,
          color: "var(--ink-700)",
          lineHeight: 1.55,
          margin: 0,
        }}
      >
        {body}
      </p>
    </div>
  )
}
