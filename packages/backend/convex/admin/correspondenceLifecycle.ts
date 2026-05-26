/**
 * Mutations Bloc 5 — cycle de vie d'une correspondance côté admin.
 *
 * Couvre :
 *   - createDraft, updateDraft, deleteDraft
 *   - addRecipient, removeRecipient (To/CC/BCC polymorphe)
 *   - attachFile, removeAttachment
 *   - submitForSignature (ouvre circuit Bloc 3 polymorphe)
 *   - sendDirect (sans circuit, pour kinds autorisés)
 *   - acknowledge (AR formel) + reply + recall + close + archive
 *
 * Toutes signent leurs messages via `lib/smime.ts` (stub v1).
 * Le module historique `admin/correspondence.ts` (queries listInbox/getThread
 * et le wrapper sendCorrespondence existant) est conservé tel quel pour
 * rétrocompat ; les nouvelles UIs utilisent ce module-ci.
 */

import { v } from "convex/values"
import type { Doc, Id } from "../_generated/dataModel"
import type { MutationCtx } from "../_generated/server"
import { requireAgent } from "../auth"
import { mutation } from "../lib/triggers"
import { actorFromAgent, assertCan } from "../lib/permissions"
import {
  correspondenceAttachmentKindValidator,
  correspondenceKindValidator,
  correspondencePartyKindValidator,
  correspondenceRecipientRoleValidator,
  confidentialityLevelValidator,
} from "../lib/enums"
import {
  generateCorrespondenceRef,
  loadKindRule,
  newThreadId,
  performCorrespondenceSend,
} from "../lib/correspondenceLifecycle"
import { signMessage } from "../lib/smime"
import { createCircuit } from "../lib/signatureCircuit"
import { notify } from "../lib/notificationProvider"

/* ============================================================
   Brouillon — création & édition
   ============================================================ */

export const createDraft = mutation({
  args: {
    token: v.string(),
    kind: correspondenceKindValidator,
    subject: v.string(),
    body: v.string(),
    urgent: v.optional(v.boolean()),
    confidentiality: v.optional(confidentialityLevelValidator),
    // Lien optionnel à un thread existant (réponse formelle à une corres clôturée)
    parentCorrespondenceId: v.optional(v.id("correspondences")),
    // Liens métier multi
    linkedRequestIds: v.optional(v.array(v.id("requests"))),
    linkedCitizenIds: v.optional(v.array(v.id("citizens"))),
    linkedDocumentIds: v.optional(v.array(v.id("documents"))),
  },
  handler: async (ctx, args) => {
    const me = await requireAgent(ctx, args.token)
    assertCan(actorFromAgent(me), "correspondence.create")

    if (!args.subject.trim()) throw new Error("Le sujet est obligatoire.")

    const rule = await loadKindRule(ctx, args.kind)
    const ref = await generateCorrespondenceRef(ctx)

    // Thread : si réponse à une corres existante, hérite du threadId ;
    // sinon nouveau thread.
    let threadId = newThreadId()
    if (args.parentCorrespondenceId) {
      const parent = await ctx.db.get(args.parentCorrespondenceId)
      if (parent?.threadId) threadId = parent.threadId
    }

    const correspondenceId = await ctx.db.insert("correspondences", {
      ref,
      senderKind: "organism",
      senderId: String(me.organismId),
      fromOrganismId: me.organismId,
      kind: args.kind,
      subject: args.subject.trim(),
      body: args.body,
      bodyFormat: "plain",
      urgent: args.urgent ?? false,
      confidentiality: args.confidentiality ?? rule.defaultConfidentiality,
      duaCode: rule.duaCode,
      status: "draft",
      threadId,
      parentCorrespondenceId: args.parentCorrespondenceId,
      linkedRequestIds: args.linkedRequestIds,
      linkedCitizenIds: args.linkedCitizenIds,
      linkedDocumentIds: args.linkedDocumentIds,
      createdByAgentId: me._id,
      participantsCount: 0,
      messagesCount: 0,
      attachmentsCount: 0,
    })

    return { ref, correspondenceId, threadId }
  },
})

