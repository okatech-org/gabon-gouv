import {
  Badge,
  Card,
  Icon,
  PageHeader,
  SectionHeading,
} from "@workspace/ui"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"
import { requireCurrentSession } from "@/lib/current-citizen"

const LOA_LABELS: Record<1 | 2 | 3, { label: string; description: string }> = {
  1: {
    label: "LoA 1 · Faible",
    description: "E-mail vérifié. Services informatifs uniquement.",
  },
  2: {
    label: "LoA 2 · Substantiel",
    description: "Document d'identité + selfie liveness. Démarches consulaires et services sensibles.",
  },
  3: {
    label: "LoA 3 · Élevé",
    description: "KYC vidéo + état civil. Services régaliens (impôts, santé, état civil).",
  },
}

const SOURCE_LABEL: Record<
  string,
  { label: string; tone: "archived" | "warning" | "neutral"; note: string }
> = {
  idn: {
    label: "Connexion OIDC identité.ga",
    tone: "archived",
    note: "Votre identité a été fédérée par le portail citoyen.ga.",
  },
  nip_demo: {
    label: "Démo NIP",
    tone: "warning",
    note: "Voie de secours sandbox — sera désactivée en production.",
  },
  sandbox_seed: {
    label: "Compte de démonstration (seed)",
    tone: "warning",
    note: "Compte fictif fourni avec le seed de développement.",
  },
}

export default async function CitizenIdentitePage() {
  const session = await requireCurrentSession()
  const data = await convex.query(api.citizen.identity.getMyIdentity, {
    idnSub: session.idnSub,
  })

  const loa = LOA_LABELS[data.estimatedLoa as 1 | 2 | 3]
  const source = SOURCE_LABEL[data.source] ?? SOURCE_LABEL.idn

  return (
    <>
      <PageHeader
        breadcrumbs={["Mon espace", "Identité numérique"]}
        title="Identité numérique"
        subtitle="Votre identifiant souverain Gabon Connect, son niveau de vérification et la source d'authentification."
        meta={
          data.verified ? (
            <Badge tone="archived" dot icon="shieldCheck">
              Vérifiée
            </Badge>
          ) : (
            <Badge tone="warning" dot>
              Non vérifiée
            </Badge>
          )
        }
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
        <Card>
          <SectionHeading
            title="Niveau d'assurance (LoA)"
            subtitle="Le niveau d'assurance détermine quelles démarches peuvent être effectuées avec votre identité numérique."
            level={2}
          />
          <div
            style={{
              display: "flex",
              gap: 16,
              alignItems: "center",
              padding: "16px 0",
            }}
          >
            <span
              style={{
                width: 56,
                height: 56,
                borderRadius: 12,
                background: "var(--primary-500)",
                color: "white",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                fontWeight: 800,
              }}
              aria-hidden="true"
            >
              {data.estimatedLoa}
            </span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{loa.label}</div>
              <div
                style={{
                  fontSize: 13.5,
                  color: "var(--ink-600)",
                  marginTop: 2,
                }}
              >
                {loa.description}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <SectionHeading
            title="Source d'authentification"
            subtitle="Comment vous êtes actuellement connecté·e à Gabon Connect."
            level={2}
            action={<Badge tone={source.tone} dot>{source.label}</Badge>}
          />
          <p
            style={{
              fontSize: 13.5,
              color: "var(--ink-700)",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {source.note}
          </p>
          <dl
            style={{
              marginTop: 18,
              display: "grid",
              gridTemplateColumns: "200px 1fr",
              gap: "10px 16px",
              fontSize: 13.5,
            }}
          >
            <dt style={{ color: "var(--ink-600)" }}>Identifiant IDN</dt>
            <dd
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12.5,
                margin: 0,
                wordBreak: "break-all",
              }}
            >
              {data.idnSub ?? "—"}
            </dd>
            <dt style={{ color: "var(--ink-600)" }}>Dernière vérification</dt>
            <dd style={{ margin: 0, fontWeight: 600 }}>
              {data.verifiedAt ? (
                <time
                  dateTime={
                    data.verifiedAtMs
                      ? new Date(data.verifiedAtMs).toISOString()
                      : undefined
                  }
                >
                  {data.verifiedAt}
                </time>
              ) : (
                "Jamais"
              )}
            </dd>
          </dl>
        </Card>

        <Card>
          <SectionHeading
            title="Gérer mon identité numérique"
            subtitle="Vos données IDN (KYC, appareils de confiance, journal des connexions) sont gérées par identité.ga."
            level={2}
          />
          <a
            href={data.portalUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 16px",
              background: "var(--primary-50)",
              border: "1px solid var(--primary-200, #c7d6ee)",
              borderRadius: 8,
              color: "var(--primary-700)",
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            <Icon name="externalLink" size={14} aria-hidden="true" />
            Ouvrir mon compte sur identité.ga
          </a>
          <p
            style={{
              fontSize: 12.5,
              color: "var(--ink-600)",
              marginTop: 14,
              padding: 12,
              background: "var(--ink-50)",
              borderRadius: 8,
            }}
          >
            <Icon
              name="lock"
              size={12}
              style={{ verticalAlign: "middle", marginRight: 6 }}
              aria-hidden="true"
            />
            Gabon Connect ne stocke que l&apos;identifiant fédéré et les claims
            techniques nécessaires (LoA, vérification). Aucune copie de vos
            pièces d&apos;identité n&apos;est conservée ici.
          </p>
        </Card>
      </div>
    </>
  )
}
