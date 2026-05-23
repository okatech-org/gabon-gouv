import type { ReactNode } from "react"
import { notFound, redirect } from "next/navigation"
import {
  AppHeader,
  Badge,
  Button,
  Frame,
  Icon,
  PageHeader,
  SectionHeading,
  Select,
  Sidebar,
  Tabs,
} from "@workspace/ui"
import { api } from "@workspace/backend/generated"
import { getTemplateVariables } from "@workspace/mocks/admin"
import { ADMIN_NAV } from "@/lib/admin-nav"
import { convex } from "@/lib/convex"
import { getCurrentAgent } from "@/lib/current-agent"
import { agentRoleLabel } from "@/lib/format"

interface InstructionForGenerationCitizen {
  name: string
  nip: string
  email: string
  birthDate: string
  birthPlace: string
  parents: string | null
}

interface InstructionForGeneration {
  ref: string
  service?: { title: string; slug: string }
  citizen?: InstructionForGenerationCitizen
}

const Var = ({ children }: { children: ReactNode }) => (
  <span
    style={{
      background: "rgba(35, 120, 195, 0.12)",
      color: "var(--primary-700)",
      padding: "0 4px",
      borderRadius: 3,
      fontWeight: 600,
    }}
  >
    {children}
  </span>
)

export default async function AdminGenerationPage({
  params,
}: {
  params: Promise<{ ref: string }>
}) {
  const session = await getCurrentAgent()
  if (!session) redirect("/login")

  const { ref } = await params
  const [instruction, variables] = await Promise.all([
    convex.query(api.admin.requests.getInstruction, {
      token: session.token,
      ref,
    }) as Promise<InstructionForGeneration | null>,
    getTemplateVariables(),
  ])

  if (!instruction) notFound()

  const citizen = instruction.citizen
  const serviceTitle = instruction.service?.title ?? "Acte"

  return (
    <Frame width={1440} height={1100}>
      <AppHeader
        org={session.agent.organism?.shortName ?? session.agent.organism?.name}
        user={session.agent.name}
        role={agentRoleLabel(session.agent.role)}
      />
      <div style={{ display: "flex" }}>
        <Sidebar items={ADMIN_NAV} current="documents" />
        <main style={{ flex: 1, overflow: "hidden" }}>
          <PageHeader
            breadcrumbs={[
              <a key="g" href="/" style={{ color: "inherit" }}>
                Génération
              </a>,
              serviceTitle,
            ]}
            title={`Générer un ${serviceTitle.toLowerCase()}`}
            subtitle={`Template officiel · pré-rempli depuis la demande ${instruction.ref}`}
            actions={
              <>
                <Button variant="ghost" icon="save">
                  Sauvegarder brouillon
                </Button>
                <Button variant="secondary" icon="eye">
                  Prévisualiser PDF
                </Button>
                <Button variant="success" icon="shieldCheck">
                  Signer &amp; émettre
                </Button>
              </>
            }
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "380px 1fr",
              gap: 0,
              minHeight: 920,
            }}
          >
            {/* Inspector */}
            <aside
              style={{
                borderRight: "1px solid var(--ink-200)",
                padding: 20,
                display: "flex",
                flexDirection: "column",
                gap: 16,
                background: "white",
              }}
            >
              <Tabs
                tabs={[
                  { id: "t", label: "Variables" },
                  { id: "s", label: "Signature" },
                  { id: "d", label: "Diffusion" },
                ]}
                current="t"
                variant="line"
              />
              <div>
                <SectionHeading title="Template" level={3} />
                <Select defaultValue="copie">
                  <option value="copie">Copie intégrale · v3.2 · officielle</option>
                  <option>Extrait avec filiation · v3.2</option>
                  <option>Extrait sans filiation · v3.2</option>
                </Select>
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--ink-600)",
                    marginTop: 8,
                    lineHeight: 1.5,
                  }}
                >
                  <Icon
                    name="info"
                    size={12}
                    style={{ verticalAlign: "middle", marginRight: 4 }}
                  />
                  Modèle validé par le Comité d&apos;État Civil le 14/02/2025. Toute
                  modification doit être validée par votre Direction.
                </p>
              </div>
              <div style={{ height: 1, background: "var(--ink-150)" }} />
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--ink-500)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: 10,
                  }}
                >
                  Variables (auto-renseignées)
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {variables.map((v) => (
                    <div
                      key={v.key}
                      style={{
                        border: "1px solid var(--ink-200)",
                        borderRadius: 6,
                        padding: 10,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 11,
                            color: "var(--primary-600)",
                            fontWeight: 700,
                          }}
                        >
                          {"{{ " + v.key + " }}"}
                        </span>
                        <Badge tone="primary" size="sm">
                          {v.source}
                        </Badge>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>
                        {v.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>

            {/* Document preview */}
            <div
              style={{
                padding: "24px 40px",
                background: "var(--ink-100)",
                overflow: "auto",
              }}
            >
              <div
                style={{
                  maxWidth: 720,
                  margin: "0 auto",
                  background: "white",
                  boxShadow: "var(--shadow-md)",
                  borderRadius: 4,
                  padding: "56px 64px",
                  minHeight: 880,
                  position: "relative",
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%) rotate(-22deg)",
                    fontSize: 60,
                    fontWeight: 900,
                    color: "rgba(26, 68, 128, 0.06)",
                    letterSpacing: "0.1em",
                    userSelect: "none",
                    pointerEvents: "none",
                  }}
                >
                  BROUILLON
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderBottom: "2px solid var(--ink-900)",
                    paddingBottom: 14,
                    marginBottom: 24,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                      }}
                    >
                      RÉPUBLIQUE GABONAISE
                    </div>
                    <div style={{ fontSize: 10, color: "var(--ink-700)", marginTop: 2 }}>
                      Union · Travail · Justice
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, marginTop: 8 }}>
                      Ministère de l&apos;Intérieur
                    </div>
                    <div style={{ fontSize: 11, color: "var(--ink-700)" }}>
                      {session.agent.organism?.name ??
                        "Direction Générale de l'État Civil"}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: "var(--ink-600)" }}>
                      Réf.{" "}
                      <b style={{ fontFamily: "var(--font-mono)" }}>{instruction.ref}</b>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--ink-600)" }}>
                      Commune de <b>Libreville</b>
                    </div>
                  </div>
                </div>

                <h2
                  style={{
                    fontSize: 22,
                    textAlign: "center",
                    letterSpacing: "0.04em",
                  }}
                >
                  EXTRAIT D&apos;ACTE DE NAISSANCE
                </h2>
                <p
                  style={{
                    fontSize: 12,
                    color: "var(--ink-600)",
                    textAlign: "center",
                    marginTop: 4,
                  }}
                >
                  (Copie intégrale)
                </p>

                <div style={{ marginTop: 28, fontSize: 13.5, lineHeight: 1.8 }}>
                  <p>
                    L&apos;an <Var>deux mille vingt-six</Var>, le{" "}
                    <Var>vingt-huit mai</Var>, à dix heures et quarante-sept minutes,
                  </p>
                  <p>
                    est délivré par nos soins, officier d&apos;état civil de la commune de{" "}
                    <Var>Libreville</Var>, le présent extrait conforme à l&apos;acte du
                    registre des naissances, rédigé comme suit :
                  </p>
                  <div
                    style={{
                      background: "var(--ink-50)",
                      padding: "12px 16px",
                      borderRadius: 4,
                      marginTop: 10,
                      border: "1px dashed var(--ink-300)",
                    }}
                  >
                    {citizen ? (
                      <>
                        « Le <Var>{citizen.birthDate}</Var>, est né(e) à{" "}
                        <Var>{citizen.birthPlace}</Var>, <Var>{citizen.name}</Var>
                        {citizen.parents ? (
                          <>
                            {" "}
                            de <Var>{citizen.parents}</Var>… »
                          </>
                        ) : (
                          " »"
                        )}
                      </>
                    ) : (
                      "« Données du citoyen indisponibles. »"
                    )}
                  </div>
                  <p style={{ marginTop: 16 }}>
                    Mentions marginales : <Var>Néant</Var>.
                  </p>
                  <p>Pour copie certifiée conforme à l&apos;original.</p>
                </div>

                <div
                  style={{
                    marginTop: 32,
                    paddingTop: 16,
                    borderTop: "1px dashed var(--ink-300)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                  }}
                >
                  <div style={{ fontSize: 11, color: "var(--ink-500)" }}>
                    Document généré par Gabon Connect
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "var(--ink-600)" }}>
                      L&apos;officier d&apos;état civil
                    </div>
                    <div
                      style={{
                        marginTop: 8,
                        padding: "8px 16px",
                        border: "2px dashed var(--ink-300)",
                        borderRadius: 6,
                        color: "var(--ink-500)",
                        fontSize: 12,
                        fontStyle: "italic",
                      }}
                    >
                      signature en attente
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </Frame>
  )
}
