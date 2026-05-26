/**
 * Mutations + queries Bloc 5 côté citoyen.
 *
 * Couvre :
 *   - citizenListInbox : courriers reçus + envoyés
 *   - citizenGetThread : thread complet (read-only sauf reply/ack)
 *   - citizenCreateCorrespondence : nouveau courrier citoyen→org
 *   - citizenReply : réponse dans un thread existant
 *   - citizenAcknowledge : AR formel
 *   - citizenListOrganisms : picker pour le wizard
 *
 * Permissions : actor.kind="citizen", contrôles d'ownership stricts.
 */

import { v } from "convex/values"
import type { Doc, Id } from "../_generated/dataModel"
import type { MutationCtx, QueryCtx } from "../_generated/server"
import { query } from "../_generated/server"
import { mutation } from "../lib/triggers"
import { requireCitizen } from "./auth"
import { assertCan } from "../lib/permissions"
import {
  correspondenceKindValidator,
  type CorrespondenceKind,
} from "../lib/enums"
import {
  generateCorrespondenceRef,
  loadKindRule,
  newThreadId,
  performCorrespondenceSend,
} from "../lib/correspondenceLifecycle"
import { signMessage } from "../lib/smime"

/** Kinds que les citoyens sont autorisés à créer (filtre v1). */
const CITIZEN_ALLOWED_KINDS: readonly CorrespondenceKind[] = [
  "instruction_request",
  "cooperation_info_share",
  "cooperation_data_request",
  "other",
]

/* ============================================================
   Queries
   ============================================================ */

export const citizenListInbox = query({
  args: { idnSub: v.string() },
  handler: async (ctx, { idnSub }) => {
    const { citizen } = await requireCitizen(ctx, idnSub)
    // Reçus : corres dont je suis recipient citizen
    const recipientRows = await ctx.db
      .query("correspondenceRecipients")
      .withIndex("by_citizen", (q) => q.eq("recipientCitizenId", citizen._id))
      .collect()
    const inboxIds = new Set(recipientRows.map((r) => r.correspondenceId))

    // Envoyés : corres dont je suis créateur citoyen
    const sentRows = await ctx.db
      .query("correspondences")
      .withIndex("by_from_citizen", (q) => q.eq("fromCitizenId", citizen._id))
      .collect()

    const inboxCorres: Doc<"correspondences">[] = []
    for (const id of inboxIds) {
      const c = await ctx.db.get(id)
      if (c) inboxCorres.push(c)
    }
    inboxCorres.sort((a, b) => (b.sentAt ?? 0) - (a.sentAt ?? 0))
    sentRows.sort((a, b) => (b.sentAt ?? 0) - (a.sentAt ?? 0))

    return {
      inbox: await Promise.all(
        inboxCorres.map((c) => shapeCorrespondenceListItem(ctx, c, "inbox")),
      ),
      sent: await Promise.all(
        sentRows.map((c) => shapeCorrespondenceListItem(ctx, c, "sent")),
      ),
    }
  },
})

export const citizenGetThread = query({
  args: { idnSub: v.string(), ref: v.string() },
  handler: async (ctx, { idnSub, ref }) => {
    const { citizen } = await requireCitizen(ctx, idnSub)
    const corres = await ctx.db
      .query("correspondences")
      .withIndex("by_ref", (q) => q.eq("ref", ref))
      .unique()
    if (!corres) return null

    const isAuthorized =
      corres.fromCitizenId === citizen._id ||
      Boolean(await findCitizenRecipient(ctx, corres._id, citizen._id))
    if (!isAuthorized) {
      throw new Error("Ce courrier ne vous est pas adressé.")
    }
    return shapeFullThread(ctx, corres)
  },
})

export const citizenListOrganisms = query({
  args: { idnSub: v.string() },
  handler: async (ctx, { idnSub }) => {
    await requireCitizen(ctx, idnSub)
    const orgs = await ctx.db.query("organisms").collect()
    return orgs
      .filter((o) => o.status === "active")
      .map((o) => ({
        id: o._id,
        name: o.name,
        shortName: o.shortName ?? o.name,
        category: o.category,
      }))
      .sort((a, b) => a.shortName.localeCompare(b.shortName, "fr"))
  },
})

