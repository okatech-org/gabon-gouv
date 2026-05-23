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
