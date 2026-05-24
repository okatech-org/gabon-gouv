import { v } from "convex/values"
import type { MutationCtx, QueryCtx } from "../_generated/server"
import { mutation } from "../lib/triggers"
import type { Doc } from "../_generated/dataModel"
import { actorFromCitizen, type Actor } from "../lib/permissions"

/**
 * Résolution du citoyen courant depuis le `sub` de l'IDP (citoyen.ga).
 *
 * Policy : strict, pas d'auto-création. Si aucune ligne `citizens` ne porte
 * ce `idnSub`, on jette une erreur "compte non provisionné" — l'app appelante
 * (citizen-web) catch ce cas et affiche un écran d'attente de provisionning.
 *
 * Le mapping `sub → citizen` est manuel pour l'instant (renseigné au seed
 * ou via une mutation admin dédiée). Voir le README citizen-web.
 */
export async function requireCitizen(
  ctx: QueryCtx | MutationCtx,
  idnSub: string | undefined,
): Promise<{ citizen: Doc<"citizens">; actor: Actor }> {
  if (!idnSub) {
    throw new Error("Authentification requise — aucun sub IDN fourni.")
  }
  const citizen = await ctx.db
    .query("citizens")
    .withIndex("by_idn_sub", (q) => q.eq("idnSub", idnSub))
    .unique()
  if (!citizen) {
    throw new Error(
      "Compte non provisionné — votre identité numérique n'est pas encore reliée à un compte citoyen Gabon Connect.",
    )
  }
  return { citizen, actor: actorFromCitizen(citizen._id) }
}

/**
 * Variante lecture seule : renvoie `null` si non provisionné au lieu de
 * throw. Utile pour les pages publiques qui veulent afficher le nom si
 * connecté, sans casser si le compte n'existe pas encore.
 */
export async function tryGetCitizen(
  ctx: QueryCtx | MutationCtx,
  idnSub: string | undefined,
): Promise<Doc<"citizens"> | null> {
  if (!idnSub) return null
  return ctx.db
    .query("citizens")
    .withIndex("by_idn_sub", (q) => q.eq("idnSub", idnSub))
    .unique()
}

const SESSION_TTL_MS = 12 * 60 * 60 * 1000 // 12 h, identique aux agents

/**
 * Connexion alternative par NIP — chemin de secours tant que l'intégration
 * OIDC identité.ga n'est pas finalisée. Lookup le citoyen par NIP, renvoie
 * son `idnSub` (et le génère si manquant) pour que les queries citoyen
 * existantes (qui prennent `idnSub`) continuent à fonctionner sans modif.
 *
 * Le résultat est stocké en cookie httpOnly côté Next.js (`gc_citizen_nip`).
 *
 * À retirer ou désactiver en prod quand IDN sera fluide.
 */
export const signInCitizenWithNip = mutation({
  args: { nip: v.string() },
  handler: async (ctx, { nip }) => {
    const normalized = nip.replace(/\s+/g, "")
    const citizen = await ctx.db
      .query("citizens")
      .withIndex("by_nip", (q) => q.eq("nip", normalized))
      .unique()
    if (!citizen) {
      throw new Error(
        "NIP inconnu — aucun citoyen associé à ce numéro d'identité.",
      )
    }

    // Si le citoyen n'a pas encore d'idnSub (cas seed minimal), on en pose
    // un synthétique stable basé sur son NIP pour que les queries continuent
    // à lookup par `by_idn_sub`.
    let idnSub = citizen.idnSub
    if (!idnSub) {
      idnSub = `nip:${normalized}`
      await ctx.db.patch(citizen._id, { idnSub })
    }

    return {
      idnSub,
      name: citizen.name,
      expiresAt: Date.now() + SESSION_TTL_MS,
    }
  },
})
