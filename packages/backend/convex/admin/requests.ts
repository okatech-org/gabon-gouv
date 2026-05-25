import { v } from "convex/values"
import { query } from "../_generated/server"
import { requireAgent } from "../auth"
import type { Doc, Id } from "../_generated/dataModel"
import { getCircuitWithSteps } from "../lib/signatureCircuit"

/* ---------- File complète A2 ---------- */
export const listQueue = query({
  args: {
    token: v.string(),
    status: v.optional(v.string()),
    assigned: v.optional(v.string()), // "me" | "unassigned" | "all"
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { token, status, assigned, search, limit }) => {
    const agent = await requireAgent(ctx, token)

    let rows = await ctx.db
      .query("requests")
      .withIndex("by_organism_status", (q) => q.eq("organismId", agent.organismId))
      .collect()

    if (status && status !== "all") {
      rows = rows.filter((r) => r.status === status)
    }
    if (assigned === "me") rows = rows.filter((r) => r.assignedAgentId === agent._id)
    if (assigned === "unassigned") rows = rows.filter((r) => !r.assignedAgentId)

    if (search) {
      const s = search.toLowerCase()
      const enriched = await Promise.all(
        rows.map(async (r) => {
          const citizen = await ctx.db.get(r.citizenId)
          return { r, citizen }
        }),
      )
      rows = enriched
        .filter(({ r, citizen }) => {
          return (
            r.ref.toLowerCase().includes(s) ||
            (citizen?.name ?? "").toLowerCase().includes(s) ||
            (citizen?.nip ?? "").toLowerCase().includes(s)
          )
        })
        .map(({ r }) => r)
    }

    // Trier par date dépôt desc
    rows.sort((a, b) => b.depositedAt - a.depositedAt)

    const sliced = rows.slice(0, limit ?? 50)

    return Promise.all(
      sliced.map(async (r) => {
        const citizen = await ctx.db.get(r.citizenId)
        const service = await ctx.db.get(r.serviceId)
        const assignedAgent = r.assignedAgentId
          ? await ctx.db.get(r.assignedAgentId)
          : null
        const pieces = await ctx.db
          .query("pieces")
          .withIndex("by_request", (q) => q.eq("requestId", r._id))
          .collect()
        const valid = pieces.filter(
          (p) => p.status === "uploaded" || p.status === "validated",
        ).length

        return {
          ref: r.ref,
          title: service ? formatServiceTitle(service) : "Service",
          citizen: citizen?.name ?? "—",
          nip: citizen?.nip ?? "",
          depositedAt: r.depositedAt,
          dueAt: r.dueAt,
          agent: assignedAgent?.name ?? "Non assigné",
          status: r.status,
          piecesProgress: `${valid}/${pieces.length || 0}`,
        }
      }),
    )
  },
})

/* ---------- Détail instruction A3 ----------
 *
 * Renvoie le détail enrichi nécessaire à l'UI agent côté Bloc 3 :
 *   - request (statut, payload, note interne)
 *   - service + variante choisie
 *   - citoyen (PII filtrées : on n'expose pas tout)
 *   - pieces (avec id, storageKey, mimeType — pour le viewer)
 *   - verifications (avec id pour pouvoir cibler `setVerificationStatus`)
 *   - events (timeline)
 *   - document associé s'il existe (status, sha256 court, verificationCode)
 *   - circuit de signature actif s'il existe (steps avec assignees)
 */
