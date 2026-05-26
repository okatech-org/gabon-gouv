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
import { MessageCitizenButton } from "./message-citizen-button"
import { RequestPieceButton } from "./request-piece-button"
import { SignAndIssueButton } from "./sign-button"
import { TransferButton } from "./transfer-button"
import { PiecesPanel } from "./pieces-panel"
import { VerificationsPanel } from "./verifications-panel"
import { AssignmentPicker } from "./assignment-picker"
import { SignatureCircuitPanel } from "./signature-circuit-panel"
import { PrepareDocumentButton } from "./prepare-button"
import { RevokeButton } from "./revoke-button"

/* ============================================================
   Types — calqués sur api.admin.requests.getInstruction enrichi
   ============================================================ */

interface InstructionPiece {
  id: string
  requirementId?: string
  label: string
  filename?: string
  sizeBytes?: number
  mimeType?: string
  hasFile: boolean
  status: string
  ocrConfidence?: number
  detectedDocType?: string
  required: boolean
  rejectionReason?: string
  validatedAt?: number
}

interface InstructionVerification {
  id: string
  title: string
  description: string
  status: string
  kind?: string
  evidence?: string
  automated: boolean
}

interface InstructionEvent {
  kind: string
  title: string
  description?: string
  actor?: string
  occurredAt: number
}

interface InstructionCircuit {
  id: string
  status: string
  startedAt: number
  completedAt?: number
  steps: {
    id: string
    order: number
    assigneeRole: string
    assigneeAgent: { id: string; name: string } | null
    status: string
    decidedAt?: number
    comment?: string
  }[]
}

interface InstructionData {
  ref: string
  requestId: string
  status: string
  progressPct: number
  depositedAt: number
  dueAt?: number
  issuedAt?: number
  internalNote: string
  payload?: Record<string, unknown>
  urgent: boolean
  service?: {
    id: string
    title: string
    slug: string
    category?: string
    defaultCircuitStepsCount: number
  }
  variant?: { id: string; key: string; label: string } | null
  assignedAgent?: { id: string; name: string; role: string } | null
  citizen?: {
    id: string
    name: string
    nip: string
    email: string
    birthDate: string
    birthPlace: string
    parents: string | null
  } | null
  pieces: InstructionPiece[]
  verifications: InstructionVerification[]
  events: InstructionEvent[]
  document?: {
    id: string
    actNumber: string
    status?: string
    verificationCode?: string
    sha256Short: string
    issuedAt: number
    hasPdf: boolean
  } | null
  circuit?: InstructionCircuit | null
}

interface TeamMembersResponse {
  members: {
    id: string
    name: string
    role: string
    isMe: boolean
  }[]
  stats?: unknown
}

/* ============================================================
   Helpers
   ============================================================ */

type PipelineStatus = "done" | "active" | "pending" | "error"

