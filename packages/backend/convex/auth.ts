import { v } from "convex/values"
import { mutation, query, type QueryCtx } from "./_generated/server"

/**
 * Auth simulée — faux IdP "Identité numérique gabonaise" (NIP).
 *
 * Pas de mot de passe, pas de challenge cryptographique : on vérifie juste que
 * le NIP correspond à un agent enregistré. Suffisant pour la démo back-office,
 * à remplacer par un vrai OAuth/OIDC quand l'IdP gabonais sera connecté.
 */

const SESSION_TTL_MS = 1000 * 60 * 60 * 12 // 12 heures

const generateToken = () => {
  // Token court non cryptographique — assez aléatoire pour la démo.
  return (
    crypto.randomUUID() +
    "-" +
    Math.random().toString(36).slice(2, 10)
  )
}

/** Se connecter avec un NIP — renvoie un session token à stocker en cookie. */
export const signInWithNip = mutation({
  args: { nip: v.string() },
  handler: async (ctx, { nip }) => {
    const normalized = nip.replace(/\s+/g, "")
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_nip", (q) => q.eq("nip", normalized))
      .unique()

    if (!agent) {
      throw new Error(
        "NIP inconnu — aucun agent associé à ce numéro d'identité.",
      )
    }

    const token = generateToken()
    const now = Date.now()
    await ctx.db.insert("authSessions", {
      token,
      agentId: agent._id,
      issuedAt: now,
      expiresAt: now + SESSION_TTL_MS,
    })

    return { token, expiresAt: now + SESSION_TTL_MS }
  },
})

/** Invalider la session courante (sign-out). */
export const signOut = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query("authSessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique()
    if (session) {
      await ctx.db.delete(session._id)
    }
  },
})

/** Récupère l'agent connecté + son organisme à partir d'un token. */
export const currentAgent = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, { token }) => {
    if (!token) return null
    const session = await ctx.db
      .query("authSessions")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique()
    if (!session) return null
    if (session.expiresAt < Date.now()) return null

    return getAgentProfile(ctx, session.agentId)
  },
})

/** Helper interne — non exposé en API publique. */
export const getAgentProfile = async (
  ctx: QueryCtx,
  agentId: import("./_generated/dataModel").Id<"agents">,
) => {
  const agent = await ctx.db.get(agentId)
  if (!agent) return null
  const organism = await ctx.db.get(agent.organismId)
  return {
    _id: agent._id,
    name: agent.name,
    email: agent.email,
    nip: agent.nip,
    role: agent.role,
    organism: organism && {
      _id: organism._id,
      name: organism.name,
      shortName: organism.shortName,
      category: organism.category,
    },
  }
}

/** Helper utilisé par les autres queries/mutations pour exiger l'authentification. */
export const requireAgent = async (ctx: QueryCtx, token: string | undefined) => {
  if (!token) throw new Error("Authentification requise.")
  const session = await ctx.db
    .query("authSessions")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique()
  if (!session || session.expiresAt < Date.now()) {
    throw new Error("Session expirée — reconnectez-vous.")
  }
  const agent = await ctx.db.get(session.agentId)
  if (!agent) throw new Error("Compte agent introuvable.")
  return agent
}
