import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import {
  Avatar,
  Badge,
  Button,
  Card,
  Icon,
  PageHeader,
  PipelineStep,
  Progress,
  SectionHeading,
  Tabs,
} from "@workspace/ui"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"
import { getCurrentAgent } from "@/lib/current-agent"
import {
  longDate,
  relativeTime,
  shortDateTime,
  statusBadge,
} from "@/lib/format"
import { InternalNoteEditor } from "./internal-note-editor"
import { RequestPieceButton } from "./request-piece-button"
import { SignAndIssueButton } from "./sign-button"

interface InstructionPiece {
  label: string
  filename: string
  sizeBytes: number
  status: string
  ocrConfidence?: number
  required: boolean
}

interface InstructionVerification {
  title: string
  description: string
  status: string
}

interface InstructionEvent {
  kind: string
  title: string
  description?: string
  actor?: string
  occurredAt: number
}

interface InstructionData {
  ref: string
  status: string
  progressPct: number
  depositedAt: number
  dueAt?: number
  internalNote: string
  payload?: Record<string, unknown>
  service?: { title: string; slug: string }
  assignedAgent?: { name: string; role: string }
  citizen?: {
    name: string
    nip: string
    email: string
    birthDate: string
    birthPlace: string
    parents: string | null
  }
  pieces: InstructionPiece[]
  verifications: InstructionVerification[]
  events: InstructionEvent[]
}

function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} Mo`
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(0)} Ko`
  return `${bytes} o`
}

function verificationStatusOk(status: string): boolean {
  return status === "ok" || status === "passed"
}

type PipelineStatus = "done" | "active" | "pending" | "error"

function eventToPipeline(events: InstructionEvent[]): {
  title: string
  status: PipelineStatus
  duration?: string
}[] {
  // Pipeline canonique des étapes de traitement.
  const STAGES: { title: string; kinds: string[] }[] = [
    { title: "Réception & contrôle", kinds: ["submitted", "received", "deposited"] },
    { title: "Pré-instruction agent", kinds: ["assigned", "pre_instruction", "in_instruction"] },
    { title: "Recherche registre", kinds: ["registry_check", "waiting_registry"] },
    { title: "Visa officier", kinds: ["to_sign", "supervisor_review"] },
    { title: "Signature & émission", kinds: ["signed", "issued"] },
    { title: "Archivage probant", kinds: ["archived"] },
  ]

  const seen = new Set(events.map((e) => e.kind))
  let activeFound = false

  return STAGES.map((stage) => {
    const matched = stage.kinds.some((k) => seen.has(k))
    if (matched) {
      return { title: stage.title, status: "done" as PipelineStatus }
    }
    if (!activeFound) {
      activeFound = true
      return { title: stage.title, status: "active" as PipelineStatus }
    }
    return { title: stage.title, status: "pending" as PipelineStatus }
  })
}

