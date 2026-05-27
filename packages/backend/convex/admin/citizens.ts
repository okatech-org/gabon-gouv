import { v } from "convex/values"
import { query } from "../_generated/server"
import { requireAgent } from "../auth"
import type { Doc } from "../_generated/dataModel"

/* ---------- Dossier citoyen 360° A4 ---------- */
export const getFolder = query({
  args: { token: v.string(), nip: v.string() },
  handler: async (ctx, { token, nip }) => {
    await requireAgent(ctx, token)

    const normalized = nip.replace(/\s+/g, "")
    const citizen = await ctx.db
      .query("citizens")
      .withIndex("by_nip", (q) => q.eq("nip", normalized))
      .unique()
    if (!citizen) return null

    const requests = await ctx.db
      .query("requests")
      .withIndex("by_citizen", (q) => q.eq("citizenId", citizen._id))
      .collect()

    const timeline = await Promise.all(
      requests
        .sort((a, b) => b.depositedAt - a.depositedAt)
        .map(async (r) => {
          const organism = await ctx.db.get(r.organismId)
          const service = await ctx.db.get(r.serviceId)
          return {
            ref: r.ref,
            occurredAt: r.depositedAt,
            organism: organism?.shortName ?? organism?.name ?? "—",
            title: service ? formatService(service) : "Démarche",
            status: r.status,
          }
        }),
    )

    return {
      citizen: {
        name: citizen.name,
        nip: formatNip(citizen.nip),
        email: citizen.email,
        phone: citizen.phone,
        address: citizen.address,
        birthDate: citizen.birthDate,
        birthPlace: citizen.birthPlace,
        identityVerified: citizen.identityVerified,
        createdAt: citizen.createdAt,
        sex: citizen.sex,
      },
      stats: {
        requestsCount: requests.length,
        documentsCount: 0, // sera calculé quand documents/{ref} arrivera
      },
      timeline,
    }
  },
})

/* ---------- Liste des dossiers citoyens vus par mon organisme ---------- */
/**
 * Liste les citoyens distincts qui ont au moins une demande dans
 * l'organisme de l'agent connecté. Utilisée par la page `/dossiers`
 * (B2 — précédemment, la sidebar pointait vers un NIP hardcodé).
 */
export const listFolders = query({
  args: {
    token: v.string(),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { token, search, limit }) => {
    const me = await requireAgent(ctx, token)
    // Pas d'index by_organism simple — on agrège via by_organism_status sur
    // tous les statuts. C'est tolérable car la table est borneée par org.
    const allRequests = await ctx.db.query("requests").collect()
    const requests = allRequests.filter((r) => r.organismId === me.organismId)

    // Agréger par citoyen
    const byCitizen = new Map<
      string,
      {
        citizenId: string
        count: number
        lastAt: number
        lastRef: string
        lastStatus: string
      }
    >()
    for (const r of requests) {
      const cur = byCitizen.get(String(r.citizenId))
      if (!cur || r.depositedAt > cur.lastAt) {
        byCitizen.set(String(r.citizenId), {
          citizenId: String(r.citizenId),
          count: (cur?.count ?? 0) + 1,
          lastAt: r.depositedAt,
          lastRef: r.ref,
          lastStatus: r.status,
        })
      } else if (cur) {
        cur.count++
      }
    }

    // Charger les citoyens + filtrer search
    const term = search?.trim().toLowerCase()
    const rows = await Promise.all(
      [...byCitizen.values()].map(async (agg) => {
        const c = await ctx.db.get(
          agg.citizenId as Parameters<typeof ctx.db.get>[0],
        )
        if (!c) return null
        // c est un Doc<unknown> faute de garantie typage côté get(string)
        // — on cast en Doc<"citizens"> pour la suite
        const citizen = c as Doc<"citizens">
        return {
          nip: citizen.nip,
          nipFormatted: formatNip(citizen.nip),
          name: citizen.name,
          email: citizen.email ?? null,
          identityVerified: citizen.identityVerified,
          requestsCount: agg.count,
          lastInteractionAt: agg.lastAt,
          lastRef: agg.lastRef,
          lastStatus: agg.lastStatus,
        }
      }),
    )
    const filtered = rows
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .filter((r) => {
        if (!term) return true
        return (
          r.name.toLowerCase().includes(term) ||
          r.nip.includes(term) ||
          (r.email?.toLowerCase().includes(term) ?? false)
        )
      })
      .sort((a, b) => b.lastInteractionAt - a.lastInteractionAt)

    return {
      total: filtered.length,
      rows: filtered.slice(0, limit ?? 100),
    }
  },
})

function formatService(service: Doc<"services">) {
  return service.variant ? `${service.title} · ${service.variant}` : service.title
}

function formatNip(nip: string) {
  // 184127600504 → 184 12 76 005 042 (12 chiffres)
  if (nip.length === 12) {
    return `${nip.slice(0, 3)} ${nip.slice(3, 5)} ${nip.slice(5, 7)} ${nip.slice(7, 10)} ${nip.slice(10)}`
  }
  return nip
}
