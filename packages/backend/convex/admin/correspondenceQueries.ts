/**
 * Queries Bloc 5 côté admin — vue complète des correspondances de l'organisme.
 *
 * Couvre :
 *   - listInboxV2 : reçus (avec scopes untreated/noreply/all)
 *   - listOutbox : envoyés
 *   - listDrafts : mes brouillons
 *   - listArchived : corres archivées de mon org
 *   - getThreadV2 : thread enrichi (recipients, acks, attachments, circuit)
 *   - getThreadByThreadId : toutes les corres d'un même thread
 *   - searchCorrespondences : recherche fulltext sujet+body+ref
 *   - getInboxCounts : badge sidebar
 *   - listEscalations : platform_admin
 *   - getKindRules : règles applicables au kind
 */

import { v } from "convex/values"
import type { Doc, Id } from "../_generated/dataModel"
import type { QueryCtx } from "../_generated/server"
import { query } from "../_generated/server"
import { requireAgent } from "../auth"
import { assertCan, actorFromAgent } from "../lib/permissions"
import {
  correspondenceKindValidator,
  correspondenceStatusValidator,
  type CorrespondenceStatus,
} from "../lib/enums"
import { loadKindRule } from "../lib/correspondenceLifecycle"

/* ============================================================
   Listings
   ============================================================ */

export const listInboxV2 = query({
  args: {
    token: v.string(),
    scope: v.optional(
      v.union(v.literal("untreated"), v.literal("noreply"), v.literal("all")),
    ),
    kind: v.optional(correspondenceKindValidator),
    status: v.optional(correspondenceStatusValidator),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { token, scope, kind, status, search, limit }) => {
    const me = await requireAgent(ctx, token)
    assertCan(actorFromAgent(me), "correspondence.read")
    const scopeFinal = scope ?? "all"

    // Récupère tous les recipients de l'org de l'agent (To + CC, jamais BCC pour
    // les autres orgs — BCC n'apparaissent que côté expéditeur)
    const recipientRows = await ctx.db
      .query("correspondenceRecipients")
      .withIndex("by_organism_role", (q) =>
        q.eq("recipientOrganismId", me.organismId),
      )
      .collect()
    const corresIds = new Set<Id<"correspondences">>()
    for (const r of recipientRows) corresIds.add(r.correspondenceId)

    const all: Doc<"correspondences">[] = []
    for (const id of corresIds) {
      const c = await ctx.db.get(id)
      if (c) all.push(c)
    }

    let filtered = all
    if (kind) filtered = filtered.filter((c) => c.kind === kind)
    if (status) filtered = filtered.filter((c) => c.status === status)

    if (scopeFinal === "untreated") {
      // Pas d'AR par mon org
      filtered = await asyncFilter(filtered, async (c) => {
        const myRecipient = recipientRows.find(
          (r) => r.correspondenceId === c._id,
        )
        if (!myRecipient) return false
        const ack = await ctx.db
          .query("correspondenceAcks")
          .withIndex("by_recipient", (q) => q.eq("recipientId", myRecipient._id))
          .first()
        return !ack
      })
    } else if (scopeFinal === "noreply") {
      // AR fait MAIS pas de réponse de mon org au-delà du 1er message
      filtered = await asyncFilter(filtered, async (c) => {
        const messages = await ctx.db
          .query("correspondenceMessages")
          .withIndex("by_correspondence_time", (q) =>
            q.eq("correspondenceId", c._id),
          )
          .collect()
        const repliedByMyOrg = messages.some(
          (m) => m.fromOrganismIdSnapshot === me.organismId,
        )
        return !repliedByMyOrg
      })
    }

    if (search) {
      const s = search.toLowerCase()
      filtered = filtered.filter(
        (c) =>
          c.ref.toLowerCase().includes(s) ||
          c.subject.toLowerCase().includes(s) ||
          c.body.toLowerCase().includes(s),
      )
    }

    filtered.sort((a, b) => (b.sentAt ?? 0) - (a.sentAt ?? 0))
    const sliced = filtered.slice(0, limit ?? 100)

    return Promise.all(
      sliced.map((c) => shapeListItem(ctx, c, me._id, "inbox")),
    )
  },
})