export const updateDraft = mutation({
  args: {
    token: v.string(),
    correspondenceId: v.id("correspondences"),
    patch: v.object({
      subject: v.optional(v.string()),
      body: v.optional(v.string()),
      urgent: v.optional(v.boolean()),
      confidentiality: v.optional(confidentialityLevelValidator),
      kind: v.optional(correspondenceKindValidator),
    }),
  },
  handler: async (ctx, { token, correspondenceId, patch }) => {
    const me = await requireAgent(ctx, token)
    assertCan(actorFromAgent(me), "correspondence.create")
    const corres = await requireDraftOwned(ctx, correspondenceId, me)

    const update: Partial<Doc<"correspondences">> = {}
    if (patch.subject !== undefined) {
      if (!patch.subject.trim()) throw new Error("Le sujet ne peut être vide.")
      update.subject = patch.subject.trim()
    }
    if (patch.body !== undefined) update.body = patch.body
    if (patch.urgent !== undefined) update.urgent = patch.urgent
    if (patch.confidentiality !== undefined)
      update.confidentiality = patch.confidentiality
    if (patch.kind !== undefined && patch.kind !== corres.kind) {
      // Changer de kind ré-évalue la DUA + délais (rule par défaut).
      const rule = await loadKindRule(ctx, patch.kind)
      update.kind = patch.kind
      update.duaCode = rule.duaCode
    }
    await ctx.db.patch(correspondenceId, update)
  },
})

export const deleteDraft = mutation({
  args: { token: v.string(), correspondenceId: v.id("correspondences") },
  handler: async (ctx, { token, correspondenceId }) => {
    const me = await requireAgent(ctx, token)
    assertCan(actorFromAgent(me), "correspondence.create")
    await requireDraftOwned(ctx, correspondenceId, me)

    // Suppression cascade : recipients + attachments
    const recipients = await ctx.db
      .query("correspondenceRecipients")
      .withIndex("by_correspondence", (q) =>
        q.eq("correspondenceId", correspondenceId),
      )
      .collect()
    for (const r of recipients) await ctx.db.delete(r._id)
    const attachments = await ctx.db
      .query("correspondenceAttachments")
      .withIndex("by_correspondence", (q) =>
        q.eq("correspondenceId", correspondenceId),
      )
      .collect()
    for (const a of attachments) {
      try {
        await ctx.storage.delete(a.storageKey)
      } catch {
        // PJ orpheline, on continue
      }
      await ctx.db.delete(a._id)
    }
    await ctx.db.delete(correspondenceId)
  },
})

/* ============================================================
   Destinataires To/CC/BCC
   ============================================================ */

export const addRecipient = mutation({
  args: {
    token: v.string(),
    correspondenceId: v.id("correspondences"),
    role: correspondenceRecipientRoleValidator,
    recipientKind: correspondencePartyKindValidator,
    recipientId: v.string(), // id polymorphe (organisme/citoyen/external)
  },
  handler: async (ctx, args) => {
    const me = await requireAgent(ctx, args.token)
    assertCan(actorFromAgent(me), "correspondence.create")
    await requireDraftOwned(ctx, args.correspondenceId, me)

    const { nameSnapshot, emailSnapshot, normalizedIds } =
      await resolveRecipientSnapshot(ctx, args.recipientKind, args.recipientId)

    // Anti-doublon : même rôle + même recipient
    const existing = await ctx.db
      .query("correspondenceRecipients")
      .withIndex("by_correspondence", (q) =>
        q.eq("correspondenceId", args.correspondenceId),
      )
      .collect()
    if (
      existing.some(
        (r) =>
          r.role === args.role &&
          r.recipientKind === args.recipientKind &&
          r.recipientId === args.recipientId,
      )
    ) {
      throw new Error("Ce destinataire est déjà ajouté avec ce rôle.")
    }

    const recipientId = await ctx.db.insert("correspondenceRecipients", {
      correspondenceId: args.correspondenceId,
      role: args.role,
      recipientKind: args.recipientKind,
      recipientId: args.recipientId,
      recipientOrganismId: normalizedIds.organismId,
      recipientCitizenId: normalizedIds.citizenId,
      recipientExternalPartyId: normalizedIds.externalId,
      recipientNameSnapshot: nameSnapshot,
      recipientEmailSnapshot: emailSnapshot,
    })

    // Update participantsCount (ne compte que to + cc, pas bcc)
    const visibleCount = existing.filter((r) => r.role !== "bcc").length + (args.role !== "bcc" ? 1 : 0)
    await ctx.db.patch(args.correspondenceId, {
      participantsCount: visibleCount + 1, // +1 pour l'émetteur
    })
    return { recipientId }
  },
})

