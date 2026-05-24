import { v } from "convex/values"
import type { MutationCtx } from "../_generated/server"
import { mutation } from "../lib/triggers" // wrapper trigger-aware (ADR-0007)
import { requireAgent } from "../auth"
import type { Id } from "../_generated/dataModel"
import {
  actorFromAgent,
  assertCan,
  requireAgentRole,
} from "../lib/permissions"
import {
  approveStep,
  buildDocumentCircuit,
  createCircuit,
  refuseStep,
} from "../lib/signatureCircuit"
import { confidentialityLevelValidator } from "../lib/enums"

/* ---------- Assigner une demande à un agent ---------- */
export const assignRequest = mutation({
  args: {
    token: v.string(),
    ref: v.string(),
    agentId: v.optional(v.id("agents")), // null/undefined = m'assigner
  },
  handler: async (ctx, { token, ref, agentId }) => {
    const me = await requireAgent(ctx, token)
    const request = await getRequestByRef(ctx, ref)
    if (!request) throw new Error("Demande introuvable.")
    if (request.organismId !== me.organismId) {
      throw new Error("Demande hors de votre organisme.")
    }

    const targetAgentId: Id<"agents"> = agentId ?? me._id
    const targetAgent = await ctx.db.get(targetAgentId)
    if (!targetAgent || targetAgent.organismId !== me.organismId) {
      throw new Error("Agent cible invalide.")
    }

    await ctx.db.patch(request._id, { assignedAgentId: targetAgentId })
    await ctx.db.insert("requestEvents", {
      requestId: request._id,
      kind: "assignment",
      title: "Assignation",
      description: `${targetAgent.name} prend en charge le dossier.`,
      actor: me.name,
      occurredAt: Date.now(),
    })
  },
})

/* ---------- Demander une pièce au citoyen ---------- */
export const requestPiece = mutation({
  args: { token: v.string(), ref: v.string(), label: v.string() },
  handler: async (ctx, { token, ref, label }) => {
    const me = await requireAgent(ctx, token)
    const request = await getRequestByRef(ctx, ref)
    if (!request) throw new Error("Demande introuvable.")

    await ctx.db.insert("pieces", {
      requestId: request._id,
      label,
      status: "missing",
      required: true,
    })

    await ctx.db.patch(request._id, { status: "waiting_pieces" })
    await ctx.db.insert("requestEvents", {
      requestId: request._id,
      kind: "piece_request",
      title: "Pièce demandée",
      description: `Demande de pièce : ${label}.`,
      actor: me.name,
      occurredAt: Date.now(),
    })
  },
})

/* ---------- Transférer un dossier à un autre organisme ---------- */
export const transferRequest = mutation({
  args: { token: v.string(), ref: v.string(), toOrgId: v.id("organisms") },
  handler: async (ctx, { token, ref, toOrgId }) => {
    const me = await requireAgent(ctx, token)
    const request = await getRequestByRef(ctx, ref)
    if (!request) throw new Error("Demande introuvable.")
    const toOrg = await ctx.db.get(toOrgId)
    if (!toOrg) throw new Error("Organisme cible introuvable.")

    await ctx.db.patch(request._id, {
      organismId: toOrgId,
      assignedAgentId: undefined,
    })
    await ctx.db.insert("requestEvents", {
      requestId: request._id,
      kind: "transfer",
      title: "Transfert",
      description: `Dossier transféré à ${toOrg.shortName ?? toOrg.name}.`,
      actor: me.name,
      occurredAt: Date.now(),
    })
  },
})

/* ---------- Mettre à jour la note d'instruction ---------- */
export const updateInternalNote = mutation({
  args: { token: v.string(), ref: v.string(), note: v.string() },
  handler: async (ctx, { token, ref, note }) => {
    await requireAgent(ctx, token)
    const request = await getRequestByRef(ctx, ref)
    if (!request) throw new Error("Demande introuvable.")
    await ctx.db.patch(request._id, { internalNote: note })
  },
})

