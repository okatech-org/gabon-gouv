import { v } from "convex/values"
import { mutation, type MutationCtx } from "../_generated/server"
import { requireAgent } from "../auth"
import type { Id } from "../_generated/dataModel"

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
