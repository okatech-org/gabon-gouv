import { v } from "convex/values"
import { query } from "../_generated/server"
import { requireAgent } from "../auth"

/* ---------- Liste courriers reçus A6 ---------- */
export const listInbox = query({
  args: { token: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { token, limit }) => {
    const agent = await requireAgent(ctx, token)

    const rows = await ctx.db
      .query("correspondences")
      .withIndex("by_to_organism", (q) => q.eq("toOrganismId", agent.organismId))
      .collect()

    rows.sort((a, b) => (b.sentAt ?? 0) - (a.sentAt ?? 0))

    return Promise.all(
      rows.slice(0, limit ?? 50).map(async (c) => {
        const fromOrg = c.fromOrganismId
          ? await ctx.db.get(c.fromOrganismId)
          : null
        const read = await ctx.db
          .query("correspondenceReads")
          .withIndex("by_correspondence_agent", (q) =>
            q.eq("correspondenceId", c._id).eq("agentId", agent._id),
          )
          .unique()
        const messages = await ctx.db
          .query("correspondenceMessages")
          .withIndex("by_correspondence", (q) => q.eq("correspondenceId", c._id))
          .collect()
        return {
          ref: c.ref,
          from: fromOrg?.shortName ?? fromOrg?.name ?? "—",
          subject: c.subject,
          sentAt: c.sentAt,
          urgent: c.urgent,
          confidentiality: c.confidentiality,
          unread: !read,
          attachmentCount: messages.length, // proxy temporaire
        }
      }),
    )
  },
})

/* ---------- Conversation détaillée ---------- */
export const getThread = query({
  args: { token: v.string(), ref: v.string() },
  handler: async (ctx, { token, ref }) => {
    await requireAgent(ctx, token)

    const correspondence = await ctx.db
      .query("correspondences")
      .withIndex("by_ref", (q) => q.eq("ref", ref))
      .unique()
    if (!correspondence) return null

    const [fromOrg, toOrg, messages, linkedCitizen, linkedRequest] = await Promise.all([
      correspondence.fromOrganismId
        ? ctx.db.get(correspondence.fromOrganismId)
        : null,
      correspondence.toOrganismId
        ? ctx.db.get(correspondence.toOrganismId)
        : null,
      ctx.db
        .query("correspondenceMessages")
        .withIndex("by_correspondence", (q) =>
          q.eq("correspondenceId", correspondence._id),
        )
        .collect(),
      correspondence.linkedCitizenId
        ? ctx.db.get(correspondence.linkedCitizenId)
        : null,
      correspondence.linkedRequestId
        ? ctx.db.get(correspondence.linkedRequestId)
        : null,
    ])

    const messagesWithAuthor = await Promise.all(
      messages
        .sort((a, b) => a.sentAt - b.sentAt)
        .map(async (m) => {
          const author = m.fromAgentId ? await ctx.db.get(m.fromAgentId) : null
          const authorOrg = author ? await ctx.db.get(author.organismId) : null
          return {
            fromAgentName: author?.name ?? "—",
            fromOrganism: authorOrg?.shortName ?? authorOrg?.name ?? "—",
            body: m.body,
            signed: m.signed,
            sentAt: m.sentAt,
          }
        }),
    )

    return {
      ref: correspondence.ref,
      subject: correspondence.subject,
      sentAt: correspondence.sentAt,
      dueAt: correspondence.dueAt,
      urgent: correspondence.urgent,
      confidentiality: correspondence.confidentiality,
      archivePolicy: correspondence.archivePolicy,
      from: fromOrg?.shortName ?? fromOrg?.name ?? "—",
      to: toOrg?.shortName ?? toOrg?.name ?? "—",
      messages: messagesWithAuthor,
      linkedCitizen: linkedCitizen
        ? { name: linkedCitizen.name, nip: linkedCitizen.nip }
        : null,
      linkedRequest: linkedRequest
        ? { ref: linkedRequest.ref, status: linkedRequest.status }
        : null,
    }
  },
})