export const getInstruction = query({
  args: { token: v.string(), ref: v.string() },
  handler: async (ctx, { token, ref }) => {
    await requireAgent(ctx, token)

    const request = await ctx.db
      .query("requests")
      .withIndex("by_ref", (q) => q.eq("ref", ref))
      .unique()
    if (!request) return null

    const [citizen, service, assignedAgent, pieces, verifications, events, doc] =
      await Promise.all([
        ctx.db.get(request.citizenId),
        ctx.db.get(request.serviceId),
        request.assignedAgentId ? ctx.db.get(request.assignedAgentId) : null,
        ctx.db
          .query("pieces")
          .withIndex("by_request", (q) => q.eq("requestId", request._id))
          .collect(),
        ctx.db
          .query("verifications")
          .withIndex("by_request", (q) => q.eq("requestId", request._id))
          .collect(),
        ctx.db
          .query("requestEvents")
          .withIndex("by_request_time", (q) => q.eq("requestId", request._id))
          .order("asc")
          .collect(),
        // Un document non-révoqué par demande (cf. upsertPreparedDocument)
        ctx.db
          .query("documents")
          .withIndex("by_request", (q) => q.eq("requestId", request._id))
          .filter((q) => q.neq(q.field("status"), "revoked"))
          .first(),
      ])

    // Variante choisie par le citoyen (si applicable)
    const variant = request.serviceVariantId
      ? await ctx.db.get(request.serviceVariantId)
      : null

    // Circuit de signature actif (lié au document, le cas échéant)
    let circuitView: ReturnType<typeof shapeCircuit> | null = null
    if (doc?.signatureCircuitId) {
      const { circuit, steps } = await getCircuitWithSteps(
        // getCircuitWithSteps prend un MutationCtx ; pour une query c'est
        // identique côté API (ctx.db.get/query) → cast technique.
        ctx as unknown as Parameters<typeof getCircuitWithSteps>[0],
        doc.signatureCircuitId,
      )
      const assigneeAgents = await Promise.all(
        steps.map((s) => ctx.db.get(s.assigneeAgentId)),
      )
      circuitView = shapeCircuit(circuit, steps, assigneeAgents)
    }

    return {
      ref: request.ref,
      requestId: request._id,
      status: request.status,
      progressPct: request.progressPct,
      depositedAt: request.depositedAt,
      dueAt: request.dueAt,
      issuedAt: request.issuedAt,
      internalNote: request.internalNote ?? "",
      payload: request.payload,
      urgent: request.urgent ?? false,
      service: service && {
        id: service._id,
        title: formatServiceTitle(service),
        slug: service.slug,
        category: service.category,
        // Permet à l'UI de savoir si signAndIssue (raccourci) est utilisable
        // ou s'il faut passer par prepareDocument + circuit.
        defaultCircuitStepsCount:
          service.defaultSignatureCircuitTemplate?.steps.length ?? 0,
      },
      variant: variant && {
        id: variant._id,
        key: variant.key,
        label: variant.label,
      },
      assignedAgent: assignedAgent && {
        id: assignedAgent._id,
        name: assignedAgent.name,
        role: assignedAgent.role,
      },
      citizen: citizen && {
        id: citizen._id,
        name: citizen.name,
        nip: citizen.nip,
        email: citizen.email,
        birthDate: citizen.birthDate,
        birthPlace: citizen.birthPlace,
        parents:
          citizen.fatherName && citizen.motherName
            ? `${citizen.fatherName} / ${citizen.motherName}`
            : null,
      },
      pieces: pieces.map((p) => ({
        id: p._id,
        requirementId: p.requirementId,
        label: p.label,
        filename: p.filename,
        sizeBytes: p.sizeBytes,
        mimeType: p.mimeType,
        // storageKey exposé pour `getPieceViewUrl` (l'UI demandera l'URL signée
        // séparément, on ne la met pas en clair ici pour préserver la
        // résolvabilité côté Convex).
        hasFile: Boolean(p.storageKey),
        status: p.status,
        ocrConfidence: p.ocrConfidence,
        detectedDocType: p.detectedDocType,
        required: p.required,
        rejectionReason: p.rejectionReason,
        validatedAt: p.validatedAt,
      })),
      verifications: verifications
        .sort((a, b) => a.order - b.order)
        .map((vv) => ({
          id: vv._id,
          title: vv.title,
          description: vv.description,
          status: vv.status,
          kind: vv.kind,
          evidence: vv.evidence,
          automated: vv.automated ?? false,
        })),
      events: events.map((e) => ({
        kind: e.kind,
        title: e.title,
        description: e.description,
        actor: e.actor,
        occurredAt: e.occurredAt,
      })),
      document: doc && {
        id: doc._id,
        actNumber: doc.actNumber,
        status: doc.status,
        verificationCode: doc.verificationCode,
        sha256Short: doc.sha256.slice(0, 12),
        issuedAt: doc.issuedAt,
        hasPdf: Boolean(doc.pdfStorageKey),
      },
      circuit: circuitView,
    }
  },
})