export const citizenGetInboxCounts = query({
  args: { idnSub: v.string() },
  handler: async (ctx, { idnSub }) => {
    const { citizen } = await requireCitizen(ctx, idnSub)
    const recipientRows = await ctx.db
      .query("correspondenceRecipients")
      .withIndex("by_citizen", (q) => q.eq("recipientCitizenId", citizen._id))
      .collect()

    let unread = 0
    let withoutAck = 0
    for (const r of recipientRows) {
      const ack = await ctx.db
        .query("correspondenceAcks")
        .withIndex("by_recipient", (q) => q.eq("recipientId", r._id))
        .first()
      if (!ack && r.role === "to") withoutAck++
      if (!r.firstReadAt) unread++
    }
    return { unread, withoutAck }
  },
})

/* ============================================================
   Mutations citoyennes
   ============================================================ */

export const citizenCreateCorrespondence = mutation({
  args: {
    idnSub: v.string(),
    toOrganismId: v.id("organisms"),
    kind: correspondenceKindValidator,
    subject: v.string(),
    body: v.string(),
    linkedRequestIds: v.optional(v.array(v.id("requests"))),
  },
  handler: async (ctx, args) => {
    const { citizen, actor } = await requireCitizen(ctx, args.idnSub)
    assertCan(actor, "correspondence.citizen.send")

    if (!CITIZEN_ALLOWED_KINDS.includes(args.kind)) {
      throw new Error(
        `Type de correspondance non autorisé pour un citoyen. Kinds permis : ${CITIZEN_ALLOWED_KINDS.join(", ")}`,
      )
    }
    if (!args.subject.trim()) throw new Error("Le sujet est obligatoire.")
    if (!args.body.trim()) throw new Error("Le corps est obligatoire.")

    const targetOrg = await ctx.db.get(args.toOrganismId)
    if (!targetOrg) throw new Error("Organisme destinataire introuvable.")
    if (targetOrg.status !== "active") {
      throw new Error("Cet organisme n'est pas disponible.")
    }

    const rule = await loadKindRule(ctx, args.kind)
    const ref = await generateCorrespondenceRef(ctx)
    const threadId = newThreadId()

    const correspondenceId = await ctx.db.insert("correspondences", {
      ref,
      senderKind: "citizen",
      senderId: String(citizen._id),
      fromCitizenId: citizen._id,
      kind: args.kind,
      subject: args.subject.trim(),
      body: args.body,
      bodyFormat: "plain",
      urgent: false,
      confidentiality: rule.defaultConfidentiality,
      duaCode: rule.duaCode,
      status: "draft", // sera passé à sent juste après
      threadId,
      linkedRequestIds: args.linkedRequestIds,
      createdByCitizenId: citizen._id,
      participantsCount: 1,
      messagesCount: 0,
      attachmentsCount: 0,
    })

    await ctx.db.insert("correspondenceRecipients", {
      correspondenceId,
      role: "to",
      recipientKind: "organism",
      recipientId: String(args.toOrganismId),
      recipientOrganismId: args.toOrganismId,
      recipientNameSnapshot: targetOrg.shortName ?? targetOrg.name,
    })

    // Send immédiat (pas de circuit pour citoyen v1)
    const corres = await ctx.db.get(correspondenceId)
    if (!corres) throw new Error("Bug : corres introuvable juste après insert.")
    await performCitizenSend(ctx, corres, citizen)
    return { ref, correspondenceId }
  },
})

