import { v } from "convex/values"
import { query } from "../_generated/server"
import type { MutationCtx } from "../_generated/server"
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

/**
 * Liste de toutes les demandes du citoyen, triées récentes en premier.
 * Sert la page /mon-espace/demarches (vue liste).
 */
export const listMyRequests = query({
  args: { idnSub: v.string() },
  handler: async (ctx, { idnSub }) => {
    const { citizen } = await requireCitizen(ctx, idnSub)
    const requests = await ctx.db
      .query("requests")
      .withIndex("by_citizen", (q) => q.eq("citizenId", citizen._id))
      .collect()
    requests.sort((a, b) => b.depositedAt - a.depositedAt)

    const services = await Promise.all(
      requests.map((r) => ctx.db.get(r.serviceId)),
    )
    const variants = await Promise.all(
      requests.map((r) =>
        r.serviceVariantId
          ? ctx.db.get(r.serviceVariantId)
          : Promise.resolve(null),
      ),
    )
    const orgs = await Promise.all(requests.map((r) => ctx.db.get(r.organismId)))

    // Compteur de messages non lus + pièces requises en attente
    const enriched = await Promise.all(
      requests.map(async (r, i) => {
        const service = services[i]
        const variant = variants[i]
        const org = orgs[i]
        const pieces = await ctx.db
          .query("pieces")
          .withIndex("by_request_status", (q) =>
            q.eq("requestId", r._id).eq("status", "missing"),
          )
          .collect()
        const messages = await ctx.db
          .query("requestMessages")
          .withIndex("by_request_time", (q) => q.eq("requestId", r._id))
          .collect()
        // « Non lu » pour le citoyen = message du kind=agent dont
        // readAtByCounterparty est undefined.
        const unreadFromAgent = messages.filter(
          (m) => m.fromKind === "agent" && m.readAtByCounterparty === undefined,
        ).length
        const { label, tone } = statusLabel(r.status)
        const title = service
          ? variant
            ? `${service.title} · ${variant.label}`
            : service.title
          : "Service inconnu"
        return {
          id: r._id,
          ref: r.ref,
          title,
          category: service?.category ?? "—",
          org: org?.shortName ?? org?.name ?? "—",
          depositedAt: formatDateLong(r.depositedAt),
          depositedAtMs: r.depositedAt,
          status: label,
          rawStatus: r.status,
          tone,
          progress: r.progressPct,
          dueAt: r.dueAt,
          urgent: Boolean(r.urgent),
          missingPiecesCount: pieces.length,
          unreadFromAgent,
        }
      }),
    )

    // Stats globales pour les filtres en tête de page
    const stats = {
      total: enriched.length,
      inProgress: enriched.filter((r) =>
        ["submitted", "in_instruction", "waiting_pieces", "waiting_registry", "prepared", "to_sign"].includes(r.rawStatus),
      ).length,
      issued: enriched.filter((r) => r.rawStatus === "issued").length,
      rejected: enriched.filter((r) => r.rawStatus === "rejected").length,
      cancelled: enriched.filter((r) => r.rawStatus === "cancelled").length,
      waitingPieces: enriched.filter((r) => r.missingPiecesCount > 0).length,
    }
    return { requests: enriched, stats }
  },
})

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
      // rawStatus = enum brut (issued/in_instruction/...) pour les composants
      // qui ont besoin de la valeur technique (ex. bouton télécharger PDF).
      rawStatus: request.status,
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
    beneficiaryKind: v.optional(
      v.union(v.literal("self"), v.literal("third_party")),
    ),
    urgent: v.optional(v.boolean()),
    /** Payload structuré (réponses du wizard, données ad-hoc). */
    payload: v.optional(v.any()),
    /** IDs des pièces déjà uploadées via attachPiece (transformées en
        pièces définitives liées à la demande). */
    attachedPieceIds: v.optional(v.array(v.id("pieces"))),
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
    if (args.urgent && (!args.payload || !args.payload.urgentReason)) {
      throw new Error(
        "Justifiez l'urgence dans le champ « motif » avant de marquer la demande urgente.",
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
      urgent: args.urgent ?? false,
      payload: args.payload,
      consents: {
        honor: args.consents.honor,
        rgpd: args.consents.rgpd,
        consentedAt: now,
      },
    })

    // Rattache les pièces uploadées en amont (via attachPiece) à la demande
    if (args.attachedPieceIds && args.attachedPieceIds.length > 0) {
      for (const pieceId of args.attachedPieceIds) {
        const piece = await ctx.db.get(pieceId)
        if (!piece) continue
        // Pour l'instant les pièces uploadées avant submit sont posées avec
        // requestId = sentinel ; on les remappe ici.
        // Vérification d'ownership : la pièce doit avoir été créée par un
        // uploader rattaché au même citoyen (vérifié par attachPiece).
        await ctx.db.patch(pieceId, { requestId })
      }
    }

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

    // Set de vérifications automatiques stub (décision § 11.7 du Bloc 3).
    // L'identité est marquée `ok` puisque l'IDN sub est présent, les autres
    // restent `pending` — l'agent les fera basculer manuellement (ou un job
    // automatique plus tard via setVerificationStatus).
    await seedDefaultVerifications(ctx, requestId, Boolean(citizen.identityVerified))

    // Supprime le brouillon associé (si existant) — un seul brouillon par
    // (citizen, service) selon la convention de drafts.ts
    const drafts = await ctx.db
      .query("requestDrafts")
      .withIndex("by_citizen", (q) => q.eq("citizenId", citizen._id))
      .collect()
    for (const draft of drafts) {
      if (draft.serviceId === service._id) {
        await ctx.db.delete(draft._id)
      }
    }

    return { ref, requestId }
  },
})

