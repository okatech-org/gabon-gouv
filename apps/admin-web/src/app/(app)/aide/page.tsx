import Link from "next/link"
import { Card, Icon, PageHeader, SectionHeading } from "@workspace/ui"

/**
 * Page /aide admin — centre d'aide pour agents (fix B5 — précédemment
 * le bouton "?" du header était inerte).
 *
 * V1 : pointeurs vers les sections clés. Phase 2 : guides pas-à-pas
 * + recherche FAQ + lien direct vers support.
 */

export const metadata = {
  title: "Aide · Gabon Connect — Administrations",
}

export default function AdminAidePage() {
  return (
    <>
      <PageHeader
        breadcrumbs={["Mon espace", "Aide"]}
        title="Centre d'aide"
        subtitle="Guides, FAQ et contact du support technique pour les agents."
      />
      <div
        style={{
          padding: "24px 32px",
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          maxWidth: 1100,
        }}
      >
        <HelpCard
          icon="play"
          title="Premiers pas"
          description="Comment configurer votre organisme, inviter votre équipe et publier vos premiers services."
          href="/equipe"
        />
        <HelpCard
          icon="inbox"
          title="Traiter une demande"
          description="Du dépôt à la délivrance : vérifications, pièces, préparation de l'acte, circuit de signature."
          href="/demandes"
        />
        <HelpCard
          icon="edit"
          title="Signature électronique"
          description="Approuver / refuser une étape de circuit, S/MIME, traçabilité des signatures."
          href="/signatures"
        />
        <HelpCard
          icon="mail"
          title="Correspondance officielle"
          description="Échanges inter-administrations + avec les citoyens, accusés de réception, archivage."
          href="/correspondance"
        />
        <HelpCard
          icon="archive"
          title="Archives à valeur probante"
          description="Versement au SAE, DUA, sort final, intégrité, élimination réglementaire."
          href="/archives"
        />
        <HelpCard
          icon="settings"
          title="Mes droits et paramètres"
          description="Permissions associées à votre rôle, préférences de notification, sécurité."
          href="/parametres"
        />
      </div>
      <div style={{ padding: "0 32px 32px", maxWidth: 800 }}>
        <Card>
          <SectionHeading
            title="Vous n'avez pas trouvé ?"
            subtitle="Le centre d'aide complet sera enrichi au fil du déploiement."
            level={2}
          />
          <p
            style={{
              fontSize: 13.5,
              color: "var(--ink-700)",
              lineHeight: 1.6,
              margin: "12px 0 0",
            }}
          >
            En attendant, contactez votre <strong>admin organisme</strong> pour
            toute question fonctionnelle, ou l&apos;équipe Digitalium support
            pour un incident technique (via la console plateforme).
          </p>
        </Card>
      </div>
    </>
  )
}

function HelpCard({
  icon,
  title,
  description,
  href,
}: {
  icon: Parameters<typeof Icon>[0]["name"]
  title: string
  description: string
  href: string
}) {
  return (
    <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>
      <Card>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div
            aria-hidden="true"
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: "var(--primary-50)",
              color: "var(--primary-700)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon name={icon} size={18} />
          </div>
          <div>
            <h3
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "var(--ink-900)",
                margin: 0,
                marginBottom: 4,
              }}
            >
              {title}
            </h3>
            <p
              style={{
                fontSize: 12.5,
                color: "var(--ink-700)",
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              {description}
            </p>
          </div>
        </div>
      </Card>
    </Link>
  )
}
