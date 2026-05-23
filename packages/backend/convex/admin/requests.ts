import { v } from "convex/values"
import { query } from "../_generated/server"
import { requireAgent } from "../auth"
import type { Doc, Id } from "../_generated/dataModel"

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

/* ---------- Détail instruction A3 ---------- */
export const getInstruction = query({
  args: { token: v.string(), ref: v.string() },
  handler: async (ctx, { token, ref }) => {
    await requireAgent(ctx, token)

    const request = await ctx.db
      .query("requests")
      .withIndex("by_ref", (q) => q.eq("ref", ref))
      .unique()
    if (!request) return null

    const [citizen, service, assignedAgent, pieces, verifications, events] =
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
      ])

    return {
      ref: request.ref,
      status: request.status,
      progressPct: request.progressPct,
      depositedAt: request.depositedAt,
      dueAt: request.dueAt,
      internalNote: request.internalNote ?? "",
      payload: request.payload,
      service: service && {
        title: formatServiceTitle(service),
        slug: service.slug,
      },
      assignedAgent: assignedAgent && {
        name: assignedAgent.name,
        role: assignedAgent.role,
      },
      citizen: citizen && {
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
        label: p.label,
        filename: p.filename,
        sizeBytes: p.sizeBytes,
        status: p.status,
        ocrConfidence: p.ocrConfidence,
        required: p.required,
      })),
      verifications: verifications
        .sort((a, b) => a.order - b.order)
        .map((v) => ({
          title: v.title,
          description: v.description,
          status: v.status,
        })),
      events: events.map((e) => ({
        kind: e.kind,
        title: e.title,
        description: e.description,
        actor: e.actor,
        occurredAt: e.occurredAt,
      })),
    }
  },
})

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

/* ---------- Type util ---------- */
export type RequestId = Id<"requests">
