import type { MutationCtx, QueryCtx } from "../_generated/server"
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
