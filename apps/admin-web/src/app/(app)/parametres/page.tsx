import { redirect } from "next/navigation"
import {
  Badge,
  Card,
  Icon,
  PageHeader,
  SectionHeading,
  Toggle,
} from "@workspace/ui"
import { getCurrentAgent } from "@/lib/current-agent"
import { SignOutButton } from "./sign-out-button"

const ROLE_LABEL: Record<string, string> = {
  agent_instructeur: "Agent instructeur",
  agent_superviseur: "Agent superviseur",
  chef_service: "Chef de service",
  officier_signataire: "Officier signataire",
  admin_organisme: "Admin organisme",
  admin_technique: "Admin technique",
  platform_admin: "Admin plateforme",
}

const ROLE_PERMS: Record<string, string[]> = {
  agent_instructeur: [
    "Voir et instruire les demandes",
    "Valider / rejeter des pièces",
    "Préparer un acte (sans signer)",
    "Envoyer des messages aux citoyens",
  ],
  agent_superviseur: [
    "Toutes celles de l'instructeur",
    "Assigner / transférer une demande",
  ],
  chef_service: [
    "Toutes celles du superviseur",
    "Rejeter une demande avec motif",
  ],
  officier_signataire: [
    "Toutes celles du chef de service",
    "Signer et émettre des actes",
    "Verser au SAE",
  ],
  admin_organisme: [
    "Toutes celles de l'officier",
    "Publier / archiver des services",
    "Accorder / révoquer des habilitations dossier",
    "Signer les conventions cross-org",
  ],
  admin_technique: ["Lecture seule (intégrations API)"],
  platform_admin: [
    "Supervision plateforme",
    "Enregistrement / suspension d'organismes",
    "Lecture cross-organisme",
  ],
}

export default async function AdminParametresPage() {
  const session = await getCurrentAgent()
  if (!session) redirect("/login")
  const { agent } = session

  const identityFields: Array<[string, string]> = [
    ["Nom", agent.name],
    ["E-mail professionnel", agent.email],
    ["NIP", agent.nip],
    ["Rôle Gabon Connect", ROLE_LABEL[agent.role] ?? agent.role],
    ["Organisme", agent.organism?.name ?? "—"],
  ]

  const perms = ROLE_PERMS[agent.role] ?? []

  return (
    <>
      <PageHeader
        breadcrumbs={["Mon espace", "Paramètres"]}
        title="Paramètres du compte"
        subtitle="Identité agent, droits associés à votre rôle, préférences de notification et sécurité de session."
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
        <Card>
          <SectionHeading
            title="Mon identité agent"
            subtitle="Vos informations sont gérées par la console plateforme. Pour une rectification, contactez l'admin plateforme de votre organisme."
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

        <Card>
          <SectionHeading
            title={`Droits associés au rôle « ${ROLE_LABEL[agent.role] ?? agent.role} »`}
            subtitle="Permissions accordées par votre rôle dans Gabon Connect (ADR-0006)."
            level={2}
          />
          {perms.length === 0 ? (
            <p style={{ fontSize: 13.5, color: "var(--ink-600)" }}>
              Aucune permission métier active pour ce rôle.
            </p>
          ) : (
            <ul
              style={{
                margin: 0,
                padding: 0,
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {perms.map((p) => (
                <li
                  key={p}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 13.5,
                    color: "var(--ink-800)",
                  }}
                >
                  <Icon
                    name="checkCircle"
                    size={14}
                    style={{ color: "var(--success-500)", flexShrink: 0 }}
                    aria-hidden="true"
                  />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <SectionHeading
            title="Préférences de notification"
            subtitle="Assignations, messages citoyens et alertes d'échéance."
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
            <legend className="sr-only">Canaux de notification agent</legend>
            <Toggle
              checked
              label="E-mail — nouvelles assignations & messages citoyens"
            />
            <Toggle checked={false} label="SMS — alertes échéance dépassée" />
            <Toggle
              checked
              label="Récap quotidien — synthèse des demandes restantes"
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

        <Card>
          <SectionHeading
            title="Sécurité de session"
            subtitle="Session active via NIP simulé. Sera remplacée par OIDC ANINF en production."
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
                Cookie <code>gc_admin_session</code> · expire après 12 h
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