export const removeRecipient = mutation({
  args: {
    token: v.string(),
    correspondenceId: v.id("correspondences"),
    recipientId: v.id("correspondenceRecipients"),
  },
  handler: async (ctx, args) => {
    const me = await requireAgent(ctx, args.token)
    assertCan(actorFromAgent(me), "correspondence.create")
    await requireDraftOwned(ctx, args.correspondenceId, me)
    const recipient = await ctx.db.get(args.recipientId)
    if (!recipient || recipient.correspondenceId !== args.correspondenceId) {
      throw new Error("Destinataire introuvable pour cette correspondance.")
    }
    await ctx.db.delete(args.recipientId)
  },
})

/* ============================================================
   Pièces jointes
   ============================================================ */

export const attachFile = mutation({
  args: {
    token: v.string(),
    correspondenceId: v.id("correspondences"),
    messageId: v.optional(v.id("correspondenceMessages")),
    filename: v.string(),
    mimeType: v.string(),
    sizeBytes: v.number(),
    storageKey: v.string(),
    sha256: v.string(),
    kind: correspondenceAttachmentKindValidator,
    linkedDocumentId: v.optional(v.id("documents")),
    confidentiality: v.optional(confidentialityLevelValidator),
  },
  handler: async (ctx, args) => {
    const me = await requireAgent(ctx, args.token)
    assertCan(actorFromAgent(me), "correspondence.create")
    // PJ ajoutable tant qu'on est sur draft OU si messageId fourni (PJ
    // d'une réponse postérieure).
    const corres = await ctx.db.get(args.correspondenceId)
    if (!corres) throw new Error("Correspondance introuvable.")
    if (!corres.fromOrganismId || corres.fromOrganismId !== me.organismId) {
      throw new Error("Vous n'êtes pas l'émetteur de cette correspondance.")
    }
    if (corres.status !== "draft" && !args.messageId) {
      throw new Error(
        "Une pièce ne peut être ajoutée qu'à un brouillon ou à une réponse.",
      )
    }

    if (args.kind === "document" && !args.linkedDocumentId) {
      throw new Error("Une PJ kind=document doit lier un linkedDocumentId.")
    }

    const attachmentId = await ctx.db.insert("correspondenceAttachments", {
      correspondenceId: args.correspondenceId,
      messageId: args.messageId,
      filename: args.filename,
      mimeType: args.mimeType,
      sizeBytes: args.sizeBytes,
      storageKey: args.storageKey,
      sha256: args.sha256,
      kind: args.kind,
      linkedDocumentId: args.linkedDocumentId,
      confidentiality: args.confidentiality,
      signed: false, // S/MIME au niveau message uniquement v1
      uploadedByAgentId: me._id,
      uploadedAt: Date.now(),
    })

    await ctx.db.patch(args.correspondenceId, {
      attachmentsCount: (corres.attachmentsCount ?? 0) + 1,
    })
    return { attachmentId }
  },
})

export const removeAttachment = mutation({
  args: {
    token: v.string(),
    correspondenceId: v.id("correspondences"),
    attachmentId: v.id("correspondenceAttachments"),
  },
  handler: async (ctx, args) => {
    const me = await requireAgent(ctx, args.token)
    assertCan(actorFromAgent(me), "correspondence.create")
    const corres = await ctx.db.get(args.correspondenceId)
    if (!corres) throw new Error("Correspondance introuvable.")
    if (corres.fromOrganismId !== me.organismId) {
      throw new Error("Vous n'êtes pas l'émetteur.")
    }
    if (corres.status !== "draft") {
      throw new Error("Une PJ déjà envoyée ne peut être retirée.")
    }
    const att = await ctx.db.get(args.attachmentId)
    if (!att || att.correspondenceId !== args.correspondenceId) {
      throw new Error("Pièce introuvable.")
    }
    try {
      await ctx.storage.delete(att.storageKey)
    } catch {
      // orphan
    }
    await ctx.db.delete(args.attachmentId)
    await ctx.db.patch(args.correspondenceId, {
      attachmentsCount: Math.max(0, (corres.attachmentsCount ?? 1) - 1),
    })
  },
})

/* ============================================================
   Envoi (avec ou sans circuit)
   ============================================================ */