export default async function AdminInstructionPage({
  params,
}: {
  params: Promise<{ ref: string }>
}) {
  const session = await getCurrentAgent()
  if (!session) redirect("/login")

  const { ref } = await params
  const instruction = (await convex.query(api.admin.requests.getInstruction, {
    token: session.token,
    ref,
  })) as InstructionData | null

  if (!instruction) notFound()

  const { citizen, verifications, pieces, internalNote, events } = instruction
  const okCount = verifications.filter((v) => verificationStatusOk(v.status)).length
  const piecesValid = pieces.filter(
    (p) => p.status === "uploaded" || p.status === "validated",
  ).length
  const pipeline = eventToPipeline(events)
  const status = statusBadge(instruction.status)
  const dueLabel = instruction.dueAt ? relativeTime(instruction.dueAt) : "—"

  // Premier événement pour récupérer "Acte n°" depuis le payload si présent.
  const sourceOrder =
    (instruction.payload as { actOrder?: string } | undefined)?.actOrder ?? "—"

  return (
    <>
      <PageHeader
        breadcrumbs={[
          <Link key="q" href="/demandes" style={{ color: "inherit" }}>
            File de demandes
          </Link>,
          instruction.ref,
        ]}
        title={
          instruction.service
            ? `${instruction.service.title}${citizen ? ` · ${citizen.name}` : ""}`
            : "Demande"
        }
        subtitle={`Déposée ${relativeTime(instruction.depositedAt)} · échéance ${dueLabel}`}
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
            <Badge tone={status.tone} dot>
              {status.label}
            </Badge>
            {instruction.assignedAgent && (
              <Badge tone="neutral" icon="user">
                {instruction.assignedAgent.name === session.agent.name
                  ? "Assignée à vous"
                  : `Assignée à ${instruction.assignedAgent.name}`}
              </Badge>
            )}
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
            <SignAndIssueButton
              requestRef={instruction.ref}
              disabled={instruction.status === "issued"}
            />
          </>
        }
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 360px",
          gap: 0,
          flex: 1,
          minHeight: 0,
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
              { id: "messages", label: "Messages" },
            ]}
            current="instr"
            variant="line"
          />

          {/* Source citoyen */}
          {citizen && (
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
                <Link
                  href={`/dossiers/${citizen.nip.replace(/\s/g, "")}`}
                  style={{ textDecoration: "none", display: "inline-flex" }}
                >
                  <Button variant="ghost" iconRight="externalLink" size="sm">
                    Voir son dossier 360°
                  </Button>
                </Link>
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
                    ["Type d'acte", instruction.service?.title ?? "—"],
                    [
                      "Référence",
                      <span
                        key="ref"
                        style={{ fontFamily: "var(--font-mono)" }}
                      >
                        {instruction.ref}
                      </span>,
                    ],
                    ["Date de naissance", citizen.birthDate],
                    ["Lieu de naissance", citizen.birthPlace],
                    ["Filiation déclarée", citizen.parents ?? "—"],
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
          )}

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
                    background: verificationStatusOk(v.status)
                      ? "var(--success-500)"
                      : "var(--ink-300)",
                    color: "white",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 2,
                  }}
                >
                  <Icon
                    name={verificationStatusOk(v.status) ? "check" : "clock"}
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

          {/* Historique des événements */}
          <Card>
            <SectionHeading
              title="Historique d&apos;instruction"
              subtitle={`${events.length} événement${events.length > 1 ? "s" : ""} enregistré${events.length > 1 ? "s" : ""}`}
              level={3}
            />
            <div
              style={{
                background: "var(--ink-50)",
                border: "1px dashed var(--ink-300)",
                borderRadius: 8,
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {events.length === 0 ? (
                <span style={{ fontSize: 13, color: "var(--ink-500)" }}>
                  Aucun événement pour le moment.
                </span>
              ) : (
                events.map((e, i) => (
                  <div
                    key={`${e.kind}-${i}`}
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--ink-500)",
                        minWidth: 110,
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {shortDateTime(e.occurredAt)}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{e.title}</div>
                      {e.description && (
                        <div style={{ fontSize: 12.5, color: "var(--ink-600)" }}>
                          {e.description}
                        </div>
                      )}
                      {e.actor && (
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--ink-500)",
                            marginTop: 2,
                          }}
                        >
                          par {e.actor}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
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
                <b>Référence :</b>{" "}
                <span style={{ fontFamily: "var(--font-mono)" }}>{instruction.ref}</span>
              </span>
              <span>
                <b>Déposée :</b> {longDate(instruction.depositedAt)}
              </span>
              {sourceOrder !== "—" && (
                <span>
                  <b>Numéro d&apos;ordre :</b> {sourceOrder}
                </span>
              )}
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
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
                {instruction.dueAt ? relativeTime(instruction.dueAt) : "—"}
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-600)", marginTop: 2 }}>
                {shortDateTime(instruction.depositedAt)}
                {instruction.dueAt
                  ? ` → ${shortDateTime(instruction.dueAt)}`
                  : ""}
              </div>
              <Progress
                value={instruction.progressPct}
                label={`${instruction.progressPct} %`}
                tone="primary"
              />
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
                {piecesValid}/{pieces.length}
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
                    {formatBytes(p.sizeBytes)}
                    {typeof p.ocrConfidence === "number"
                      ? ` · OCR ${p.ocrConfidence} %`
                      : ""}
                  </div>
                </div>
                <Icon name="eye" size={15} style={{ color: "var(--ink-500)" }} />
                <Icon name="download" size={15} style={{ color: "var(--ink-500)" }} />
              </div>
            ))}
            <div style={{ padding: 14 }}>
              <RequestPieceButton requestRef={instruction.ref} />
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
              <InternalNoteEditor
                requestRef={instruction.ref}
                defaultValue={internalNote}
              />
            </div>
          </Card>
        </aside>
      </div>
    </>
  )
}