function eventToPipeline(events: InstructionEvent[]): {
  title: string
  status: PipelineStatus
  duration?: string
}[] {
  const STAGES: { title: string; kinds: string[] }[] = [
    { title: "Réception & contrôle", kinds: ["submission", "seal"] },
    { title: "Pré-instruction agent", kinds: ["assignment"] },
    { title: "Vérifications", kinds: ["verification"] },
    { title: "Visa & signature", kinds: ["status_change", "signature"] },
    { title: "Émission & livraison", kinds: ["delivery"] },
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

const ROLES_FOR_ASSIGN: ReadonlyArray<string> = [
  "agent_instructeur",
  "agent_superviseur",
  "chef_service",
  "officier_signataire",
  "admin_organisme",
]

/* ============================================================
   Page
   ============================================================ */

export default async function AdminInstructionPage({
  params,
}: {
  params: Promise<{ ref: string }>
}) {
  const session = await getCurrentAgent()
  if (!session) redirect("/login")

  const { ref } = await params
  const [instruction, organisms, teamResponse] = await Promise.all([
    convex.query(api.admin.requests.getInstruction, {
      token: session.token,
      ref,
    }) as Promise<InstructionData | null>,
    convex.query(api.admin.directory.listForPicker, { token: session.token }),
    convex.query(api.admin.team.listTeamMembers, {
      token: session.token,
    }) as Promise<TeamMembersResponse>,
  ])
  const team = teamResponse.members

  if (!instruction) notFound()

  const {
    citizen,
    verifications,
    pieces,
    internalNote,
    events,
    circuit,
    document: doc,
  } = instruction
  const pipeline = eventToPipeline(events)
  const status = statusBadge(instruction.status)
  const dueLabel = instruction.dueAt ? relativeTime(instruction.dueAt) : "—"

  // Candidates pour assignation : tous sauf moi (moi est géré par "M'assigner")
  // et filtrés aux rôles capables de traiter une demande
  const assignmentCandidates = team
    .filter((m) => !m.isMe && ROLES_FOR_ASSIGN.includes(m.role))
    .map((m) => ({ id: m.id, name: m.name, role: m.role }))

  const chefCandidates = team
    .filter((m) => m.role === "chef_service" || m.role === "admin_organisme")
    .map((m) => ({ id: m.id, name: m.name, role: m.role }))
  const officierCandidates = team
    .filter((m) => m.role === "officier_signataire" || m.role === "admin_organisme")
    .map((m) => ({ id: m.id, name: m.name, role: m.role }))

  // Bouton "Préparer l'acte" : visible si demande dans état traitable
  // (pas encore prepared/to_sign/issued/rejected/cancelled)
  const canPrepare =
    instruction.status === "in_instruction" &&
    !circuit &&
    !doc

  // Bouton "Signer & émettre" raccourci : visible si service à 1 étape ou 0
  const canShortcutSign =
    instruction.service &&
    instruction.service.defaultCircuitStepsCount <= 1 &&
    !circuit &&
    instruction.status !== "issued" &&
    instruction.status !== "rejected" &&
    instruction.status !== "cancelled"

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
                aria-hidden="true"
              />
              {instruction.ref}
            </span>
            <Badge tone={status.tone} dot>
              {status.label}
            </Badge>
            {instruction.urgent && (
              <Badge tone="danger" size="sm" icon="alertTriangle">
                Urgent
              </Badge>
            )}
            {instruction.variant && (
              <Badge tone="neutral" size="sm">
                {instruction.variant.label}
              </Badge>
            )}
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
            <MessageCitizenButton
              requestRef={instruction.ref}
              citizenName={citizen?.name}
            />
            <TransferButton
              requestRef={instruction.ref}
              organisms={organisms}
            />
            {canPrepare && (
              <PrepareDocumentButton
                requestRef={instruction.ref}
                hasDefaultCircuit={
                  (instruction.service?.defaultCircuitStepsCount ?? 0) > 0
                }
                candidatesByRole={{
                  chef_service: chefCandidates,
                  officier_signataire: officierCandidates,
                }}
              />
            )}
            {canShortcutSign && (
              <SignAndIssueButton
                requestRef={instruction.ref}
                disabled={instruction.status === "issued"}
              />
            )}
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
                    <div style={{ fontSize: 15, fontWeight: 700 }}>
                      {citizen.name}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ink-600)" }}>
                      NIP{" "}
                      <span style={{ fontFamily: "var(--font-mono)" }}>
                        {citizen.nip}
                      </span>{" "}
                      · {citizen.email}
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

          {/* Vérifications */}
          <Card>
            <VerificationsPanel
              requestRef={instruction.ref}
              verifications={verifications}
            />
          </Card>

          {/* Circuit de signature (si présent) */}
          {circuit && (
            <Card>
              <SignatureCircuitPanel
                requestRef={instruction.ref}
                circuit={circuit}
                meAgentId={session.agent._id}
              />
            </Card>
          )}

          {/* Document émis (si présent) */}
          {doc && (doc.status === "issued" || instruction.status === "issued") && (
            <Card>
              <SectionHeading
                title="Acte émis"
                subtitle={`N° ${doc.actNumber}${doc.verificationCode ? ` · ${doc.verificationCode}` : ""}`}
                level={3}
              />
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  flexWrap: "wrap",
                  alignItems: "center",
                  fontSize: 13,
                }}
              >
                <span>
                  <strong>Empreinte :</strong>{" "}
                  <span style={{ fontFamily: "var(--font-mono)" }}>
                    {doc.sha256Short}…
                  </span>
                </span>
                <span>
                  <strong>Émis :</strong>{" "}
                  {longDate(doc.issuedAt)}
                </span>
                <Badge
                  tone={
                    doc.status === "revoked"
                      ? "danger"
                      : doc.hasPdf
                        ? "success"
                        : "warning"
                  }
                  size="sm"
                >
                  {doc.status === "revoked"
                    ? "Révoqué"
                    : doc.hasPdf
                      ? "PDF disponible"
                      : "PDF en cours de génération"}
                </Badge>
                {/* Bouton révoquer — admin_organisme uniquement, et seulement
                    si le doc n'est pas déjà révoqué. */}
                {doc.status !== "revoked" &&
                  session.agent.role === "admin_organisme" && (
                    <div style={{ marginLeft: "auto" }}>
                      <RevokeButton
                        requestRef={instruction.ref}
                        documentId={doc.id}
                        actNumber={doc.actNumber}
                      />
                    </div>
                  )}
              </div>
            </Card>
          )}

          {/* Historique */}
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
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        {e.title}
                      </div>
                      {e.description && (
                        <div
                          style={{ fontSize: 12.5, color: "var(--ink-600)" }}
                        >
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
            overflowY: "auto",
          }}
        >
          {/* Échéance + Progress */}
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
              <div
                style={{
                  fontSize: 12,
                  color: "var(--ink-600)",
                  marginTop: 2,
                }}
              >
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

          {/* Assignation */}
          <Card>
            <AssignmentPicker
              requestRef={instruction.ref}
              currentAgent={instruction.assignedAgent ?? null}
              meAgentId={session.agent._id}
              meName={session.agent.name}
              candidates={assignmentCandidates}
            />
          </Card>

          {/* Pipeline */}
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

          {/* Pièces (interactive Bloc 3) */}
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
                {
                  pieces.filter(
                    (p) =>
                      p.status === "uploaded" || p.status === "validated",
                  ).length
                }
                /{pieces.length}
              </Badge>
            </div>
            <PiecesPanel
              requestRef={instruction.ref}
              pieces={pieces}
            />
            <div style={{ padding: 14 }}>
              <RequestPieceButton requestRef={instruction.ref} />
            </div>
          </Card>

          {/* Note d'instruction */}
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