/* ---------- Forme normalisée d'un circuit pour la page demande ---------- */
function shapeCircuit(
  circuit: Doc<"signatureCircuits">,
  steps: Doc<"signatureCircuitSteps">[],
  assigneeAgents: (Doc<"agents"> | null)[],
) {
  return {
    id: circuit._id,
    status: circuit.status,
    startedAt: circuit.startedAt,
    completedAt: circuit.completedAt,
    steps: steps.map((s, i) => ({
      id: s._id,
      order: s.order,
      assigneeRole: s.assigneeRoleSnapshot,
      assigneeAgent: assigneeAgents[i]
        ? { id: assigneeAgents[i]!._id, name: assigneeAgents[i]!.name }
        : null,
      status: s.status,
      decidedAt: s.decidedAt,
      comment: s.comment,
    })),
  }
}

function formatServiceTitle(service: Doc<"services">) {
  return service.variant ? `${service.title} · ${service.variant}` : service.title
}

/* ---------- Liste des refs (utilitaire de debug) ---------- */
export const listRefs = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const agent = await requireAgent(ctx, token)
    const rows = await ctx.db
      .query("requests")
      .withIndex("by_organism_status", (q) => q.eq("organismId", agent.organismId))
      .collect()
    return rows.map((r) => r.ref)
  },
})

/* ---------- URL signée d'une pièce (viewer page demande) ----------
 *
 * Renvoie `null` si la pièce existe mais n'a pas de fichier stocké (cas
 * `missing` ou `rejected` sans re-upload). L'UI utilise cette query pour
 * alimenter un Dialog modal viewer (iframe PDF ou `<img>`).
 */
export const getPieceViewUrl = query({
  args: { token: v.string(), pieceId: v.id("pieces") },
  handler: async (ctx, { token, pieceId }) => {
    const me = await requireAgent(ctx, token)
    const piece = await ctx.db.get(pieceId)
    if (!piece) throw new Error("Pièce introuvable.")
    if (!piece.requestId) {
      throw new Error("Pièce non rattachée à une demande.")
    }
    const request = await ctx.db.get(piece.requestId)
    if (!request || request.organismId !== me.organismId) {
      throw new Error("Pièce hors de votre périmètre.")
    }
    if (!piece.storageKey) return null
    const url = await ctx.storage.getUrl(piece.storageKey)
    return {
      url,
      filename: piece.filename ?? "piece",
      mimeType: piece.mimeType ?? "application/octet-stream",
      sizeBytes: piece.sizeBytes,
    }
  },
})

/* ---------- URL signée du PDF d'un document émis ----------
 *
 * Pour l'agent qui consulte une demande émise (ou en cours d'émission).
 * Renvoie `null` si le PDF n'a pas encore été généré (cas v1 tant que
 * l'étape 9 du séquencage Bloc 3 n'est pas faite).
 */
export const getDocumentPdfUrl = query({
  args: { token: v.string(), documentId: v.id("documents") },
  handler: async (ctx, { token, documentId }) => {
    const me = await requireAgent(ctx, token)
    const doc = await ctx.db.get(documentId)
    if (!doc) throw new Error("Document introuvable.")
    if (doc.organismId !== me.organismId) {
      throw new Error("Document hors de votre périmètre.")
    }
    if (!doc.pdfStorageKey) return null
    const url = await ctx.storage.getUrl(doc.pdfStorageKey)
    return {
      url,
      actNumber: doc.actNumber,
      verificationCode: doc.verificationCode ?? null,
    }
  },
})

/* ---------- Type util ---------- */
export type RequestId = Id<"requests">
