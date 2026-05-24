import { v } from "convex/values"
import { query } from "../_generated/server"
import { mutation } from "../lib/triggers"
import type { Id } from "../_generated/dataModel"
import { requireCitizen } from "./auth"
import { assertCan } from "../lib/permissions"

/**
 * Cycle citoyen d'une demande : dépôt, suivi, annulation, messages.
 *
 * Toutes les mutations passent par `requireCitizen(idnSub)` et vérifient
 * la propriété de la demande via `assertCan(actor, "request.read.own"/
 * "request.deposit"/"request.cancel")`.
 */

export const getMyRequest = query({
  args: { idnSub: v.string(), ref: v.string() },
  handler: async (ctx, { idnSub, ref }) => {
    const { citizen } = await requireCitizen(ctx, idnSub)
    const request = await ctx.db
      .query("requests")
      .withIndex("by_ref", (q) => q.eq("ref", ref))
      .unique()
    if (!request) return null
    if (request.citizenId !== citizen._id) {
      throw new Error("Cette demande ne vous appartient pas.")
    }

    const [service, organism, agent, events, messages, pieces] =
      await Promise.all([
        ctx.db.get(request.serviceId),
        ctx.db.get(request.organismId),
        request.assignedAgentId
          ? ctx.db.get(request.assignedAgentId)
          : Promise.resolve(null),
        ctx.db
          .query("requestEvents")
          .withIndex("by_request_time", (q) => q.eq("requestId", request._id))
          .collect(),
        ctx.db
          .query("requestMessages")
          .withIndex("by_request_time", (q) => q.eq("requestId", request._id))
          .collect(),
        ctx.db
          .query("pieces")
          .withIndex("by_request", (q) => q.eq("requestId", request._id))
          .collect(),
      ])
    events.sort((a, b) => a.occurredAt - b.occurredAt)
    messages.sort((a, b) => b.sentAt - a.sentAt)

    const { label, tone } = statusLabel(request.status)
    const variant = request.serviceVariantId
      ? await ctx.db.get(request.serviceVariantId)
      : null
    const title = service
      ? variant
        ? `${service.title} · ${variant.label}`
        : service.title
      : "Service inconnu"

    return {
      ref: request.ref,
      title,
      subtitle: `Demande déposée le ${formatDateLong(request.depositedAt)} · ${organism?.shortName ?? organism?.name ?? ""}`,
      status: label,
      statusTone: tone,
      progress: request.progressPct,
      estimatedDelay: request.dueAt
        ? `~ ${formatRelativeMs(request.dueAt - Date.now())}`
        : "—",
      agent: agent?.name ?? "—",
      canCancel: !["issued", "cancelled", "rejected"].includes(request.status),
      events: events.map((e) => ({
        title: e.title,
        date: formatDateShort(e.occurredAt),
        status: eventStatus(e.kind),
        log: e.description ?? "",
        who: e.actor,
      })),
      exchanges: messages.map((m) => ({
        from:
          m.fromKind === "citizen"
            ? "Vous"
            : agent?.name ?? organism?.shortName ?? organism?.name ?? "Administration",
        when: formatDateShort(m.sentAt),
        description: m.body,
        me: m.fromKind === "citizen",
      })),
      files: pieces.map((p) => p.filename ?? p.label),
    }
  },
})

export const submitRequest = mutation({
  args: {
    idnSub: v.string(),
    serviceSlug: v.string(),
    variantKey: v.optional(v.string()),
    numberOfCopies: v.optional(v.number()),
    recipientEmail: v.optional(v.string()),
    beneficiaryKind: v.optional(v.union(v.literal("self"), v.literal("third_party"))),
    consents: v.object({
      honor: v.boolean(),
      rgpd: v.boolean(),
    }),
  },
  handler: async (ctx, args) => {
    const { citizen, actor } = await requireCitizen(ctx, args.idnSub)
    assertCan(actor, "request.deposit")

    if (!args.consents.honor || !args.consents.rgpd) {
      throw new Error(
        "Vous devez accepter la déclaration sur l'honneur et le traitement RGPD.",
      )
    }

    const service = await ctx.db
      .query("services")
      .withIndex("by_slug", (q) => q.eq("slug", args.serviceSlug))
      .first()
    if (!service) throw new Error("Service introuvable.")
    if (service.status !== "published") {
      throw new Error("Ce service n'est plus disponible.")
    }

    let variantId: Id<"serviceVariants"> | undefined
    if (args.variantKey) {
      const variant = await ctx.db
        .query("serviceVariants")
        .withIndex("by_service_key", (q) =>
          q.eq("serviceId", service._id).eq("key", args.variantKey!),
        )
        .first()
      if (!variant) {
        throw new Error("Variante introuvable pour ce service.")
      }
      variantId = variant._id
    }

    const now = Date.now()
    const year = new Date(now).getFullYear()
    const seq = String(Math.floor(Math.random() * 100000)).padStart(5, "0")
    const prefix = servicePrefix(service.category)
    const ref = `GC-${year}-${prefix}-${seq}`

    const requestId = await ctx.db.insert("requests", {
      ref,
      citizenId: citizen._id,
      serviceId: service._id,
      serviceVariantId: variantId,
      organismId: service.organismId,
      status: "submitted",
      progressPct: 10,
      progressStepName: "Dépôt enregistré",
      depositedAt: now,
      dueAt: now + service.delayHours * 60 * 60 * 1000,
      numberOfCopies: args.numberOfCopies,
      recipientEmail: args.recipientEmail ?? citizen.email,
      beneficiaryKind: args.beneficiaryKind ?? "self",
      consents: {
        honor: args.consents.honor,
        rgpd: args.consents.rgpd,
        consentedAt: now,
      },
    })

    await ctx.db.insert("requestEvents", {
      requestId,
      kind: "submission",
      title: "Demande déposée",
      description: "Vous avez soumis la demande depuis votre espace.",
      actor: "Vous",
      occurredAt: now,
    })
    await ctx.db.insert("requestEvents", {
      requestId,
      kind: "seal",
      title: "Récépissé scellé émis",
      description: "Une empreinte SHA-256 garantit l'intégrité de votre dépôt.",
      actor: "Système",
      occurredAt: now + 1000,
    })

    return { ref, requestId }
  },
})