export const sendDirect = mutation({
  args: { token: v.string(), correspondenceId: v.id("correspondences") },
  handler: async (ctx, { token, correspondenceId }) => {
    const me = await requireAgent(ctx, token)
    assertCan(actorFromAgent(me), "correspondence.send_direct")
    const corres = await requireDraftOwned(ctx, correspondenceId, me)

    if (!corres.kind) throw new Error("Type de correspondance manquant.")
    const rule = await loadKindRule(ctx, corres.kind)
    if (rule.requiresCircuit) {
      throw new Error(
        "Ce type de correspondance exige un circuit de signature. Utilisez `submitForSignature`.",
      )
    }
    await assertReadyToSend(ctx, corres, rule)
    await performCorrespondenceSend(ctx, corres, me._id)
  },
})

export const submitForSignature = mutation({
  args: {
    token: v.string(),
    correspondenceId: v.id("correspondences"),
    // Optionnel : si l'utilisateur veut préciser les signataires. Sinon
    // résolution dynamique : premier chef_service + premier officier_signataire
    // de l'organisme.
    chefServiceId: v.optional(v.id("agents")),
    officierId: v.optional(v.id("agents")),
  },
  handler: async (ctx, args) => {
    const me = await requireAgent(ctx, args.token)
    assertCan(actorFromAgent(me), "correspondence.send")
    const corres = await requireDraftOwned(ctx, args.correspondenceId, me)
    if (!corres.kind) throw new Error("Type de correspondance manquant.")
    const rule = await loadKindRule(ctx, corres.kind)
    await assertReadyToSend(ctx, corres, rule)

    // Résolution des assignees (cf pattern Bloc 3 lib/issuance prepareDocument)
    const chefId =
      args.chefServiceId ??
      (await findAgentByRole(ctx, me.organismId, "chef_service"))?._id
    const officierId =
      args.officierId ??
      (await findAgentByRole(ctx, me.organismId, "officier_signataire"))?._id
    if (!chefId || !officierId) {
      throw new Error(
        "Impossible de résoudre les signataires (chef_service + officier_signataire requis dans l'organisme).",
      )
    }

    const circuitId = await createCircuit(ctx, {
      subjectKind: "correspondence",
      subjectId: args.correspondenceId,
      steps: [
        { assigneeAgentId: me._id, assigneeRole: "agent_instructeur" },
        { assigneeAgentId: chefId, assigneeRole: "chef_service" },
        { assigneeAgentId: officierId, assigneeRole: "officier_signataire" },
      ],
    })
    await ctx.db.patch(args.correspondenceId, {
      signatureCircuitId: circuitId,
      status: "pending_signature",
    })

    // Notif au premier signataire au-delà de l'instructeur
    await notify(ctx, {
      recipientKind: "agent",
      recipientId: String(chefId),
      kind: "signature_requested",
      severity: "info",
      title: "Visa demandé sur correspondance",
      body: `${corres.ref} attend votre approbation.`,
      linkTo: `/signatures`,
    })

    return { circuitId }
  },
})

/* ============================================================
   Réception : AR + réponse + clôture + rappel + archive
   ============================================================ */

export const acknowledge = mutation({
  args: {
    token: v.string(),
    correspondenceId: v.id("correspondences"),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireAgent(ctx, args.token)
    assertCan(actorFromAgent(me), "correspondence.acknowledge")
    const corres = await ctx.db.get(args.correspondenceId)
    if (!corres) throw new Error("Correspondance introuvable.")

    // L'agent doit appartenir à un organisme listé comme recipient
    const recipient = await findRecipientForOrg(
      ctx,
      args.correspondenceId,
      me.organismId,
    )
    if (!recipient) {
      throw new Error("Votre organisme n'est pas destinataire.")
    }

    // Idempotent : si déjà ack par ce recipient, on ne fait rien
    const existing = await ctx.db
      .query("correspondenceAcks")
      .withIndex("by_recipient", (q) => q.eq("recipientId", recipient._id))
      .first()
    if (existing) return { already: true as const }

    const now = Date.now()
    await ctx.db.insert("correspondenceAcks", {
      correspondenceId: args.correspondenceId,
      recipientId: recipient._id,
      ackedByAgentId: me._id,
      ackedAt: now,
      note: args.note?.trim() || undefined,
    })

    // Si c'est le To principal qui ack → statut passe à acknowledged
    if (recipient.role === "to" && corres.status === "sent") {
      await ctx.db.patch(args.correspondenceId, { status: "acknowledged" })
    }

    // Notif expéditeur
    if (corres.fromOrganismId) {
      const sender =
        corres.createdByAgentId && (await ctx.db.get(corres.createdByAgentId))
      if (sender) {
        await notify(ctx, {
          recipientKind: "agent",
          recipientId: String(sender._id),
          kind: "correspondence_acknowledged",
          severity: "info",
          title: "Accusé de réception reçu",
          body: `${corres.ref} a été reçu par ${recipient.recipientNameSnapshot}.`,
          linkTo: `/correspondance/${corres.ref}`,
        })
      }
    }
    return { already: false as const }
  },
})