export const listOutbox = query({
  args: {
    token: v.string(),
    status: v.optional(correspondenceStatusValidator),
    kind: v.optional(correspondenceKindValidator),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { token, status, kind, search, limit }) => {
    const me = await requireAgent(ctx, token)
    assertCan(actorFromAgent(me), "correspondence.read")
    let rows = await ctx.db
      .query("correspondences")
      .withIndex("by_from_organism", (q) => q.eq("fromOrganismId", me.organismId))
      .collect()
    // Exclure les drafts (ils sont dans listDrafts)
    rows = rows.filter((c) => c.status !== "draft")
    if (status) rows = rows.filter((c) => c.status === status)
    if (kind) rows = rows.filter((c) => c.kind === kind)
    if (search) {
      const s = search.toLowerCase()
      rows = rows.filter(
        (c) =>
          c.ref.toLowerCase().includes(s) ||
          c.subject.toLowerCase().includes(s) ||
          c.body.toLowerCase().includes(s),
      )
    }
    rows.sort((a, b) => (b.sentAt ?? 0) - (a.sentAt ?? 0))
    return Promise.all(
      rows.slice(0, limit ?? 100).map((c) => shapeListItem(ctx, c, me._id, "sent")),
    )
  },
})

export const listDrafts = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const me = await requireAgent(ctx, token)
    assertCan(actorFromAgent(me), "correspondence.create")
    const rows = await ctx.db
      .query("correspondences")
      .withIndex("by_from_organism_status", (q) =>
        q.eq("fromOrganismId", me.organismId).eq("status", "draft"),
      )
      .collect()
    // Seuls mes brouillons (par createdByAgentId)
    const mine = rows.filter((c) => c.createdByAgentId === me._id)
    mine.sort((a, b) => b._creationTime - a._creationTime)
    return Promise.all(mine.map((c) => shapeListItem(ctx, c, me._id, "draft")))
  },
})

export const listArchived = query({
  args: {
    token: v.string(),
    search: v.optional(v.string()),
    kind: v.optional(correspondenceKindValidator),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { token, search, kind, limit }) => {
    const me = await requireAgent(ctx, token)
    assertCan(actorFromAgent(me), "correspondence.read")
    let rows = await ctx.db
      .query("correspondences")
      .withIndex("by_from_organism_status", (q) =>
        q.eq("fromOrganismId", me.organismId).eq("status", "archived"),
      )
      .collect()
    if (kind) rows = rows.filter((c) => c.kind === kind)
    if (search) {
      const s = search.toLowerCase()
      rows = rows.filter(
        (c) =>
          c.ref.toLowerCase().includes(s) ||
          c.subject.toLowerCase().includes(s),
      )
    }
    rows.sort((a, b) => (b.archivedAt ?? 0) - (a.archivedAt ?? 0))
    return Promise.all(
      rows.slice(0, limit ?? 50).map((c) => shapeListItem(ctx, c, me._id, "archived")),
    )
  },
})

/* ============================================================
   Thread
   ============================================================ */

export const getThreadV2 = query({
  args: { token: v.string(), ref: v.string() },
  handler: async (ctx, { token, ref }) => {
    const me = await requireAgent(ctx, token)
    assertCan(actorFromAgent(me), "correspondence.read")
    const corres = await ctx.db
      .query("correspondences")
      .withIndex("by_ref", (q) => q.eq("ref", ref))
      .unique()
    if (!corres) return null

    // Sécurité : l'agent doit être dans l'org émettrice OU recipient
    const inSender = corres.fromOrganismId === me.organismId
    const recipients = await ctx.db
      .query("correspondenceRecipients")
      .withIndex("by_correspondence", (q) =>
        q.eq("correspondenceId", corres._id),
      )
      .collect()
    const inRecipient = recipients.some(
      (r) => r.recipientOrganismId === me.organismId,
    )
    if (!inSender && !inRecipient) {
      throw new Error("Cette correspondance est hors de votre périmètre.")
    }

    return shapeFullThread(ctx, corres, recipients, me._id, inSender)
  },
})

export const getThreadByThreadId = query({
  args: { token: v.string(), threadId: v.string() },
  handler: async (ctx, { token, threadId }) => {
    const me = await requireAgent(ctx, token)
    assertCan(actorFromAgent(me), "correspondence.read")
    const corres = await ctx.db
      .query("correspondences")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .collect()
    // Filtre celles que je peux voir
    const visible: Doc<"correspondences">[] = []
    for (const c of corres) {
      if (c.fromOrganismId === me.organismId) {
        visible.push(c)
        continue
      }
      const recipients = await ctx.db
        .query("correspondenceRecipients")
        .withIndex("by_correspondence", (q) =>
          q.eq("correspondenceId", c._id),
        )
        .collect()
      if (recipients.some((r) => r.recipientOrganismId === me.organismId)) {
        visible.push(c)
      }
    }
    visible.sort((a, b) => (a.sentAt ?? a._creationTime) - (b.sentAt ?? b._creationTime))
    return visible.map((c) => ({
      ref: c.ref,
      subject: c.subject,
      kind: c.kind,
      status: c.status,
      sentAt: c.sentAt,
    }))
  },
})

