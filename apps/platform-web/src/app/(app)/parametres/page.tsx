import { Badge, Card, Icon, PageHeader, SectionHeading, Toggle } from "@workspace/ui"
import { requirePlatformUser } from "@/lib/current-platform-user"
import { SignOutButton } from "./sign-out-button"

export default async function PlatformParametresPage() {
  const { user } = await requirePlatformUser()

  const identityFields: Array<[string, string]> = [
    ["Nom", user.name],
    ["E-mail", user.email],
    ["NIP", user.nip],
    ["Rôle", "Admin plateforme"],
    ["Organisme", user.organism?.name ?? "—"],
  ]

  // Réglages mock — à brancher Convex dans une 2e itération.
  const guardrails = [
    {
      label: "LoA minimum citoyen",
      value: "eidas2",
      hint: "Niveau d'assurance requis pour accéder à /mon-espace.",
    },
    {
      label: "Durée de session admin",
      value: "12 h",
      hint: "Expiration automatique après inactivité.",
    },
    {
      label: "Rétention audit log",
      value: "10 ans",
      hint: "Conformité NF Z42-013.",
    },
    {
      label: "Délai max instruction par défaut",
      value: "30 jours",
      hint: "Override possible service par service.",
    },
  ]

  return (
    <>
      <PageHeader
        breadcrumbs={["Plateforme", "Paramètres"]}
        title="Paramètres plateforme"
        subtitle="Identité administrateur, garde-fous de la plateforme, notifications et sécurité de session."
      />
      <div
        style={{
          padding: "24px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
          maxWidth: 960,
          width: "100%",
        }}
      >
        {/* Identité admin */}
        <Card>
          <SectionHeading
            title="Mon identité administrateur"
            subtitle="Vos informations sont gérées par Digitalium. Pour une rectification, contactez la direction."
            level={2}
            action={
              <Badge tone="archived" size="sm" dot icon="lock">
                Lecture seule
              </Badge>
            }
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
            {identityFields.map(([k, v]) => (
              <div key={k} style={{ display: "contents" }}>
                <dt style={{ color: "var(--ink-600)" }}>{k}</dt>
                <dd style={{ margin: 0, fontWeight: 600 }}>{v}</dd>
              </div>
            ))}
          </dl>
        </Card>

        {/* Garde-fous plateforme */}
        <Card>
          <SectionHeading
            title="Garde-fous plateforme"
            subtitle="Règles transverses appliquées à toutes les administrations connectées. Modifiable uniquement par les admins Digitalium."
            level={2}
          />
          <dl
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: 0,
              fontSize: 13.5,
              margin: 0,
            }}
          >
            {guardrails.map((g) => (
              <div
                key={g.label}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  alignItems: "center",
                  padding: "12px 0",
                  borderBottom: "1px solid var(--ink-150)",
                  gap: 16,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{g.label}</div>
                  <div
                    style={{
                      fontSize: 12.5,
                      color: "var(--ink-600)",
                      marginTop: 2,
                    }}
                  >
                    {g.hint}
                  </div>
                </div>
                <Badge tone="primary" size="sm">
                  {g.value}
                </Badge>
              </div>
            ))}
          </dl>
        </Card>

        {/* Notifications */}
        <Card>
          <SectionHeading
            title="Préférences de notification"
            subtitle="Alertes plateforme, onboarding, incidents infra et anomalies de service."
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
            <legend className="sr-only">Canaux de notification plateforme</legend>
            <Toggle checked label="E-mail — incidents infra & alertes SLO" />
            <Toggle checked={false} label="SMS — alertes critiques uniquement" />
            <Toggle checked label="Récap quotidien — synthèse plateforme" />
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

        {/* Sécurité de session */}
        <Card>
          <SectionHeading
            title="Sécurité de session"
            subtitle="Session NIP simulée. Sera remplacée par OIDC ANINF + 2FA en production."
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
              <div style={{ fontSize: 14, fontWeight: 600 }}>Session active</div>
              <div style={{ fontSize: 12.5, color: "var(--ink-600)" }}>
                Cookie <code>gc_platform_session</code> · expire après 12 h
                d&apos;inactivité.
              </div>
            </div>
            <SignOutButton />
          </div>
        </Card>
      </div>
    </>
  )
}