export const reply = mutation({
  args: {
    token: v.string(),
    correspondenceId: v.id("correspondences"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const me = await requireAgent(ctx, args.token)
    assertCan(actorFromAgent(me), "correspondence.reply")
    const corres = await ctx.db.get(args.correspondenceId)
    if (!corres) throw new Error("Correspondance introuvable.")
    if (!args.body.trim()) throw new Error("Le corps de la réponse est vide.")

    // Le répondeur doit être dans l'org expéditrice OU recipient
    const isRecipient = await findRecipientForOrg(
      ctx,
      args.correspondenceId,
      me.organismId,
    )
    const isSender = corres.fromOrganismId === me.organismId
    if (!isRecipient && !isSender) {
      throw new Error("Vous n'êtes pas habilité à répondre.")
    }

    const now = Date.now()
    const signature = signMessage({
      body: args.body,
      agentId: me._id,
      sentAt: now,
    })
    await ctx.db.insert("correspondenceMessages", {
      correspondenceId: args.correspondenceId,
      fromKind: "agent",
      fromAgentId: me._id,
      fromOrganismIdSnapshot: me.organismId,
      body: args.body,
      bodyFormat: "plain",
      signed: true,
      signatureFingerprint: signature.signatureFingerprint,
      signatureAlgorithm: signature.signatureAlgorithm,
      signedAt: signature.signedAt,
      sentAt: now,
    })

    await ctx.db.patch(args.correspondenceId, {
      status: "replied",
      messagesCount: (corres.messagesCount ?? 0) + 1,
    })

    // Notif expéditeur
    if (corres.createdByAgentId && corres.createdByAgentId !== me._id) {
      await notify(ctx, {
        recipientKind: "agent",
        recipientId: String(corres.createdByAgentId),
        kind: "correspondence_replied",
        severity: "info",
        title: "Réponse reçue",
        body: `${corres.ref} — ${me.name} a répondu.`,
        linkTo: `/correspondance/${corres.ref}`,
      })
    }
  },
})

export const recall = mutation({
  args: {
    token: v.string(),
    correspondenceId: v.id("correspondences"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const me = await requireAgent(ctx, args.token)
    assertCan(actorFromAgent(me), "correspondence.recall")
    if (!args.reason.trim()) throw new Error("Un motif est requis.")
    const corres = await ctx.db.get(args.correspondenceId)
    if (!corres) throw new Error("Correspondance introuvable.")
    if (corres.fromOrganismId !== me.organismId) {
      throw new Error("Vous ne pouvez rappeler que les corres de votre organisme.")
    }
    if (corres.status === "recalled") {
      return { already: true as const }
    }
    // Refus si déjà un AR reçu
    const firstAck = await ctx.db
      .query("correspondenceAcks")
      .withIndex("by_correspondence", (q) =>
        q.eq("correspondenceId", args.correspondenceId),
      )
      .first()
    if (firstAck) {
      throw new Error(
        "Impossible de rappeler : un accusé de réception a déjà été enregistré.",
      )
    }
    const now = Date.now()
    await ctx.db.patch(args.correspondenceId, {
      status: "recalled",
      recalledAt: now,
      recalledReason: args.reason.trim(),
    })
    // Insert message système dans le thread
    await ctx.db.insert("correspondenceMessages", {
      correspondenceId: args.correspondenceId,
      fromKind: "system",
      body: `Correspondance rappelée par ${me.name} : ${args.reason.trim()}`,
      signed: false,
      sentAt: now,
      isSystem: true,
    })
    // Notif destinataires
    const recipients = await ctx.db
      .query("correspondenceRecipients")
      .withIndex("by_correspondence", (q) =>
        q.eq("correspondenceId", args.correspondenceId),
      )
      .collect()
    for (const r of recipients) {
      const recipientId =
        r.recipientKind === "organism"
          ? r.recipientOrganismId
          : r.recipientKind === "citizen"
            ? r.recipientCitizenId
            : null
      if (!recipientId) continue
      await notify(ctx, {
        recipientKind: r.recipientKind === "citizen" ? "citizen" : "agent",
        recipientId: String(recipientId),
        kind: "correspondence_recalled",
        severity: "warning",
        title: "Courrier rappelé",
        body: `${corres.ref} a été rappelé par l'expéditeur.`,
        linkTo: `/correspondance/${corres.ref}`,
      })
    }
    return { already: false as const }
  },
})

export const close = mutation({
  args: {
    token: v.string(),
    correspondenceId: v.id("correspondences"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireAgent(ctx, args.token)
    assertCan(actorFromAgent(me), "correspondence.close")
    const corres = await ctx.db.get(args.correspondenceId)
    if (!corres) throw new Error("Correspondance introuvable.")
    if (
      corres.fromOrganismId !== me.organismId &&
      !(await findRecipientForOrg(ctx, args.correspondenceId, me.organismId))
    ) {
      throw new Error("Hors de votre périmètre.")
    }
    if (corres.status === "closed" || corres.status === "archived") return
    await ctx.db.patch(args.correspondenceId, {
      status: "closed",
      closedAt: Date.now(),
      closedReason: args.reason?.trim() || undefined,
    })
  },
})

export const archiveCorrespondence = mutation({
  args: { token: v.string(), correspondenceId: v.id("correspondences") },
  handler: async (ctx, args) => {
    const me = await requireAgent(ctx, args.token)
    assertCan(actorFromAgent(me), "correspondence.archive")
    const corres = await ctx.db.get(args.correspondenceId)
    if (!corres) throw new Error("Correspondance introuvable.")
    if (corres.fromOrganismId !== me.organismId) {
      throw new Error("Seul l'organisme émetteur peut archiver.")
    }
    if (corres.status === "archived") return
    const now = Date.now()
    // Insert archive squelette (similaire à finalizeIssuance Bloc 3)
    await ctx.db.insert("archives", {
      cote: `CR/${corres.ref}`,
      description: `${corres.subject} — ${corres.ref}`,
      producerOrganismId: me.organismId,
      versedAt: now,
      dua: corres.duaCode ?? "5y",
      duaExpiresAt: corres.duaExpiresAt,
      status: "active",
      finalSort: "À définir",
      sha256: "0".repeat(64), // calculé sur la corres complète plus tard
      linkedRequestId: corres.linkedRequestId,
    })
    await ctx.db.patch(args.correspondenceId, {
      status: "archived",
      archivedAt: now,
    })
  },
})

/* ============================================================
   Cron : clôture automatique des corres inactives
   ============================================================ */

export const closeStaleAutomatic = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    // On parcourt les statuts actifs
    const candidates = [
      ...(await ctx.db
        .query("correspondences")
        .withIndex("by_kind_status", (q) =>
          q.eq("kind", "instruction_request").eq("status", "sent"),
        )
        .collect()),
      ...(await ctx.db
        .query("correspondences")
        .withIndex("by_kind_status", (q) =>
          q.eq("kind", "instruction_request").eq("status", "acknowledged"),
        )
        .collect()),
      ...(await ctx.db
        .query("correspondences")
        .withIndex("by_kind_status", (q) =>
          q.eq("kind", "instruction_request").eq("status", "replied"),
        )
        .collect()),
    ]
    let closedCount = 0
    for (const c of candidates) {
      if (!c.kind) continue
      const rule = await loadKindRule(ctx, c.kind)
      if (rule.autoCloseAfterDays === undefined) continue
      const lastActivity = c.sentAt ?? c._creationTime
      if (now - lastActivity < rule.autoCloseAfterDays * 24 * 60 * 60 * 1000)
        continue
      await ctx.db.patch(c._id, {
        status: "closed",
        closedAt: now,
        closedReason: "Clôture automatique pour inactivité",
      })
      closedCount++
    }
    return { closedCount }
  },
})