/* ---------- Signer et émettre un acte ---------- */
export const signAndIssue = mutation({
  args: { token: v.string(), ref: v.string() },
  handler: async (ctx, { token, ref }) => {
    const me = await requireAgent(ctx, token)
    if (me.role !== "officier_signataire" && me.role !== "admin_organisme") {
      throw new Error(
        "Seul un officier signataire ou un admin d'organisme peut émettre un acte.",
      )
    }
    const request = await getRequestByRef(ctx, ref)
    if (!request) throw new Error("Demande introuvable.")
    if (request.status === "issued") {
      throw new Error("Demande déjà émise.")
    }

    const citizen = await ctx.db.get(request.citizenId)
    if (!citizen) throw new Error("Citoyen introuvable.")
    const service = await ctx.db.get(request.serviceId)
    if (!service) throw new Error("Service introuvable.")

    const now = Date.now()
    const year = new Date(now).getFullYear()
    const seq = String(Math.floor(Math.random() * 100000)).padStart(5, "0")
    const actNumber = `${prefix(service.category)}-LBV-${year}-${seq}`
    const sha256 = `${randHex()}${randHex()}${randHex()}${randHex()}`
    const qrCode = `GC-${prefix(service.category)}-${seq}`

    const documentId = await ctx.db.insert("documents", {
      actNumber,
      requestId: request._id,
      citizenId: request.citizenId,
      issuedByAgentId: me._id,
      organismId: me.organismId,
      title: service.variant ? `${service.title} · ${service.variant}` : service.title,
      issuedAt: now,
      sha256,
      qualifiedTimestamp: new Date(now).toISOString(),
      qrCode,
      payload: {
        name: citizen.name,
        nip: citizen.nip,
        birthDate: citizen.birthDate,
        birthPlace: citizen.birthPlace,
        fatherName: citizen.fatherName,
        motherName: citizen.motherName,
      },
    })

    await ctx.db.patch(request._id, {
      status: "issued",
      progressPct: 100,
      issuedAt: now,
    })

    await ctx.db.insert("requestEvents", {
      requestId: request._id,
      kind: "signature",
      title: "Acte signé et émis",
      description: `${actNumber} — empreinte ${sha256.slice(0, 8)}…`,
      actor: me.name,
      occurredAt: now,
    })

    // Versement automatique au SAE
    await ctx.db.insert("archives", {
      cote: `GA/${prefix(service.category)}/${year}/${seq}`,
      description: `${service.title}${service.variant ? ` · ${service.variant}` : ""} · ${citizen.name}`,
      producerOrganismId: me.organismId,
      versedAt: now,
      dua: "Indéf.",
      status: "active",
      finalSort: "Conservation définitive",
      sha256,
      linkedDocumentId: documentId,
      linkedRequestId: request._id,
    })

    return { actNumber, sha256, documentId }
  },
})

/* ---------- Marquer un courrier comme lu ---------- */
export const markCorrespondenceRead = mutation({
  args: { token: v.string(), ref: v.string() },
  handler: async (ctx, { token, ref }) => {
    const me = await requireAgent(ctx, token)
    const c = await ctx.db
      .query("correspondences")
      .withIndex("by_ref", (q) => q.eq("ref", ref))
      .unique()
    if (!c) throw new Error("Correspondance introuvable.")

    const existing = await ctx.db
      .query("correspondenceReads")
      .withIndex("by_correspondence_agent", (q) =>
        q.eq("correspondenceId", c._id).eq("agentId", me._id),
      )
      .unique()
    if (existing) return
    await ctx.db.insert("correspondenceReads", {
      correspondenceId: c._id,
      agentId: me._id,
      readAt: Date.now(),
    })
  },
})

/* ---------- Répondre à un courrier ---------- */
export const replyCorrespondence = mutation({
  args: { token: v.string(), ref: v.string(), body: v.string(), signed: v.boolean() },
  handler: async (ctx, { token, ref, body, signed }) => {
    const me = await requireAgent(ctx, token)
    const c = await ctx.db
      .query("correspondences")
      .withIndex("by_ref", (q) => q.eq("ref", ref))
      .unique()
    if (!c) throw new Error("Correspondance introuvable.")
    await ctx.db.insert("correspondenceMessages", {
      correspondenceId: c._id,
      fromAgentId: me._id,
      body,
      signed,
      sentAt: Date.now(),
    })
  },
})