/* ============================================================
   Counts + recherche + escalations
   ============================================================ */

export const getInboxCounts = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const me = await requireAgent(ctx, token)
    assertCan(actorFromAgent(me), "correspondence.read")

    const recipientRows = await ctx.db
      .query("correspondenceRecipients")
      .withIndex("by_organism_role", (q) =>
        q.eq("recipientOrganismId", me.organismId),
      )
      .collect()

    let unread = 0
    let untreated = 0
    let urgent = 0
    for (const r of recipientRows) {
      const corres = await ctx.db.get(r.correspondenceId)
      if (!corres) continue
      if (corres.status === "draft" || corres.status === "recalled") continue
      // Unread = pas de read par moi
      const readByMe = await ctx.db
        .query("correspondenceReads")
        .withIndex("by_correspondence_agent", (q) =>
          q.eq("correspondenceId", r.correspondenceId).eq("agentId", me._id),
        )
        .first()
      if (!readByMe) unread++
      // Untreated = pas d'AR par mon org (et je suis To)
      if (r.role === "to") {
        const ack = await ctx.db
          .query("correspondenceAcks")
          .withIndex("by_recipient", (q) => q.eq("recipientId", r._id))
          .first()
        if (!ack) untreated++
      }
      if (corres.urgent) urgent++
    }
    return { unread, untreated, urgent }
  },
})

export const searchCorrespondences = query({
  args: { token: v.string(), query: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { token, query: q, limit }) => {
    const me = await requireAgent(ctx, token)
    assertCan(actorFromAgent(me), "correspondence.read")
    const s = q.toLowerCase().trim()
    if (s.length < 3) return []

    // Search dans envoyés
    const sent = await ctx.db
      .query("correspondences")
      .withIndex("by_from_organism", (q) =>
        q.eq("fromOrganismId", me.organismId),
      )
      .collect()
    // Search dans reçus
    const recipientRows = await ctx.db
      .query("correspondenceRecipients")
      .withIndex("by_organism_role", (q) =>
        q.eq("recipientOrganismId", me.organismId),
      )
      .collect()
    const recvIds = new Set(recipientRows.map((r) => r.correspondenceId))
    const recv: Doc<"correspondences">[] = []
    for (const id of recvIds) {
      const c = await ctx.db.get(id)
      if (c) recv.push(c)
    }
    const all = [...sent, ...recv]
    // Dédup
    const uniq = new Map<string, Doc<"correspondences">>()
    for (const c of all) uniq.set(c._id, c)
    const filtered = Array.from(uniq.values()).filter(
      (c) =>
        c.ref.toLowerCase().includes(s) ||
        c.subject.toLowerCase().includes(s) ||
        c.body.toLowerCase().includes(s),
    )
    filtered.sort((a, b) => (b.sentAt ?? 0) - (a.sentAt ?? 0))
    return filtered.slice(0, limit ?? 25).map((c) => ({
      ref: c.ref,
      subject: c.subject,
      kind: c.kind,
      status: c.status,
      sentAt: c.sentAt,
    }))
  },
})

export const listEscalations = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const me = await requireAgent(ctx, token)
    assertCan(actorFromAgent(me), "correspondence.platform_read")
    const escalations: Doc<"correspondences">[] = []
    for (const kind of [
      "escalation_tutelle",
      "escalation_dispute",
      "escalation_incident",
    ] as const) {
      const rows = await ctx.db
        .query("correspondences")
        .withIndex("by_kind_status", (q) => q.eq("kind", kind))
        .collect()
      escalations.push(...rows)
    }
    escalations.sort((a, b) => (b.sentAt ?? 0) - (a.sentAt ?? 0))
    return escalations.map((c) => ({
      ref: c.ref,
      kind: c.kind,
      subject: c.subject,
      status: c.status,
      sentAt: c.sentAt,
      urgent: c.urgent,
    }))
    void me // unused
  },
})

export const getKindRules = query({
  args: { token: v.string(), kind: correspondenceKindValidator },
  handler: async (ctx, { token, kind }) => {
    await requireAgent(ctx, token)
    return await loadKindRule(ctx, kind)
  },
})

/* ============================================================
   Helpers
   ============================================================ */

async function asyncFilter<T>(
  arr: T[],
  predicate: (item: T) => Promise<boolean>,
): Promise<T[]> {
  const results = await Promise.all(arr.map(predicate))
  return arr.filter((_, i) => results[i])
}

