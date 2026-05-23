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
import {
  getOnboardingReferents,
  getOnboardingSteps,
  getOnboardingTargetOrg,
} from "@workspace/mocks/platform"

export default async function PlatformOnboardingPage() {
  const [steps, referents, target] = await Promise.all([
    getOnboardingSteps(),
    getOnboardingReferents(),
    getOnboardingTargetOrg(),
  ])

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

  const signataires: Array<{ who: string; status: string; tone: "archived" | "warning" }> = [
    { who: "Y. MAGANGA · Gabon Connect", status: "Signé · 18/05/2026", tone: "archived" },
    { who: "T. NTOUTOUME · DG ARSEE", status: "En attente de signature", tone: "warning" },
  ]

  return (
    <>
      <PageHeader
        breadcrumbs={["Onboarding", "ARSEE — Régulation Énergie"]}
        title="Onboarding · ARSEE"
        subtitle="Autorité de Régulation du Secteur de l'Eau potable et de l'Énergie électrique"
        meta={
          <>
            <Badge tone="warning" dot>
              Étape 4 / 7 · Convention
            </Badge>
            <span style={{ fontSize: 12, color: "var(--ink-600)" }}>
              Initié le 02 mai 2026 par <b>Y. MAGANGA</b>
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
            <Button icon="check">Valider l&apos;étape</Button>
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
            {steps.map((s, i, arr) => (
              <div key={s.title} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
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
              subtitle="3 référents avec habilitations."
              level={3}
              action={
                <Button variant="ghost" icon="plus" size="sm">
                  Ajouter
                </Button>
              }
            />
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
                {referents.map((p) => (
                  <Tr key={p.email}>
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
          </Card>

          {/* Convention */}
          <Card>
            <SectionHeading
              title="Signature de la convention"
              subtitle="Étape en cours — convention type pour les autorités administratives indépendantes."
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
                        Convention d&apos;adhésion Gabon Connect · ARSEE
                      </div>
                      <div style={{ fontSize: 12.5, color: "var(--ink-600)" }}>
                        v 2.4 · 14 articles · 18 pages · générée le 18/05/2026
                      </div>
                    </div>
                    <Button variant="secondary" size="sm" icon="eye">
                      Lire
                    </Button>
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <Checkbox
                    checked={true}
                    label="Article 1 — Objet et périmètre validés"
                    id="a1"
                  />
                  <div style={{ height: 6 }} />
                  <Checkbox
                    checked={true}
                    label="Article 4 — Engagements de service (SLA, support, sécurité)"
                    id="a4"
                  />
                  <div style={{ height: 6 }} />
                  <Checkbox
                    checked={true}
                    label="Article 7 — Protection des données personnelles (loi 001/2011)"
                    id="a7"
                  />
                  <div style={{ height: 6 }} />
                  <Checkbox
                    checked={false}
                    label="Article 11 — Tarification & facturation (en attente de validation DGB)"
                    id="a11"
                  />
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
                  Signataires
                </div>
                {signataires.map((s) => (
                  <div
                    key={s.who}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: 10,
                      background: "var(--ink-50)",
                      borderRadius: 6,
                    }}
                  >
                    <Icon
                      name="fingerprint"
                      size={16}
                      style={{ color: "var(--ink-500)" }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{s.who}</div>
                      <Badge tone={s.tone} size="sm" dot>
                        {s.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                <Button variant="success" icon="shieldCheck" style={{ marginTop: 8 }}>
                  Lancer la signature
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}
