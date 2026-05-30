import Link from "next/link"
import { Card, Icon, PageHeader, SectionHeading, Toggle } from "@workspace/ui"
import { requireCurrentSession } from "@/lib/current-citizen"
import { SignOutButton } from "./sign-out-button"

export default async function CitizenParametresPage() {
  const session = await requireCurrentSession()

  // Préférences mockées : à brancher Convex dans un 2e temps (table
  // `citizenPreferences` à ajouter au schema). Le form est en lecture
  // seule pour l'instant ; les toggles sont cosmétiques (disabled).
  const prefs = {
    notifEmail: true,
    notifSms: false,
    notifWeekly: true,
  }

  return (
    <>
      <PageHeader
        breadcrumbs={["Mon espace", "Paramètres"]}
        title="Paramètres du compte"
        subtitle="Notifications, langue, sécurité de session et droit à l'oubli."
      />
      <div
        style={{
          padding: "24px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
          maxWidth: 880,
          width: "100%",
        }}
      >
        {/* Notifications */}
        <Card>
          <SectionHeading
            title="Préférences de notification"
            subtitle="Comment souhaitez-vous être informé·e des mises à jour de vos démarches ?"
            level={2}
          />
          <fieldset
            style={{
              border: 0,
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <legend className="sr-only">Canaux de notification</legend>
            <Toggle
              checked={prefs.notifEmail}
              label="E-mail — mises à jour de demandes & documents prêts"
            />
            <Toggle
              checked={prefs.notifSms}
              label="SMS — alertes urgentes uniquement (pièces requises)"
            />
            <Toggle
              checked={prefs.notifWeekly}
              label="Récap hebdomadaire — synthèse des démarches en cours"
            />
          </fieldset>
          <p
            style={{
              fontSize: 12.5,
              color: "var(--ink-600)",
              marginTop: 14,
              padding: 10,
              background: "var(--ink-50)",
              borderRadius: 8,
            }}
          >
            <Icon
              name="info"
              size={12}
              style={{ verticalAlign: "middle", marginRight: 6 }}
              aria-hidden="true"
            />
            La persistance des préférences sera branchée dans une prochaine
            itération.
          </p>
        </Card>

        {/* Langue */}
        <Card>
          <SectionHeading
            title="Langue & accessibilité"
            subtitle="Interface, contraste et taille de texte."
            level={2}
          />
          <dl
            style={{
              display: "grid",
              gridTemplateColumns: "200px 1fr",
              gap: "10px 16px",
              fontSize: 13.5,
              margin: 0,
            }}
          >
            <dt style={{ color: "var(--ink-600)" }}>Langue de l&apos;interface</dt>
            <dd style={{ margin: 0, fontWeight: 600 }}>Français</dd>
            <dt style={{ color: "var(--ink-600)" }}>Conformité accessibilité</dt>
            <dd style={{ margin: 0 }}>
              RGAA 4.1.2 (équivalent WCAG 2.1 AA) — voir{" "}
              <Link href="/accessibilite" style={{ fontWeight: 600 }}>
                déclaration d&apos;accessibilité
              </Link>
              .
            </dd>
          </dl>
        </Card>

        {/* Sécurité de session */}
        <Card>
          <SectionHeading
            title="Sécurité de session"
            subtitle={`Vous êtes actuellement connecté·e via ${session.source === "idn" ? "identité.ga (OIDC)" : "le mode démo NIP"}.`}
            level={2}
          />
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              padding: "12px 0",
              borderBottom: "1px solid var(--ink-150)",
            }}
          >
            <Icon
              name="lock"
              size={20}
              style={{ color: "var(--primary-500)" }}
              aria-hidden="true"
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                Session active
              </div>
              <div style={{ fontSize: 12.5, color: "var(--ink-600)" }}>
                Cookie HttpOnly · expire automatiquement après 12 h
                d&apos;inactivité.
              </div>
            </div>
            <SignOutButton />
          </div>
        </Card>

        {/* Droit à l'oubli */}
        <Card>
          <SectionHeading
            title="Droit à l'effacement (RGPD / loi 001-2011)"
            subtitle="Suppression de vos données personnelles non régaliennes."
            level={2}
          />
          <p
            style={{
              fontSize: 13.5,
              color: "var(--ink-700)",
              lineHeight: 1.6,
              marginBottom: 14,
            }}
          >
            Vos données d&apos;état civil ne peuvent pas être supprimées (elles
            relèvent du registre public), mais vous pouvez demander
            l&apos;effacement de vos préférences, votre adresse e-mail, votre
            historique de messages et la déconnexion de toute administration de
            votre dossier.
          </p>
          <Link
            href="/contact"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 16px",
              border: "1px solid var(--danger-300, #fca5a5)",
              borderRadius: 8,
              color: "var(--danger-700, #b91c1c)",
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            <Icon name="trash" size={14} aria-hidden="true" />
            Demander l&apos;effacement de mes données
          </Link>
        </Card>
      </div>
    </>
  )
}