/* ---------- Valider une pièce ---------- */
export const validatePiece = mutation({
  args: { token: v.string(), pieceId: v.id("pieces") },
  handler: async (ctx, { token, pieceId }) => {
    const me = await requireAgent(ctx, token)
    assertCan(actorFromAgent(me), "piece.validate")

    const piece = await ctx.db.get(pieceId)
    if (!piece) throw new Error("Pièce introuvable.")
    if (!piece.requestId) {
      throw new Error("Pièce non rattachée à une demande.")
    }
    const requestId = piece.requestId
    const request = await ctx.db.get(requestId)
    if (!request || request.organismId !== me.organismId) {
      throw new Error("Pièce hors de votre périmètre.")
    }

    const now = Date.now()
    await ctx.db.patch(piece._id, {
      status: "validated",
      validatedAt: now,
      validatedByAgentId: me._id,
    })
    await ctx.db.insert("requestEvents", {
      requestId,
      kind: "piece_received",
      title: "Pièce validée",
      description: `${piece.label} validée par l'agent.`,
      actor: me.name,
      actorAgentId: me._id,
      occurredAt: now,
    })

    // Si la demande était bloquée sur les pièces et que tout est validé → in_instruction
    if (request.status === "waiting_pieces") {
      const remaining = await ctx.db
        .query("pieces")
        .withIndex("by_request_status", (q) =>
          q.eq("requestId", requestId).eq("status", "missing"),
        )
        .first()
      if (!remaining) {
        await ctx.db.patch(request._id, { status: "in_instruction" })
      }
    }
  },
})

/* ---------- Rejeter une pièce ---------- */
export const rejectPiece = mutation({
  args: {
    token: v.string(),
    pieceId: v.id("pieces"),
    reason: v.string(),
  },
  handler: async (ctx, { token, pieceId, reason }) => {
    const me = await requireAgent(ctx, token)
    assertCan(actorFromAgent(me), "piece.reject")
    if (!reason.trim()) throw new Error("Un motif est requis pour rejeter.")

    const piece = await ctx.db.get(pieceId)
    if (!piece) throw new Error("Pièce introuvable.")
    if (!piece.requestId) {
      throw new Error("Pièce non rattachée à une demande.")
    }
    const requestId = piece.requestId
    const request = await ctx.db.get(requestId)
    if (!request || request.organismId !== me.organismId) {
      throw new Error("Pièce hors de votre périmètre.")
    }

    await ctx.db.patch(piece._id, {
      status: "rejected",
      rejectionReason: reason,
    })
    await ctx.db.patch(request._id, { status: "waiting_pieces" })
    await ctx.db.insert("requestEvents", {
      requestId,
      kind: "piece_rejected",
      title: "Pièce rejetée",
      description: `${piece.label} : ${reason}`,
      actor: me.name,
      actorAgentId: me._id,
      occurredAt: Date.now(),
    })
  },
})

/* ---------- Rejeter une demande ---------- */
export const rejectRequest = mutation({
  args: { token: v.string(), ref: v.string(), reason: v.string() },
  handler: async (ctx, { token, ref, reason }) => {
    const me = await requireAgent(ctx, token)
    assertCan(actorFromAgent(me), "request.reject")
    if (!reason.trim()) throw new Error("Un motif de rejet est requis.")

    const request = await getRequestByRef(ctx, ref)
    if (!request) throw new Error("Demande introuvable.")
    if (request.organismId !== me.organismId) {
      throw new Error("Demande hors de votre organisme.")
    }
    if (request.status === "issued") {
      throw new Error("Acte déjà émis, utilisez la révocation.")
    }

    const now = Date.now()
    await ctx.db.patch(request._id, {
      status: "rejected",
      rejectedAt: now,
      rejectionReason: reason,
      progressPct: 0,
    })
    await ctx.db.insert("requestEvents", {
      requestId: request._id,
      kind: "status_change",
      title: "Demande rejetée",
      description: reason,
      actor: me.name,
      actorAgentId: me._id,
      occurredAt: now,
    })
  },
})