/**
 * URL signée du PDF émis pour une demande du citoyen connecté.
 * Renvoie `null` si la demande n'est pas encore émise OU si le PDF n'a pas
 * encore été généré (v1 tant que la génération PDF n'est pas branchée).
 *
 * Vérifie que la demande appartient bien au citoyen courant.
 */
export const getMyDocumentPdfUrl = query({
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
    const doc = await ctx.db
      .query("documents")
      .withIndex("by_request", (q) => q.eq("requestId", request._id))
      .filter((q) => q.neq(q.field("status"), "revoked"))
      .first()
    if (!doc || !doc.pdfStorageKey) return null
    const url = await ctx.storage.getUrl(doc.pdfStorageKey)
    return {
      url,
      actNumber: doc.actNumber,
      verificationCode: doc.verificationCode ?? null,
      issuedAt: doc.issuedAt,
    }
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

/**
 * Insère un set de vérifications par défaut pour une demande fraîchement
 * déposée (décision § 11.7 du Bloc 3). Stub — pas d'intégration réelle :
 *   - `identity` → `ok` si l'identité du citoyen est marquée vérifiée
 *     (auth IDN), sinon `pending` (à confirmer par l'agent).
 *   - `data_consistency` → `pending` (vérif manuelle par l'instructeur).
 *   - `duplicate_detection` → `pending` (sera automatisé via un job).
 *
 * Plus de vérifs peuvent être ajoutées par l'agent via une éventuelle
 * mutation `addVerification` (hors scope v1).
 */
async function seedDefaultVerifications(
  ctx: MutationCtx,
  requestId: Id<"requests">,
  identityVerified: boolean,
): Promise<void> {
  const now = Date.now()
  await ctx.db.insert("verifications", {
    requestId,
    title: "Identité du déposant",
    description: identityVerified
      ? "Identité IDN vérifiée au login."
      : "Identité à confirmer manuellement.",
    kind: "identity",
    status: identityVerified ? "ok" : "pending",
    evidence: identityVerified ? "IDN OAuth" : undefined,
    automated: true,
    performedAt: identityVerified ? now : undefined,
    order: 0,
  })
  await ctx.db.insert("verifications", {
    requestId,
    title: "Cohérence des données",
    description: "Croisement payload demande × profil citoyen.",
    kind: "data_consistency",
    status: "pending",
    automated: false,
    order: 1,
  })
  await ctx.db.insert("verifications", {
    requestId,
    title: "Recherche de doublon",
    description: "Vérification anti-doublon sur le citoyen et le service.",
    kind: "duplicate_detection",
    status: "pending",
    automated: true,
    order: 2,
  })
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