async function shapeListItem(
  ctx: QueryCtx,
  c: Doc<"correspondences">,
  agentId: Id<"agents">,
  side: "inbox" | "sent" | "draft" | "archived",
) {
  const fromOrg = c.fromOrganismId ? await ctx.db.get(c.fromOrganismId) : null
  const readByMe = await ctx.db
    .query("correspondenceReads")
    .withIndex("by_correspondence_agent", (q) =>
      q.eq("correspondenceId", c._id).eq("agentId", agentId),
    )
    .first()
  return {
    ref: c.ref,
    subject: c.subject,
    kind: c.kind,
    status: c.status as CorrespondenceStatus,
    urgent: c.urgent,
    confidentiality: c.confidentiality,
    sentAt: c.sentAt,
    dueAckAt: c.dueAckAt,
    side,
    from: fromOrg?.shortName ?? fromOrg?.name ?? "—",
    attachmentsCount: c.attachmentsCount ?? 0,
    unread: !readByMe,
  }
}

async function shapeFullThread(
  ctx: QueryCtx,
  corres: Doc<"correspondences">,
  recipients: Doc<"correspondenceRecipients">[],
  viewerAgentId: Id<"agents">,
  isSender: boolean,
) {
  const [messages, attachments, acks, fromOrg, parentInfo] = await Promise.all([
    ctx.db
      .query("correspondenceMessages")
      .withIndex("by_correspondence_time", (q) =>
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
    corres.parentCorrespondenceId
      ? ctx.db.get(corres.parentCorrespondenceId)
      : null,
  ])

  // Filtre BCC : un BCC n'est visible que par l'émetteur ET par le BCC lui-même
  const visibleRecipients = isSender
    ? recipients
    : recipients.filter(
        (r) =>
          r.role !== "bcc" ||
          (r.recipientOrganismId &&
            // L'agent connaît son propre org
            true),
      )

  // Circuit signature (si applicable)
  let circuit = null
  if (corres.signatureCircuitId) {
    const c = await ctx.db.get(corres.signatureCircuitId)
    const steps = await ctx.db
      .query("signatureCircuitSteps")
      .withIndex("by_circuit_order", (q) =>
        q.eq("circuitId", corres.signatureCircuitId!),
      )
      .collect()
    const assignees = await Promise.all(
      steps.map((s) => ctx.db.get(s.assigneeAgentId)),
    )
    if (c) {
      circuit = {
        id: c._id,
        status: c.status,
        steps: steps.map((s, i) => ({
          order: s.order,
          assigneeRole: s.assigneeRoleSnapshot,
          assigneeName: assignees[i]?.name ?? "—",
          status: s.status,
          decidedAt: s.decidedAt,
          comment: s.comment,
        })),
      }
    }
  }

  const messagesWithAuthor = await Promise.all(
    messages.map(async (m) => {
      let authorName: string | null = null
      let authorOrg: string | null = null
      if (m.fromKind === "agent" && m.fromAgentId) {
        const author = await ctx.db.get(m.fromAgentId)
        authorName = author?.name ?? null
        if (m.fromOrganismIdSnapshot) {
          const o = await ctx.db.get(m.fromOrganismIdSnapshot)
          authorOrg = o?.shortName ?? o?.name ?? null
        }
      } else if (m.fromKind === "citizen" && m.fromCitizenId) {
        const c = await ctx.db.get(m.fromCitizenId)
        authorName = c?.name ?? null
      }
      return {
        id: m._id,
        fromKind: m.fromKind,
        authorName,
        authorOrg,
        body: m.body,
        bodyFormat: m.bodyFormat,
        signed: m.signed,
        signatureAlgorithm: m.signatureAlgorithm,
        sentAt: m.sentAt,
        isSystem: m.isSystem,
      }
    }),
  )

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
    duaCode: corres.duaCode,
    threadId: corres.threadId,
    parent: parentInfo
      ? { ref: parentInfo.ref, subject: parentInfo.subject }
      : null,
    from: fromOrg?.shortName ?? fromOrg?.name ?? "—",
    isSender,
    recipients: visibleRecipients.map((r) => ({
      id: r._id,
      role: r.role,
      kind: r.recipientKind,
      name: r.recipientNameSnapshot,
      email: r.recipientEmailSnapshot,
      firstReadAt: r.firstReadAt,
    })),
    messages: messagesWithAuthor,
    attachments: attachments.map((a) => ({
      id: a._id,
      filename: a.filename,
      mimeType: a.mimeType,
      sizeBytes: a.sizeBytes,
      kind: a.kind,
      linkedDocumentId: a.linkedDocumentId,
      signed: a.signed,
    })),
    acks: acks.map((a) => ({
      ackedAt: a.ackedAt,
      note: a.note,
    })),
    circuit,
    viewerAgentId,
    linkedRequestIds: corres.linkedRequestIds ?? [],
    linkedCitizenIds: corres.linkedCitizenIds ?? [],
    linkedDocumentIds: corres.linkedDocumentIds ?? [],
  }
}