/* ---------- Envoyer un courrier inter-admin ---------- */
export const sendCorrespondence = mutation({
  args: {
    token: v.string(),
    toOrgId: v.id("organisms"),
    subject: v.string(),
    body: v.string(),
    urgent: v.boolean(),
    confidentiality: confidentialityLevelValidator,
    archivePolicy: v.string(),
    linkedRequestRef: v.optional(v.string()),
    linkedCitizenId: v.optional(v.id("citizens")),
    signed: v.boolean(),
  },
  handler: async (
    ctx,
    {
      token,
      toOrgId,
      subject,
      body,
      urgent,
      confidentiality,
      archivePolicy,
      linkedRequestRef,
      linkedCitizenId,
      signed,
    },
  ) => {
    const me = await requireAgent(ctx, token)
    assertCan(actorFromAgent(me), "correspondence.send")

    const toOrg = await ctx.db.get(toOrgId)
    if (!toOrg) throw new Error("Organisme destinataire introuvable.")

    const linkedRequest = linkedRequestRef
      ? await getRequestByRef(ctx, linkedRequestRef)
      : null

    const now = Date.now()
    const year = new Date(now).getFullYear()
    const seq = String(Math.floor(Math.random() * 10000)).padStart(4, "0")
    const ref = `CR-${year}-${seq}`

    const correspondenceId = await ctx.db.insert("correspondences", {
      ref,
      fromOrganismId: me.organismId,
      toOrganismId: toOrgId,
      subject,
      body,
      urgent,
      confidentiality,
      archivePolicy,
      status: "sent",
      sentAt: now,
      linkedRequestId: linkedRequest?._id,
      linkedCitizenId: linkedCitizenId ?? linkedRequest?.citizenId,
    })

    await ctx.db.insert("correspondenceMessages", {
      correspondenceId,
      fromAgentId: me._id,
      body,
      signed,
      sentAt: now,
    })

    return { ref, correspondenceId }
  },
})

/* ---------- Préparer un acte (sans signer) + ouvrir circuit ---------- */
export const prepareDocument = mutation({
  args: {
    token: v.string(),
    ref: v.string(),
    chefServiceId: v.id("agents"),
    officierId: v.id("agents"),
  },
  handler: async (ctx, { token, ref, chefServiceId, officierId }) => {
    const me = await requireAgent(ctx, token)
    assertCan(actorFromAgent(me), "document.prepare")

    const request = await getRequestByRef(ctx, ref)
    if (!request) throw new Error("Demande introuvable.")
    if (request.organismId !== me.organismId) {
      throw new Error("Demande hors de votre organisme.")
    }

    const citizen = await ctx.db.get(request.citizenId)
    const service = await ctx.db.get(request.serviceId)
    if (!citizen || !service) throw new Error("Données manquantes.")

    const now = Date.now()
    const year = new Date(now).getFullYear()
    const seq = String(Math.floor(Math.random() * 100000)).padStart(5, "0")
    const actNumber = `${prefix(service.category)}-LBV-${year}-${seq}`

    const documentId = await ctx.db.insert("documents", {
      actNumber,
      requestId: request._id,
      citizenId: request.citizenId,
      issuedByAgentId: me._id,
      issuedByAgentNameSnapshot: me.name,
      organismId: me.organismId,
      title: service.variant
        ? `${service.title} · ${service.variant}`
        : service.title,
      status: "prepared",
      issuedAt: now,
      sha256: `${randHex()}${randHex()}${randHex()}${randHex()}`,
      qualifiedTimestamp: new Date(now).toISOString(),
      qrCode: `GC-${prefix(service.category)}-${seq}`,
      verificationCode: `GC-${prefix(service.category)}-${seq}`,
      payload: {
        name: citizen.name,
        nip: citizen.nip,
        birthDate: citizen.birthDate,
        birthPlace: citizen.birthPlace,
        fatherName: citizen.fatherName,
        motherName: citizen.motherName,
      },
    })

    const circuitId = await createCircuit(ctx, {
      subjectKind: "document",
      subjectId: documentId,
      steps: buildDocumentCircuit({
        instructeurId: me._id,
        chefServiceId,
        officierId,
      }),
    })
    // L'étape 0 (instructeur) est déjà active à la création. Le caller doit
    // immédiatement la valider pour passer au chef.
    await ctx.db.patch(documentId, { signatureCircuitId: circuitId })

    await ctx.db.patch(request._id, { status: "to_sign", progressPct: 75 })

    await ctx.db.insert("requestEvents", {
      requestId: request._id,
      kind: "status_change",
      title: "Acte préparé, circuit ouvert",
      description: `${actNumber} en attente de visa.`,
      actor: me.name,
      actorAgentId: me._id,
      occurredAt: now,
    })

    return { documentId, circuitId, actNumber }
  },
})

/* ---------- Approuver l'étape active d'un circuit ---------- */
export const approveSignatureStep = mutation({
  args: {
    token: v.string(),
    circuitId: v.id("signatureCircuits"),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, { token, circuitId, comment }) => {
    const me = await requireAgent(ctx, token)
    return approveStep(ctx, { circuitId, agentId: me._id, comment })
  },
})