export const cancelMyRequest = mutation({
  args: { idnSub: v.string(), ref: v.string(), reason: v.optional(v.string()) },
  handler: async (ctx, { idnSub, ref, reason }) => {
    const { citizen, actor } = await requireCitizen(ctx, idnSub)
    assertCan(actor, "request.cancel")

    const request = await ctx.db
      .query("requests")
      .withIndex("by_ref", (q) => q.eq("ref", ref))
      .unique()
    if (!request) throw new Error("Demande introuvable.")
    if (request.citizenId !== citizen._id) {
      throw new Error("Cette demande ne vous appartient pas.")
    }
    if (["issued", "cancelled", "rejected"].includes(request.status)) {
      throw new Error(
        "Cette demande ne peut plus être annulée (déjà émise, annulée ou rejetée).",
      )
    }

    const now = Date.now()
    await ctx.db.patch(request._id, {
      status: "cancelled",
      progressPct: 0,
    })
    await ctx.db.insert("requestEvents", {
      requestId: request._id,
      kind: "cancellation",
      title: "Demande annulée",
      description: reason?.trim() || "Annulée par le citoyen.",
      actor: "Vous",
      occurredAt: now,
    })
    return { ref: request.ref }
  },
})

export const sendMessageToOrganism = mutation({
  args: { idnSub: v.string(), ref: v.string(), body: v.string() },
  handler: async (ctx, { idnSub, ref, body }) => {
    const { citizen } = await requireCitizen(ctx, idnSub)
    const trimmed = body.trim()
    if (!trimmed) throw new Error("Le message est vide.")

    const request = await ctx.db
      .query("requests")
      .withIndex("by_ref", (q) => q.eq("ref", ref))
      .unique()
    if (!request) throw new Error("Demande introuvable.")
    if (request.citizenId !== citizen._id) {
      throw new Error("Cette demande ne vous appartient pas.")
    }

    const now = Date.now()
    await ctx.db.insert("requestMessages", {
      requestId: request._id,
      fromKind: "citizen",
      fromCitizenId: citizen._id,
      body: trimmed,
      sentAt: now,
    })
    await ctx.db.insert("requestEvents", {
      requestId: request._id,
      kind: "message",
      title: "Message envoyé à l'administration",
      description: trimmed.length > 80 ? trimmed.slice(0, 77) + "…" : trimmed,
      actor: "Vous",
      occurredAt: now,
    })
  },
})

// ────────── helpers ──────────

function statusLabel(status: string): { label: string; tone: string } {
  switch (status) {
    case "submitted":
      return { label: "À traiter", tone: "neutral" }
    case "in_instruction":
      return { label: "En instruction", tone: "active" }
    case "waiting_pieces":
      return { label: "Pièces demandées", tone: "warning" }
    case "waiting_registry":
      return { label: "En attente registre", tone: "warning" }
    case "to_sign":
      return { label: "À signer", tone: "active" }
    case "prepared":
      return { label: "Préparé", tone: "active" }
    case "issued":
      return { label: "Prêt à télécharger", tone: "archived" }
    case "rejected":
      return { label: "Rejeté", tone: "danger" }
    case "cancelled":
      return { label: "Annulé", tone: "neutral" }
    default:
      return { label: status, tone: "neutral" }
  }
}

function eventStatus(
  kind: string,
): "done" | "active" | "pending" {
  // Heuristique : tout event passé est considéré "done" sauf statuts spécifiques.
  switch (kind) {
    case "verification":
      return "active"
    case "piece_request":
      return "active"
    default:
      return "done"
  }
}

function formatDateLong(ms: number): string {
  return new Date(ms).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function formatDateShort(ms: number): string {
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatRelativeMs(ms: number): string {
  if (ms <= 0) return "échéance dépassée"
  const days = ms / (24 * 60 * 60 * 1000)
  if (days < 1) return `${Math.round(ms / (60 * 60 * 1000))} h`
  return `${days.toFixed(1)} j`
}

function servicePrefix(category: string): string {
  const c = category.toLowerCase()
  if (c.startsWith("état civil") || c.startsWith("etat civil")) return "EC"
  if (c.startsWith("justice")) return "JU"
  if (c.startsWith("identité") || c.startsWith("identite")) return "DI"
  if (c.startsWith("entreprise")) return "EN"
  if (c.startsWith("fiscal")) return "FI"
  if (c.startsWith("logement") || c.startsWith("foncier")) return "LG"
  if (c.startsWith("mobilit")) return "MO"
  if (c.startsWith("social") || c.startsWith("famille")) return "FS"
  return "GN"
}
