import {
  AppHeader,
  Avatar,
  Badge,
  Button,
  Card,
  Frame,
  Icon,
  PageHeader,
  PipelineStep,
  Progress,
  SectionHeading,
  Sidebar,
  Tabs,
  TextArea,
} from "@workspace/ui"
import { getCurrentAdmin, getInstruction } from "@workspace/mocks/admin"
import { ADMIN_NAV } from "@/lib/admin-nav"

export default async function AdminInstructionPage({
  params,
}: {
  params: Promise<{ ref: string }>
}) {
  const { ref } = await params
  const [admin, instruction] = await Promise.all([
    getCurrentAdmin(),
    getInstruction(ref),
  ])

  const { citizen, verifications, sourceAct, pieces, internalNote, pipeline } = instruction
  const okCount = verifications.filter((v) => v.status === "ok").length

  return (
    <Frame width={1440} height={1100}>
      <AppHeader org={admin.org} user={admin.name} role={admin.role} />
      <div style={{ display: "flex" }}>
        <Sidebar items={ADMIN_NAV} current="queue" />
        <main style={{ flex: 1, overflow: "hidden" }}>
          <PageHeader
            breadcrumbs={[
              <a key="q" href="/demandes" style={{ color: "inherit" }}>
                File de demandes
              </a>,
              instruction.ref,
            ]}
            title={instruction.title}
            subtitle={instruction.subtitle}
            meta={
              <>
                <span style={{ fontSize: 13, color: "var(--ink-600)" }}>
                  <Icon
                    name="hash"
                    size={12}
                    style={{ verticalAlign: "middle", marginRight: 4 }}
                  />
                  {instruction.ref}
                </span>
                <Badge tone="active" dot>
                  En instruction
                </Badge>
                <Badge tone="neutral" icon="user">
                  Assignée à vous
                </Badge>
              </>
            }
            actions={
              <>
                <Button variant="ghost" icon="messageSquare">
                  Écrire au citoyen
                </Button>
                <Button variant="secondary" icon="share">
                  Transférer
                </Button>
                <Button variant="success" icon="check">
                  Valider &amp; signer
                </Button>
              </>
            }
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 360px",
              gap: 0,
              minHeight: 880,
            }}
          >
            {/* Main */}
            <div
              style={{
                padding: "20px 32px",
                display: "flex",
                flexDirection: "column",
                gap: 16,
                borderRight: "1px solid var(--ink-200)",
              }}
            >
              <Tabs
                tabs={[
                  { id: "instr", label: "Instruction" },
                  { id: "pieces", label: `Pièces (${pieces.length})` },
                  { id: "hist", label: "Historique" },
                  { id: "messages", label: "Messages (2)" },
                ]}
                current="instr"
                variant="line"
              />

              {/* Source citoyen */}
              <Card padded={false}>
                <div
                  style={{
                    padding: 18,
                    borderBottom: "1px solid var(--ink-150)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <Avatar name={citizen.name} tone="green" size={40} />
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{citizen.name}</div>
                      <div style={{ fontSize: 12, color: "var(--ink-600)" }}>
                        NIP{" "}
                        <span style={{ fontFamily: "var(--font-mono)" }}>{citizen.nip}</span> ·{" "}
                        {citizen.email}
                      </div>
                    </div>
                  </div>
                  <a
                    href={`/dossiers/${citizen.nip.replace(/\s/g, "")}`}
                    style={{ textDecoration: "none", display: "inline-flex" }}
                  >
                    <Button variant="ghost" iconRight="externalLink" size="sm">
                      Voir son dossier 360°
                    </Button>
                  </a>
                </div>
                <div
                  style={{
                    padding: 18,
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "14px 28px",
                    fontSize: 13.5,
                  }}
                >
                  {(
                    [
                      ["Type d'acte", citizen.type],
                      ["Nombre de copies", citizen.copies],
                      ["Date de naissance", citizen.birthDate],
                      ["Lieu de naissance", citizen.birthPlace],
                      ["Filiation déclarée", citizen.parents],
                      ["Adresse e-mail", citizen.email],
                    ] as const
                  ).map(([k, v]) => (
                    <div
                      key={k}
                      style={{ display: "grid", gridTemplateColumns: "160px 1fr" }}
                    >
                      <span style={{ color: "var(--ink-500)" }}>{k}</span>
                      <span style={{ fontWeight: 600 }}>{v}</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Vérifications automatiques */}
              <Card>
                <SectionHeading
                  title="Vérifications automatiques"
                  level={3}
                  action={
                    <Badge tone="archived" dot icon="check">
                      {okCount}/{verifications.length} OK
                    </Badge>
                  }
                />
                {verifications.map((v) => (
                  <div
                    key={v.title}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      padding: "10px 0",
                      borderBottom: "1px solid var(--ink-150)",
                    }}
                  >
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        flexShrink: 0,
                        background:
                          v.status === "ok" ? "var(--success-500)" : "var(--ink-300)",
                        color: "white",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginTop: 2,
                      }}
                    >
                      <Icon
                        name={v.status === "ok" ? "check" : "clock"}
                        size={12}
                        stroke={3}
                      />
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600 }}>{v.title}</div>
                      <div style={{ fontSize: 12.5, color: "var(--ink-600)" }}>
                        {v.description}
                      </div>
                    </div>
                  </div>
                ))}
              </Card>

              {/* Acte source */}
              <Card>
                <SectionHeading
                  title="Acte source au registre"
                  subtitle={`Acte n° ${sourceAct.order} — registre de naissances de Libreville, année 1992`}
                  level={3}
                  action={
                    <Button variant="secondary" size="sm" icon="check">
                      Confirmer correspondance
                    </Button>
                  }
                />
                <div
                  style={{
                    background: "var(--ink-50)",
                    border: "1px dashed var(--ink-300)",
                    borderRadius: 8,
                    padding: 20,
                    fontSize: 13,
                    color: "var(--ink-700)",
                    lineHeight: 1.7,
                  }}
                >
                  {sourceAct.text}
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 16,
                    marginTop: 12,
                    fontSize: 12,
                    color: "var(--ink-600)",
                  }}
                >
                  <span>
                    <b>Registre :</b> {sourceAct.register}
                  </span>
                  <span>
                    <b>Page :</b> {sourceAct.page}
                  </span>
                  <span>
                    <b>Numéro d&apos;ordre :</b> {sourceAct.order}
                  </span>
                  <span>
                    <b>Mentions :</b> {sourceAct.mentions}
                  </span>
                </div>
              </Card>
            </div>

            {/* Right drawer */}
            <aside
              style={{
                padding: 20,
                background: "var(--ink-50)",
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <Card padded={false}>
                <div style={{ padding: 14 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--ink-500)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Échéance
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>Dans 1 jour</div>
                  <div style={{ fontSize: 12, color: "var(--ink-600)", marginTop: 2 }}>
                    21 mai 14:32 → 23 mai 14:32
                  </div>
                  <Progress value={48} label="48 %" tone="primary" />
                </div>
              </Card>

              <Card padded={false}>
                <div
                  style={{
                    padding: "14px 16px",
                    borderBottom: "1px solid var(--ink-150)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--ink-500)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Étapes de traitement
                  </div>
                </div>
                <div style={{ padding: 14 }}>
                  {pipeline.map((s) => (
                    <PipelineStep
                      key={s.title}
                      name={s.title}
                      status={s.status}
                      duration={s.duration}
                    />
                  ))}
                </div>
              </Card>

              <Card padded={false}>
                <div
                  style={{
                    padding: "14px 16px",
                    borderBottom: "1px solid var(--ink-150)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--ink-500)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Pièces justificatives
                  </div>
                  <Badge tone="archived" size="sm">
                    {pieces.length}/{pieces.length}
                  </Badge>
                </div>
                {pieces.map((p) => (
                  <div
                    key={p.filename}
                    style={{
                      padding: "12px 16px",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      borderBottom: "1px solid var(--ink-150)",
                    }}
                  >
                    <Icon name="fileText" size={16} style={{ color: "var(--primary-500)" }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{p.filename}</div>
                      <div style={{ fontSize: 11.5, color: "var(--ink-500)" }}>
                        {p.size} · OCR {p.ocrConfidence} %
                      </div>
                    </div>
                    <Icon name="eye" size={15} style={{ color: "var(--ink-500)" }} />
                    <Icon name="download" size={15} style={{ color: "var(--ink-500)" }} />
                  </div>
                ))}
                <div style={{ padding: 14 }}>
                  <Button variant="ghost" icon="paperclip" size="sm">
                    Demander une pièce
                  </Button>
                </div>
              </Card>

              <Card padded={false}>
                <div
                  style={{
                    padding: "14px 16px",
                    borderBottom: "1px solid var(--ink-150)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--ink-500)",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Note d&apos;instruction
                  </div>
                </div>
                <div style={{ padding: 14 }}>
                  <TextArea
                    placeholder="Notes internes (non visibles par le citoyen)…"
                    defaultValue={internalNote}
                    style={{ fontSize: 13 }}
                  />
                </div>
              </Card>
            </aside>
          </div>
        </main>
      </div>
    </Frame>
  )
}