/* ============================================================
   Helpers internes
   ============================================================ */

async function requireDraftOwned(
  ctx: MutationCtx,
  correspondenceId: Id<"correspondences">,
  me: Doc<"agents">,
): Promise<Doc<"correspondences">> {
  const corres = await ctx.db.get(correspondenceId)
  if (!corres) throw new Error("Correspondance introuvable.")
  if (corres.fromOrganismId !== me.organismId) {
    throw new Error("Hors de votre périmètre.")
  }
  if (corres.status !== "draft") {
    throw new Error(
      `La correspondance n'est plus modifiable (statut ${corres.status}).`,
    )
  }
  return corres
}

async function assertReadyToSend(
  ctx: MutationCtx,
  corres: Doc<"correspondences">,
  rule: { requiresAttachment: boolean },
): Promise<void> {
  if (!corres.subject.trim()) throw new Error("Le sujet est obligatoire.")
  if (!corres.body.trim()) throw new Error("Le corps est obligatoire.")
  const recipients = await ctx.db
    .query("correspondenceRecipients")
    .withIndex("by_correspondence", (q) => q.eq("correspondenceId", corres._id))
    .collect()
  if (recipients.length === 0)
    throw new Error("Au moins un destinataire est requis.")
  if (!recipients.some((r) => r.role === "to")) {
    throw new Error("Un destinataire principal (To) est requis.")
  }
  if (rule.requiresAttachment) {
    const attachments = await ctx.db
      .query("correspondenceAttachments")
      .withIndex("by_correspondence", (q) =>
        q.eq("correspondenceId", corres._id),
      )
      .collect()
    if (attachments.length === 0) {
      throw new Error("Ce type de correspondance exige au moins une pièce jointe.")
    }
  }
}

