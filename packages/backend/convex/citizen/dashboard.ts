import { v } from "convex/values"
import { query } from "../_generated/server"
import { requireCitizen } from "./auth"

/**
 * Dashboard citoyen (C2) — stats + mes demandes + recommandations + messages.
 * Auth : requiert un sub IDN provisionné.
 */
const DAY_MS = 24 * 60 * 60 * 1000

export const getDashboard = query({
  args: { idnSub: v.string() },
  handler: async (ctx, { idnSub }) => {
    const { citizen } = await requireCitizen(ctx, idnSub)

    // Mes demandes (toutes, triées récentes en premier)
    const requests = await ctx.db
      .query("requests")
      .withIndex("by_citizen", (q) => q.eq("citizenId", citizen._id))
      .collect()
    requests.sort((a, b) => b.depositedAt - a.depositedAt)

    const services = await Promise.all(
      requests.map((r) => ctx.db.get(r.serviceId)),
    )
    const orgs = await Promise.all(requests.map((r) => ctx.db.get(r.organismId)))

    const requestRows = requests.map((r, i) => {
      const service = services[i]
      const org = orgs[i]
      const variant = r.serviceVariantId ? "" : ""
      const title = service
        ? variant
          ? `${service.title} · ${variant}`
          : service.title
        : "Service inconnu"
      const { label, tone } = statusLabel(r.status)
      return {
        id: r._id,
        ref: r.ref,
        title,
        org: org?.shortName ?? org?.name ?? "—",
        depositedAt: formatDate(r.depositedAt),
        depositedAtMs: r.depositedAt,
        status: label,
        tone,
        progress: r.progressPct,
      }
    })

    // KPI
    const IN_PROGRESS = new Set([
      "in_instruction",
      "waiting_pieces",
      "waiting_registry",
      "prepared",
      "to_sign",
      "submitted",
    ])
    const inProgress = requests.filter((r) => IN_PROGRESS.has(r.status)).length

    // Documents reçus = documents du citoyen
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_citizen", (q) => q.eq("citizenId", citizen._id))
      .collect()
    const documentsReceived = documents.length

    // Recommandations actives
    const recos = await ctx.db
      .query("recommendations")
      .withIndex("by_citizen_active", (q) =>
        q.eq("citizenId", citizen._id).eq("dismissedAt", undefined),
      )
      .collect()
    const recoServices = await Promise.all(
      recos.map((r) => ctx.db.get(r.serviceId)),
    )
    const recommendations = recos.map((r, i) => {
      const svc = recoServices[i]
      return {
        id: r._id,
        title:
          r.reason === "expiring_document"
            ? `Renouveler : ${svc?.title ?? "votre document"}`
            : svc?.title ?? r.description,
        description: r.description,
        icon: svc?.title?.toLowerCase().includes("cni")
          ? "fingerprint"
          : svc?.title?.toLowerCase().includes("naissance")
            ? "user"
            : "lightBulb",
        urgent: r.urgent,
      }
    })

    // Messages : notifications destinées au citoyen, triées récentes
    const notifications = await ctx.db
      .query("notifications")
      .collect()
    const myNotifs = notifications
      .filter(
        (n) => n.recipientKind === "citizen" && n.recipientId === citizen._id,
      )
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5)
    const messages = myNotifs.map((n) => ({
      id: n._id,
      who:
        n.kind === "request_status_change" ||
        n.kind === "piece_requested" ||
        n.kind === "document_ready"
          ? "Administration"
          : "Gabon Connect",
      when: relativeShort(n.createdAt, Date.now()),
      title: n.title,
      description: n.body,
      unread: n.readAt === undefined,
    }))

    const unreadCount = myNotifs.filter((n) => n.readAt === undefined).length

    // Délai moyen sur demandes traitées (rough)
    const issued = requests.filter((r) => r.status === "issued" && r.issuedAt)
    const avgDelayMs = issued.length
      ? issued.reduce(
          (s, r) => s + ((r.issuedAt ?? 0) - r.depositedAt),
          0,
        ) / issued.length
      : 0
    const averageDelay = avgDelayMs > 0 ? formatRelativeMs(avgDelayMs) : "—"

    return {
      profile: {
        name: citizen.name,
        email: citizen.email ?? "",
        nip: citizen.nip,
        phone: citizen.phone ?? "",
        address: citizen.address ?? "",
        birthDate: citizen.birthDate ?? "",
      },
      stats: {
        inProgress,
        documentsReceived,
        averageDelay,
        delayDelta: { value: "−14 %", tone: "success" as const },
        notifications: myNotifs.length,
        notificationsHint:
          unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}` : undefined,
      },
      requests: requestRows,
      recommendations,
      messages,
    }
  },
})

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

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function relativeShort(ms: number, ref: number): string {
  const diff = Math.max(0, ref - ms)
  const min = Math.round(diff / 60_000)
  if (min < 1) return "à l'instant"
  if (min < 60) return `il y a ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `il y a ${h} h`
  const d = Math.round(h / 24)
  if (d === 1) return "hier"
  return `il y a ${d} j`
}

function formatRelativeMs(ms: number): string {
  const days = ms / DAY_MS
  if (days < 1) return `${Math.round(ms / (60 * 60 * 1000))} h`
  return `${days.toFixed(1)} j`
}