/* ---------- Refuser l'étape active d'un circuit ---------- */
export const refuseSignatureStep = mutation({
  args: {
    token: v.string(),
    circuitId: v.id("signatureCircuits"),
    comment: v.string(),
  },
  handler: async (ctx, { token, circuitId, comment }) => {
    const me = await requireAgent(ctx, token)
    await refuseStep(ctx, { circuitId, agentId: me._id, comment })
  },
})

/* ---------- Verser au SAE (manuel — automatique sinon via signAndIssue) ---------- */
export const verseToSAE = mutation({
  args: { token: v.string(), documentId: v.id("documents") },
  handler: async (ctx, { token, documentId }) => {
    const me = await requireAgent(ctx, token)
    requireAgentRole(
      actorFromAgent(me),
      "officier_signataire",
      "admin_organisme",
    )

    const doc = await ctx.db.get(documentId)
    if (!doc) throw new Error("Document introuvable.")
    if (doc.organismId !== me.organismId) {
      throw new Error("Document hors de votre organisme.")
    }

    // Idempotent : si déjà versé, on retourne la cote existante.
    const existing = await ctx.db
      .query("archives")
      .withIndex("by_organism_status", (q) =>
        q.eq("producerOrganismId", me.organismId).eq("status", "active"),
      )
      .filter((q) => q.eq(q.field("linkedDocumentId"), documentId))
      .first()
    if (existing) return { cote: existing.cote, archiveId: existing._id, already: true }

    const now = Date.now()
    const year = new Date(now).getFullYear()
    const seq = doc.actNumber.split("-").pop() ?? "00000"
    const cote = `GA/${doc.actNumber.split("-")[0]}/${year}/${seq}`

    const archiveId = await ctx.db.insert("archives", {
      cote,
      description: `${doc.title} · ${doc.payload?.name ?? doc.actNumber}`,
      producerOrganismId: me.organismId,
      versedAt: now,
      dua: "Indéf.",
      status: "active",
      finalSort: "Conservation définitive",
      finalDisposition: "conservation_definitive",
      sha256: doc.sha256,
      qualifiedTimestamp: doc.qualifiedTimestamp,
      linkedDocumentId: doc._id,
      linkedRequestId: doc.requestId,
    })

    return { cote, archiveId, already: false }
  },
})

/* ---------- Écrire au citoyen sur une demande (C5 ↔ A3 thread) ---------- */
export const sendMessageToCitizen = mutation({
  args: { token: v.string(), ref: v.string(), body: v.string() },
  handler: async (ctx, { token, ref, body }) => {
    const me = await requireAgent(ctx, token)
    const trimmed = body.trim()
    if (!trimmed) throw new Error("Le message ne peut pas être vide.")

    const request = await getRequestByRef(ctx, ref)
    if (!request) throw new Error("Demande introuvable.")
    if (request.organismId !== me.organismId) {
      throw new Error("Demande hors de votre organisme.")
    }

    const now = Date.now()
    await ctx.db.insert("requestMessages", {
      requestId: request._id,
      fromKind: "agent",
      fromAgentId: me._id,
      body: trimmed,
      sentAt: now,
    })
    await ctx.db.insert("requestEvents", {
      requestId: request._id,
      kind: "message",
      title: "Message envoyé au citoyen",
      description: trimmed.length > 80 ? trimmed.slice(0, 77) + "…" : trimmed,
      actor: me.name,
      actorAgentId: me._id,
      occurredAt: now,
    })
  },
})

/* ---------- Helpers ---------- */
async function getRequestByRef(ctx: MutationCtx, ref: string) {
  return ctx.db
    .query("requests")
    .withIndex("by_ref", (q) => q.eq("ref", ref))
    .unique()
}

function prefix(category: string) {
  const c = category.toLowerCase()
  if (c.startsWith("état civil") || c.startsWith("etat civil")) return "EC"
  if (c.startsWith("justice")) return "JU"
  if (c.startsWith("identité") || c.startsWith("identite")) return "DI"
  return "GN"
}

function randHex(len = 16) {
  return Math.floor(Math.random() * 0xffffffffffffff)
    .toString(16)
    .padStart(len, "0")
    .slice(0, len)
}