export const citizenReply = mutation({
  args: {
    idnSub: v.string(),
    correspondenceId: v.id("correspondences"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const { citizen, actor } = await requireCitizen(ctx, args.idnSub)
    assertCan(actor, "correspondence.citizen.reply")
    if (!args.body.trim()) throw new Error("Le corps est vide.")

    const corres = await ctx.db.get(args.correspondenceId)
    if (!corres) throw new Error("Correspondance introuvable.")
    const isRecipient = await findCitizenRecipient(
      ctx,
      args.correspondenceId,
      citizen._id,
    )
    const isSender = corres.fromCitizenId === citizen._id
    if (!isRecipient && !isSender) {
      throw new Error("Vous n'êtes pas habilité à répondre.")
    }

    const now = Date.now()
    // Pas de S/MIME pour citoyens v1 (signature implicite via session IDN)
    await ctx.db.insert("correspondenceMessages", {
      correspondenceId: args.correspondenceId,
      fromKind: "citizen",
      fromCitizenId: citizen._id,
      body: args.body,
      bodyFormat: "plain",
      signed: false,
      sentAt: now,
    })

    await ctx.db.patch(args.correspondenceId, {
      status: "replied",
      messagesCount: (corres.messagesCount ?? 0) + 1,
    })

    // Notif aux agents de l'org expéditrice
    if (corres.fromOrganismId) {
      const agents = await ctx.db
        .query("agents")
        .withIndex("by_organism", (q) =>
          q.eq("organismId", corres.fromOrganismId!),
        )
        .collect()
      for (const agent of agents) {
        if (
          agent.role === "admin_technique" ||
          agent.role === "platform_admin"
        )
          continue
        await ctx.db.insert("notifications", {
          recipientKind: "agent",
          recipientId: String(agent._id),
          kind: "correspondence_replied",
          severity: "info",
          title: "Réponse citoyenne reçue",
          body: `${corres.ref} — ${citizen.name} a répondu.`,
          linkTo: `/correspondance/${corres.ref}`,
          createdAt: now,
        })
      }
    }
  },
})

export const citizenAcknowledge = mutation({
  args: {
    idnSub: v.string(),
    correspondenceId: v.id("correspondences"),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { citizen, actor } = await requireCitizen(ctx, args.idnSub)
    assertCan(actor, "correspondence.citizen.acknowledge")
    const corres = await ctx.db.get(args.correspondenceId)
    if (!corres) throw new Error("Correspondance introuvable.")
    const recipient = await findCitizenRecipient(
      ctx,
      args.correspondenceId,
      citizen._id,
    )
    if (!recipient) throw new Error("Ce courrier ne vous est pas adressé.")

    const existing = await ctx.db
      .query("correspondenceAcks")
      .withIndex("by_recipient", (q) => q.eq("recipientId", recipient._id))
      .first()
    if (existing) return { already: true as const }

    const now = Date.now()
    await ctx.db.insert("correspondenceAcks", {
      correspondenceId: args.correspondenceId,
      recipientId: recipient._id,
      ackedByCitizenId: citizen._id,
      ackedAt: now,
      note: args.note?.trim() || undefined,
    })
    if (recipient.role === "to" && corres.status === "sent") {
      await ctx.db.patch(args.correspondenceId, { status: "acknowledged" })
    }
    return { already: false as const }
  },
})

/* ============================================================
   Helpers
   ============================================================ */

async function performCitizenSend(
  ctx: MutationCtx,
  corres: Doc<"correspondences">,
  citizen: Doc<"citizens">,
): Promise<void> {
  // Implémentation parallèle de performCorrespondenceSend, adaptée au cas
  // citizen-sender (pas de signature S/MIME stub avec agentId — on signe
  // avec l'idnSub si dispo).
  if (!corres.kind) throw new Error("Kind manquant.")
  const now = Date.now()
  const rule = await loadKindRule(ctx, corres.kind)

  // Signature citoyenne : on utilise l'idnSub comme identifiant
  // (pour l'instant pas vraie signature — IDN gère ça plus tard).
  // Pour homogénéité, on garde le marker `signed: false` côté citizen v1.
  void signMessage // import gardé pour usage futur quand IDN sera là
  await ctx.db.insert("correspondenceMessages", {
    correspondenceId: corres._id,
    fromKind: "citizen",
    fromCitizenId: citizen._id,
    body: corres.body,
    bodyFormat: corres.bodyFormat ?? "plain",
    signed: false,
    sentAt: now,
  })

  await ctx.db.patch(corres._id, {
    status: "sent",
    sentAt: now,
    dueAckAt: rule.ackDeadlineDays
      ? now + rule.ackDeadlineDays * 24 * 60 * 60 * 1000
      : undefined,
    dueReplyAt: rule.replyDeadlineDays
      ? now + rule.replyDeadlineDays * 24 * 60 * 60 * 1000
      : undefined,
    messagesCount: 1,
  })

  // Notif aux agents de l'org destinataire
  const recipients = await ctx.db
    .query("correspondenceRecipients")
    .withIndex("by_correspondence", (q) => q.eq("correspondenceId", corres._id))
    .collect()
  for (const r of recipients) {
    if (!r.recipientOrganismId) continue
    const agents = await ctx.db
      .query("agents")
      .withIndex("by_organism", (q) =>
        q.eq("organismId", r.recipientOrganismId!),
      )
      .collect()
    for (const agent of agents) {
      if (
        agent.role === "admin_technique" ||
        agent.role === "platform_admin"
      )
        continue
      await ctx.db.insert("notifications", {
        recipientKind: "agent",
        recipientId: String(agent._id),
        kind: "correspondence_received",
        severity: "info",
        title: `Courrier d'un citoyen : ${corres.subject}`,
        body: `${corres.ref} — ${citizen.name}`,
        linkTo: `/correspondance/${corres.ref}`,
        createdAt: now,
      })
    }
  }
}

async function findCitizenRecipient(
  ctx: QueryCtx | MutationCtx,
  correspondenceId: Id<"correspondences">,
  citizenId: Id<"citizens">,
): Promise<Doc<"correspondenceRecipients"> | null> {
  const rows = await ctx.db
    .query("correspondenceRecipients")
    .withIndex("by_correspondence", (q) =>
      q.eq("correspondenceId", correspondenceId),
    )
    .collect()
  return (
    rows.find(
      (r) =>
        r.recipientKind === "citizen" && r.recipientCitizenId === citizenId,
    ) ?? null
  )
}

async function shapeCorrespondenceListItem(
  ctx: QueryCtx,
  c: Doc<"correspondences">,
  side: "inbox" | "sent",
) {
  const fromOrg = c.fromOrganismId ? await ctx.db.get(c.fromOrganismId) : null
  const fromName = fromOrg?.shortName ?? fromOrg?.name ?? "—"
  return {
    ref: c.ref,
    subject: c.subject,
    kind: c.kind,
    urgent: c.urgent,
    status: c.status,
    confidentiality: c.confidentiality,
    sentAt: c.sentAt,
    dueAckAt: c.dueAckAt,
    side,
    from: fromName,
  }
}

async function shapeFullThread(ctx: QueryCtx, corres: Doc<"correspondences">) {
  const [messages, recipients, attachments, acks, fromOrg] = await Promise.all([
    ctx.db
      .query("correspondenceMessages")
      .withIndex("by_correspondence_time", (q) =>
        q.eq("correspondenceId", corres._id),
      )
      .collect(),
    ctx.db
      .query("correspondenceRecipients")
      .withIndex("by_correspondence", (q) =>
        q.eq("correspondenceId", corres._id),
      )
      .collect(),
    ctx.db
      .query("correspondenceAttachments")
      .withIndex("by_correspondence", (q) =>
        q.eq("correspondenceId", corres._id),
      )
      .collect(),
    ctx.db
      .query("correspondenceAcks")
      .withIndex("by_correspondence", (q) =>
        q.eq("correspondenceId", corres._id),
      )
      .collect(),
    corres.fromOrganismId ? ctx.db.get(corres.fromOrganismId) : null,
  ])

  return {
    ref: corres.ref,
    subject: corres.subject,
    kind: corres.kind,
    body: corres.body,
    urgent: corres.urgent,
    confidentiality: corres.confidentiality,
    status: corres.status,
    sentAt: corres.sentAt,
    dueAckAt: corres.dueAckAt,
    dueReplyAt: corres.dueReplyAt,
    threadId: corres.threadId,
    parentCorrespondenceId: corres.parentCorrespondenceId,
    from: fromOrg?.shortName ?? fromOrg?.name ?? "—",
    recipients: recipients.map((r) => ({
      role: r.role,
      kind: r.recipientKind,
      name: r.recipientNameSnapshot,
    })),
    messages: messages.map((m) => ({
      id: m._id,
      fromKind: m.fromKind,
      body: m.body,
      signed: m.signed,
      sentAt: m.sentAt,
      isSystem: m.isSystem,
    })),
    attachments: attachments.map((a) => ({
      id: a._id,
      filename: a.filename,
      mimeType: a.mimeType,
      sizeBytes: a.sizeBytes,
      kind: a.kind,
    })),
    acks: acks.map((a) => ({
      ackedAt: a.ackedAt,
      note: a.note,
    })),
  }
}
