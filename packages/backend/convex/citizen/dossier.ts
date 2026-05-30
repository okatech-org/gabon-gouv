import { query } from "../_generated/server"
import { requireCitizen } from "./auth"

/**
 * Vue 360° du dossier administratif citoyen — agrège tout ce qui le
 * concerne en base : profil état civil, filiations déclarées,
 * actes de registre source, habilitations actives d'organismes, et
 * récap volumétrique des demandes & documents.
 */
export const getMyDossier = query({
  args: {},
  handler: async (ctx) => {
    const { citizen } = await requireCitizen(ctx)

    // Filiations déclarées
    const relations = await ctx.db
      .query("citizenRelations")
      .withIndex("by_citizen", (q) => q.eq("citizenId", citizen._id))
      .collect()
    const relationsView = relations.map((r) => ({
      id: r._id,
      kind: relationLabel(r.kind),
      rawKind: r.kind,
      displayedName: r.displayedName,
      profession: r.profession ?? "—",
      declaredAt: r.declaredAt ?? "—",
    }))

    // Actes de registre source liés (naissance, mariage, décès…)
    const registry = await ctx.db
      .query("registryEntries")
      .collect()
    const myRegistry = registry
      .filter((r) => r.linkedCitizenId === citizen._id)
      .map((r) => ({
        id: r._id,
        kind: registryKindLabel(r.kind),
        rawKind: r.kind,
        registerCode: r.registerCode,
        actNumber: r.actNumber,
        commune: r.commune,
        year: r.year,
        accuracyLevel: r.accuracyLevel,
        verifiedAt: r.verifiedAt
          ? formatDateLong(r.verifiedAt)
          : "non vérifié",
      }))

    // Habilitations actives sur mon dossier (cross-org)
    const grants = await ctx.db
      .query("dossierAccessGrants")
      .withIndex("by_citizen", (q) => q.eq("citizenId", citizen._id))
      .collect()
    const now = Date.now()
    const grantOrgs = await Promise.all(
      grants.map((g) => ctx.db.get(g.organismId)),
    )
    const grantsView = grants
      .map((g, i) => ({
        id: g._id,
        organism: grantOrgs[i]?.name ?? "—",
        organismShort: grantOrgs[i]?.shortName ?? grantOrgs[i]?.name ?? "—",
        level: levelLabel(g.level),
        rawLevel: g.level,
        scope: g.scope ?? "Dossier complet",
        grantedAt: formatDateLong(g.grantedAt),
        expiresAt: g.expiresAt ? formatDateLong(g.expiresAt) : null,
        active: !g.revokedAt && (!g.expiresAt || g.expiresAt > now),
      }))
      .sort((a, b) =>
        a.active === b.active ? 0 : a.active ? -1 : 1,
      )

    // Compteurs documents / demandes
    const [documents, requests] = await Promise.all([
      ctx.db
        .query("documents")
        .withIndex("by_citizen", (q) => q.eq("citizenId", citizen._id))
        .collect(),
      ctx.db
        .query("requests")
        .withIndex("by_citizen", (q) => q.eq("citizenId", citizen._id))
        .collect(),
    ])

    return {
      profile: {
        name: citizen.name,
        nip: citizen.nip,
        birthDate: citizen.birthDate ?? "—",
        birthPlace: citizen.birthPlace ?? "—",
        sex:
          citizen.sex === "F"
            ? "Féminin"
            : citizen.sex === "M"
              ? "Masculin"
              : "—",
        civilStatus: civilStatusLabel(citizen.civilStatus),
        nationality: citizen.nationality ?? "—",
        address: citizen.address ?? "—",
        identityVerified: citizen.identityVerified,
        identityVerifiedAt: citizen.identityVerifiedAt
          ? formatDateLong(citizen.identityVerifiedAt)
          : null,
      },
      relations: relationsView,
      registryEntries: myRegistry,
      grants: grantsView,
      counts: {
        documents: documents.length,
        requests: requests.length,
        activeGrants: grantsView.filter((g) => g.active).length,
      },
    }
  },
})

// ────────── helpers ──────────

function relationLabel(kind: string): string {
  switch (kind) {
    case "father":
      return "Père"
    case "mother":
      return "Mère"
    case "spouse":
      return "Conjoint·e"
    case "child":
      return "Enfant"
    case "sibling":
      return "Frère / sœur"
    case "legal_guardian":
      return "Tuteur légal"
    default:
      return kind
  }
}

function registryKindLabel(kind: string): string {
  switch (kind) {
    case "birth":
      return "Acte de naissance"
    case "marriage":
      return "Acte de mariage"
    case "death":
      return "Acte de décès"
    case "adoption":
      return "Acte d'adoption"
    case "recognition":
      return "Reconnaissance"
    default:
      return kind
  }
}

function levelLabel(level: string): string {
  switch (level) {
    case "read":
      return "Lecture"
    case "read_write":
      return "Lecture & écriture"
    case "read_subset":
      return "Lecture partielle"
    default:
      return level
  }
}

function civilStatusLabel(status: string | undefined): string {
  switch (status) {
    case "single":
      return "Célibataire"
    case "married":
      return "Marié·e"
    case "divorced":
      return "Divorcé·e"
    case "widowed":
      return "Veuf / veuve"
    default:
      return "—"
  }
}

function formatDateLong(ms: number): string {
  return new Date(ms).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}
