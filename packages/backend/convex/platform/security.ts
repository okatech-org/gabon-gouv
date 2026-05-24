import { v } from "convex/values"
import { query } from "../_generated/server"
import { requirePlatformAdmin } from "./auth"

/**
 * Page Sécurité & audit (P + ADR-0012).
 *
 * Expose :
 *   - Le journal probant `auditLog` (immutable, append-only) filtré
 *     par verbe / acteur / organisme / fenêtre temporelle.
 *   - Les `auditDailySeals` (chaîne de hashes quotidienne).
 *
 * Note : les payloads sensibles d'auditLog ne sont PAS retournés en
 * intégralité — seulement l'empreinte (sha256) + champs résumés.
 */
const DEFAULT_LIMIT = 100

export const listAuditEvents = query({
  args: {
    token: v.string(),
    verb: v.optional(v.string()),
    organismId: v.optional(v.id("organisms")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { token, verb, organismId, limit = DEFAULT_LIMIT }) => {
    await requirePlatformAdmin(ctx, token)

    let entries
    if (organismId) {
      entries = await ctx.db
        .query("auditLog")
        .withIndex("by_organism_time", (q) => q.eq("organismId", organismId))
        .order("desc")
        .take(limit * 3)
    } else {
      entries = await ctx.db.query("auditLog").order("desc").take(limit * 3)
    }

    let filtered = entries
    if (verb) filtered = filtered.filter((e) => e.verb === verb)
    filtered = filtered.slice(0, limit)

    // Hydrate acteurs (agent / organisme) pour affichage
    const agentIds = new Set(
      filtered.map((e) => e.actorAgentId).filter(Boolean),
    )
    const orgIds = new Set(filtered.map((e) => e.organismId).filter(Boolean))
    const [agents, orgs] = await Promise.all([
      Promise.all(
        [...agentIds].map((id) =>
          id ? ctx.db.get(id) : Promise.resolve(null),
        ),
      ),
      Promise.all(
        [...orgIds].map((id) => (id ? ctx.db.get(id) : Promise.resolve(null))),
      ),
    ])
    const agentBy = new Map(
      agents.filter(Boolean).map((a) => [a!._id, a!] as const),
    )
    const orgBy = new Map(
      orgs.filter(Boolean).map((o) => [o!._id, o!] as const),
    )

    const view = filtered.map((e) => {
      const agent = e.actorAgentId ? agentBy.get(e.actorAgentId) : null
      const org = e.organismId ? orgBy.get(e.organismId) : null
      return {
        id: e._id,
        verb: e.verb,
        verbLabel: verbLabel(e.verb),
        actorKind: e.actorKind,
        actorName:
          agent?.name ??
          (e.actorKind === "citizen"
            ? "Citoyen·ne"
            : e.actorKind === "system"
              ? "Système"
              : "—"),
        actorRole: agent?.role ?? null,
        organism: org?.shortName ?? org?.name ?? null,
        subjectKind: e.subjectKind,
        subjectId: e.subjectId,
        occurredAt: e.occurredAt,
        occurredAtLabel: shortDateTime(e.occurredAt),
        occurredAtRelative: relativeShort(e.occurredAt, Date.now()),
        payloadHash: e.payloadHash.slice(0, 12) + "…",
        sealed: !!e.dailySealId,
      }
    })

    // Liste de verbes distincts pour le filtre
    const allVerbs = [...new Set(entries.map((e) => e.verb))].sort()
    return { events: view, verbs: allVerbs }
  },
})

export const listDailySeals = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requirePlatformAdmin(ctx, token)
    const seals = await ctx.db.query("auditDailySeals").order("desc").take(60)
    return seals.map((s) => ({
      id: s._id,
      day: s.day,
      entryCount: s.entryCount,
      rangeStart: s.rangeStart,
      rangeEnd: s.rangeEnd,
      sha256Short: s.sha256Chain.slice(0, 10) + "…" + s.sha256Chain.slice(-6),
      sealedAt: s.sealedAt,
      sealedAtLabel: shortDateTime(s.sealedAt),
      qualifiedTimestamp: s.qualifiedTimestamp ?? null,
    }))
  },
})

function verbLabel(verb: string): string {
  // Locale FR — mappés sur les principaux verbes (cf. lib/enums:AUDIT_VERBS).
  const map: Record<string, string> = {
    "request.submit": "Demande déposée",
    "request.assign": "Demande assignée",
    "request.transfer": "Demande transférée",
    "request.cancel": "Demande annulée",
    "request.reject": "Demande rejetée",
    "piece.upload": "Pièce téléversée",
    "piece.validate": "Pièce validée",
    "piece.reject": "Pièce rejetée",
    "verification.run": "Vérification automatique",
    "registry.match_confirmed": "Acte source confirmé",
    "document.prepare": "Document préparé",
    "document.sign": "Document signé",
    "document.issue": "Document émis",
    "document.revoke": "Document révoqué",
    "correspondence.send": "Courrier envoyé",
    "correspondence.reply": "Courrier répondu",
    "archive.verse": "Versement SAE",
    "archive.eliminate": "Élimination SAE",
    "organism.register": "Organisme enregistré",
    "organism.activate": "Organisme activé",
    "organism.suspend": "Organisme suspendu",
    "service.publish": "Service publié",
    "service.archive": "Service archivé",
    "convention.sign": "Convention signée",
    "access.grant": "Habilitation accordée",
    "access.revoke": "Habilitation révoquée",
    "agent.create": "Agent créé",
    "agent.role_change": "Rôle agent modifié",
    "auth.login": "Connexion",
    "auth.logout": "Déconnexion",
  }
  return map[verb] ?? verb
}

function shortDateTime(ms: number): string {
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function relativeShort(ms: number, ref: number): string {
  const diff = Math.max(0, ref - ms)
  const min = Math.round(diff / 60_000)
  if (min < 1) return "à l'instant"
  if (min < 60) return `il y a ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `il y a ${h} h`
  const d = Math.round(h / 24)
  return `il y a ${d} j`
}