async function findAgentByRole(
  ctx: MutationCtx,
  organismId: Id<"organisms">,
  role: Doc<"agents">["role"],
): Promise<Doc<"agents"> | null> {
  return await ctx.db
    .query("agents")
    .withIndex("by_organism_role", (q) =>
      q.eq("organismId", organismId).eq("role", role),
    )
    .first()
}

async function findRecipientForOrg(
  ctx: MutationCtx,
  correspondenceId: Id<"correspondences">,
  organismId: Id<"organisms">,
): Promise<Doc<"correspondenceRecipients"> | null> {
  const recipients = await ctx.db
    .query("correspondenceRecipients")
    .withIndex("by_correspondence", (q) =>
      q.eq("correspondenceId", correspondenceId),
    )
    .collect()
  return (
    recipients.find(
      (r) =>
        r.recipientKind === "organism" && r.recipientOrganismId === organismId,
    ) ?? null
  )
}

async function resolveRecipientSnapshot(
  ctx: MutationCtx,
  kind: Doc<"correspondenceRecipients">["recipientKind"],
  id: string,
): Promise<{
  nameSnapshot: string
  emailSnapshot?: string
  normalizedIds: {
    organismId?: Id<"organisms">
    citizenId?: Id<"citizens">
    externalId?: Id<"externalParties">
  }
}> {
  if (kind === "organism") {
    const orgId = id as Id<"organisms">
    const org = await ctx.db.get(orgId)
    if (!org) throw new Error("Organisme destinataire introuvable.")
    return {
      nameSnapshot: org.shortName ?? org.name,
      normalizedIds: { organismId: orgId },
    }
  }
  if (kind === "citizen") {
    const citizenId = id as Id<"citizens">
    const citizen = await ctx.db.get(citizenId)
    if (!citizen) throw new Error("Citoyen destinataire introuvable.")
    return {
      nameSnapshot: citizen.name,
      emailSnapshot: citizen.email,
      normalizedIds: { citizenId },
    }
  }
  if (kind === "external") {
    const extId = id as Id<"externalParties">
    const ext = await ctx.db.get(extId)
    if (!ext) throw new Error("Partie externe introuvable.")
    return {
      nameSnapshot: ext.name,
      emailSnapshot: ext.email,
      normalizedIds: { externalId: extId },
    }
  }
  // platform : on accepte un id opaque (organisme représentant la plateforme)
  return { nameSnapshot: "Plateforme Gabon Connect", normalizedIds: {} }
}

/* ============================================================
   Notification helpers exposés (Phase B → UI)
   ============================================================ */

export const markRead = mutation({
  args: { token: v.string(), correspondenceId: v.id("correspondences") },
  handler: async (ctx, { token, correspondenceId }) => {
    const me = await requireAgent(ctx, token)
    const existing = await ctx.db
      .query("correspondenceReads")
      .withIndex("by_correspondence_agent", (q) =>
        q.eq("correspondenceId", correspondenceId).eq("agentId", me._id),
      )
      .first()
    if (existing) return
    await ctx.db.insert("correspondenceReads", {
      correspondenceId,
      agentId: me._id,
      readAt: Date.now(),
    })
  },
})
