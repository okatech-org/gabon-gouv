import type { MutationCtx, QueryCtx } from "../_generated/server"
import type { Doc } from "../_generated/dataModel"
import { actorFromCitizen, type Actor } from "../lib/permissions"

/**
 * Identité du citoyen courant, dérivée côté serveur (cf. CLAUDE.md règle 2 —
 * jamais d'identité en argument).
 *
 * L'auth citoyen passe par Better Auth dans Convex (`convex/citizenAuth.ts`).
 * L'`idnSub` (le `sub` OIDC identité.ga) est exposé comme claim `idnSub` du JWT
 * Convex (cf. `definePayload`), et stocké dans `user.userId`. On le lit via
 * `getUserIdentity()` ; repli sur `subject` (cas des tests / jetons sans claim).
 *
 * Renvoie `undefined` si la requête n'est pas authentifiée.
 */
async function currentIdnSub(
  ctx: QueryCtx | MutationCtx,
): Promise<string | undefined> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return undefined
  const idnSub = (identity as { idnSub?: string }).idnSub
  return idnSub ?? identity.subject
}

/**
 * Résolution du citoyen courant depuis l'identité authentifiée (JWT).
 *
 * Policy : strict, pas d'auto-création. Si aucune ligne `citizens` ne porte
 * cet `idnSub`, on jette une erreur "compte non provisionné" — l'app appelante
 * (citizen-web) catch ce cas et affiche un écran d'attente de provisionning.
 *
 * Le mapping `sub → citizen` est manuel pour l'instant (renseigné au seed
 * ou via une mutation admin dédiée). Voir le README citizen-web.
 */
export async function requireCitizen(
  ctx: QueryCtx | MutationCtx,
): Promise<{ citizen: Doc<"citizens">; actor: Actor }> {
  const idnSub = await currentIdnSub(ctx)
  if (!idnSub) {
    throw new Error("Authentification requise — identité non vérifiée.")
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
 * Variante lecture seule : renvoie `null` si non authentifié ou non
 * provisionné au lieu de throw. Utile pour les pages publiques qui veulent
 * afficher le nom si connecté, sans casser si le compte n'existe pas encore.
 */
export async function tryGetCitizen(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"citizens"> | null> {
  const idnSub = await currentIdnSub(ctx)
  if (!idnSub) return null
  return ctx.db
    .query("citizens")
    .withIndex("by_idn_sub", (q) => q.eq("idnSub", idnSub))
    .unique()
}
