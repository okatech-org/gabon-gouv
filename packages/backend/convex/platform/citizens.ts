import { v } from "convex/values"
import { query } from "../_generated/server"
import { requirePlatformAdmin } from "./auth"
import { aggCitizensGlobal } from "../aggregates"

/**
 * Vue agrégée des citoyens enregistrés (page /citoyens côté console).
 *
 * ⚠️ Données sensibles (NIP, état civil, contact). L'accès passe par
 * `requirePlatformAdmin` qui vérifie `assertCan("platform.read_supervision")`.
 * Tout audit d'accès doit être loggué côté `auditLog` (ADR-0012) — TODO.
 */
export const listCitizens = query({
  args: {
    token: v.string(),
    search: v.optional(v.string()),
    provinceCode: v.optional(v.string()),
    verifiedOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (
    ctx,
    { token, search, provinceCode, verifiedOnly, limit = 100 },
  ) => {
    await requirePlatformAdmin(ctx, token)
    const all = await ctx.db.query("citizens").collect()

    // Filtres in-memory (volumétrie démo). À paginer côté Convex pour la prod.
    let filtered = all
    if (search && search.trim().length > 0) {
      const q = search.trim().toLowerCase()
      filtered = filtered.filter(
        (c) =>
          c.nip.includes(q) ||
          c.name.toLowerCase().includes(q) ||
          (c.email?.toLowerCase().includes(q) ?? false),
      )
    }
    if (provinceCode) {
      filtered = filtered.filter(
        (c) =>
          c.addressProvinceCode === provinceCode ||
          c.birthProvinceCode === provinceCode,
      )
    }
    if (verifiedOnly) {
      filtered = filtered.filter((c) => c.identityVerified)
    }
    filtered.sort((a, b) => b.createdAt - a.createdAt)
    const page = filtered.slice(0, limit)

    // Hydrate compteurs demandes / documents
    const enriched = await Promise.all(
      page.map(async (c) => {
        const requests = await ctx.db
          .query("requests")
          .withIndex("by_citizen", (q) => q.eq("citizenId", c._id))
          .collect()
        const documents = await ctx.db
          .query("documents")
          .withIndex("by_citizen", (q) => q.eq("citizenId", c._id))
          .collect()
        return {
          id: c._id,
          nip: c.nip,
          name: c.name,
          email: c.email ?? null,
          birthDate: c.birthDate ?? null,
          birthProvinceCode: c.birthProvinceCode ?? null,
          addressProvinceCode: c.addressProvinceCode ?? null,
          identityVerified: c.identityVerified,
          identityVerifiedAt: c.identityVerifiedAt ?? null,
          createdAt: c.createdAt,
          createdAtLabel: formatDateLong(c.createdAt),
          requests: requests.length,
          documents: documents.length,
        }
      }),
    )

    // Stats globales (via agrégat)
    const totalAll = await aggCitizensGlobal.count(ctx)
    const totalVerified = all.filter((c) => c.identityVerified).length

    return {
      citizens: enriched,
      total: totalAll,
      totalVerified,
      filteredCount: filtered.length,
      paged: enriched.length < filtered.length,
    }
  },
})

function formatDateLong(ms: number): string {
  return new Date(ms).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}
