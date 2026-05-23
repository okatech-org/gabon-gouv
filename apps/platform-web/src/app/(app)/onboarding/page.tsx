import {
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  Icon,
  PageHeader,
  SectionHeading,
  Table,
  Td,
  Th,
  Tr,
} from "@workspace/ui"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"
import { requirePlatformUser } from "@/lib/current-platform-user"
import { longDate } from "@/lib/format"
import { ValidateStepButton } from "./validate-step-button"
import { StartSignatureButton } from "./start-signature-button"
import { AddReferentButton } from "./add-referent-button"

export default async function PlatformOnboardingPage() {
  const { token } = await requirePlatformUser()
  const data = await convex.query(api.platform.onboarding.getOnboardingDashboard, { token })

  if (!data) {
    return (
      <>
        <PageHeader breadcrumbs={["Onboarding"]} title="Aucun onboarding en cours" />
        <div style={{ padding: "20px 32px", maxWidth: 800 }}>
          <Card>
            <div style={{ padding: 16, color: "var(--ink-600)", fontSize: 14 }}>
              Aucun processus d&apos;onboarding actif pour l&apos;instant. Démarrez-en un
              depuis la page « Organisations » en cliquant sur{" "}
              <b>Enregistrer une administration</b>.
            </div>
          </Card>
        </div>
      </>
    )
  }

  const target = data.targetOrg
  const fiche: Array<[string, string]> = [
    ["Dénomination", target.denomination],
    ["Forme juridique", target.legalForm],
    ["Sigle", target.acronym],
    ["Tutelle", target.tutelage],
    ["Décret de création", target.decree],
    ["Siège", target.headquarters],
    ["NIF", target.taxId],
    ["Téléphone officiel", target.phone],
  ]

  const activeStep = data.steps.find((s) => s.status === "active")

  return (
    <>
      <PageHeader
        breadcrumbs={["Onboarding", target.denomination]}
        title={`Onboarding · ${target.acronym !== "—" ? target.acronym : target.denomination}`}
        subtitle={target.denomination}
        meta={
          <>
            <Badge tone="warning" dot>
              Étape {data.currentStepIndex} / {data.totalSteps} ·{" "}
              {data.currentStepLabel}
            </Badge>
            <span style={{ fontSize: 12, color: "var(--ink-600)" }}>
              Initié le {longDate(data.initiatedAt)} par <b>{data.initiatedBy}</b>
            </span>
          </>
        }
        actions={
          <>
            <Button variant="ghost" icon="messageSquare">
              Contacter
            </Button>
            <Button variant="secondary" icon="save">
              Sauvegarder
            </Button>
            {activeStep ? (
              <ValidateStepButton stepId={activeStep.id} stepLabel={activeStep.title} />
            ) : (
              <Badge tone="archived" dot>
                Process terminé
              </Badge>
            )}
          </>
        }
      />

      <div
        style={{
          padding: "20px 32px",
          display: "grid",
          gridTemplateColumns: "280px 1fr",
          gap: 24,
          maxWidth: 1400,
          width: "100%",
        }}
      >
        {/* Stepper vertical */}
        <Card padded={false}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--ink-150)" }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--ink-500)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Étapes d&apos;onboarding
            </div>
          </div>
          <div style={{ padding: 14 }}>
            {data.steps.map((s, i, arr) => (
              <div key={s.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background:
                        s.status === "done"
                          ? "var(--success-500)"
                          : s.status === "active"
                            ? "var(--primary-500)"
                            : "white",
                      border: `1.5px solid ${
                        s.status === "done"
                          ? "var(--success-500)"
                          : s.status === "active"
                            ? "var(--primary-500)"
                            : "var(--ink-300)"
                      }`,
                      color: s.status === "pending" ? "var(--ink-500)" : "white",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {s.status === "done" ? (
                      <Icon name="check" size={11} stroke={3} />
                    ) : (
                      i + 1
                    )}
                  </span>
                  {i < arr.length - 1 && (
                    <span
                      style={{
                        width: 1.5,
                        flex: 1,
                        minHeight: 26,
                        background:
                          s.status === "pending"
                            ? "var(--ink-200)"
                            : "var(--ink-300)",
                      }}
                    />
                  )}
                </div>
                <div style={{ flex: 1, paddingBottom: 12 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: s.status === "active" ? 700 : 500,
                      color:
                        s.status === "active"
                          ? "var(--primary-700)"
                          : "var(--ink-800)",
                    }}
                  >
                    {s.title}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Fiche organisme */}
          <Card>
            <SectionHeading
              title="Fiche organisme"
              subtitle="Récapitulatif des informations collectées aux étapes 1 à 3."
              level={3}
            />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "14px 32px",
                fontSize: 13.5,
              }}
            >
              {fiche.map(([k, v]) => (
                <div key={k} style={{ display: "grid", gridTemplateColumns: "180px 1fr" }}>
                  <span style={{ color: "var(--ink-500)" }}>{k}</span>
                  <span style={{ fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Référents */}
          <Card>
            <SectionHeading
              title="Référents désignés"
              subtitle={`${data.referents.length} référent${data.referents.length > 1 ? "s" : ""} avec habilitations.`}
              level={3}
              action={<AddReferentButton processId={data.processId} />}
            />
            {data.referents.length === 0 ? (
              <div style={{ padding: 16, fontSize: 13, color: "var(--ink-500)" }}>
                Aucun référent désigné pour l&apos;instant.
              </div>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Nom</Th>
                    <Th>Fonction</Th>
                    <Th>E-mail</Th>
                    <Th>Rôle Gabon Connect</Th>
                    <Th>Authentification</Th>
                    <Th>{" "}</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.referents.map((p) => (
                    <Tr key={p.id}>
                      <Td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Avatar name={p.name} tone="primary" size={24} />
                          <span style={{ fontWeight: 600 }}>{p.name}</span>
                        </div>
                      </Td>
                      <Td>{p.function}</Td>
                      <Td style={{ color: "var(--ink-600)" }}>{p.email}</Td>
                      <Td>
                        <Badge tone="primary" size="sm">
                          {p.role}
                        </Badge>
                      </Td>
                      <Td>{p.auth}</Td>
                      <Td>
                        <Icon name="moreH" size={16} style={{ color: "var(--ink-400)" }} />
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>

          {/* Convention */}
          {data.convention && (
            <Card>
              <SectionHeading
                title="Signature de la convention"
                subtitle="Étape en cours — convention type pour la catégorie d'organisme."
                level={3}
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>
                <div>
                  <div
                    style={{
                      border: "1px solid var(--ink-200)",
                      borderRadius: 8,
                      padding: 20,
                      background: "var(--ink-50)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 6,
                          background: "var(--primary-500)",
                          color: "white",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Icon name="fileText" size={20} />
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14.5, fontWeight: 700 }}>
                          {data.convention.title}
                        </div>
                        <div style={{ fontSize: 12.5, color: "var(--ink-600)" }}>
                          {data.convention.version} ·{" "}
                          {data.convention.articleChecklist.length} articles · générée le{" "}
                          {longDate(data.convention.generatedAt)}
                        </div>
                      </div>
                      <Button variant="secondary" size="sm" icon="eye">
                        Lire
                      </Button>
                    </div>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    {data.convention.articleChecklist.map((a) => (
                      <div key={a.articleNumber}>
                        <Checkbox
                          checked={a.accepted}
                          label={`Article ${a.articleNumber} — ${a.label}${a.accepted ? " validés" : " (en attente)"}`}
                          id={`art-${a.articleNumber}`}
                        />
                        <div style={{ height: 6 }} />
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--ink-500)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Statut convention
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: 10,
                      background: "var(--ink-50)",
                      borderRadius: 6,
                    }}
                  >
                    <Icon name="fingerprint" size={16} style={{ color: "var(--ink-500)" }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        Plateforme Digitalium
                      </div>
                      <Badge tone="archived" size="sm" dot>
                        Signé · côté plateforme
                      </Badge>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: 10,
                      background: "var(--ink-50)",
                      borderRadius: 6,
                    }}
                  >
                    <Icon name="fingerprint" size={16} style={{ color: "var(--ink-500)" }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        {target.acronym !== "—" ? target.acronym : "Organisme"}
                      </div>
                      <Badge
                        tone={data.convention.status === "signed" ? "archived" : "warning"}
                        size="sm"
                        dot
                      >
                        {data.convention.status === "signed"
                          ? "Signé"
                          : data.convention.status === "pending_signature"
                            ? "En attente de signature"
                            : "Brouillon"}
                      </Badge>
                    </div>
                  </div>
                  {data.conventionStepActive && data.convention.status !== "signed" && (
                    <StartSignatureButton processId={data.processId} />
                  )}
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
