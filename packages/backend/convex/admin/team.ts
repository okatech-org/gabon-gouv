/**
 * Gestion d'équipe intra-organisme (Phase Trous B).
 *
 * Queries :
 *   - listTeamMembers : liste des agents + stats + auto-assignation
 *   - listInvitations : invitations pending/acceptées/révoquées
 *   - getInvitationByToken : public (pas d'auth), pour la page d'enrôlement
 *
 * Mutations :
 *   - inviteAgent : crée une invitation pending avec token magique 14j
 *   - revokeInvitation : invalide une invitation pending
 *   - disableAgent : désactive un agent (active=false, disabledAt)
 *   - enableAgent : réactive
 *   - changeAgentRole : modifie le rôle (avec garde "dernier admin")
 *   - acceptInvitation : public (pas d'auth), crée l'agent
 *
 * Audit : chaque mutation logge dans `teamActivities` + `auditLog` quand
 * pertinent (NF Z42-013 pour les changements de rôle).
 *
 * Garde "dernier admin_organisme" : on refuse de désactiver / changer le
 * rôle du dernier admin actif d'un organisme. Sinon plus personne ne
 * pourrait inviter ou gérer l'équipe.
 */
import { v } from "convex/values"
import { query, type MutationCtx, type QueryCtx } from "../_generated/server"
import { mutation } from "../lib/triggers"
import { requireAgent } from "../auth"
import type { Doc, Id } from "../_generated/dataModel"
import { actorFromAgent, assertCan } from "../lib/permissions"
import { agentRoleValidator, authMethodValidator } from "../lib/enums"
import { aggKeys, aggRequestsByOrgAgent } from "../aggregates"

const INVITATION_TTL_DAYS = 14
const INVITATION_TTL_MS = INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000

/* ============================================================
   Queries
   ============================================================ */

export const listTeamMembers = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const me = await requireAgent(ctx, token)
    assertCan(actorFromAgent(me), "team.read")
    const orgId = me.organismId

    const agents = await ctx.db
      .query("agents")
      .withIndex("by_organism", (q) => q.eq("organismId", orgId))
      .collect()

    const withCounts = await Promise.all(
      agents.map(async (a) => {
        const assignedCount = await aggRequestsByOrgAgent.count(ctx, {
          namespace: aggKeys.orgAgent(orgId, a._id),
        })
        return {
          id: a._id,
          name: a.name,
          email: a.email,
          nip: a.nip,
          role: a.role,
          roleLabel: roleLabel(a.role),
          function: a.function ?? "—",
          authMethod: a.authMethod ?? "nip_only",
          authMethodLabel: authMethodLabel(a.authMethod),
          active: a.active ?? true,
          disabledAt: a.disabledAt,
          assignedCount,
          isMe: a._id === me._id,
        }
      }),
    )

    // Tri : moi d'abord, puis par rôle, puis par nom
    const roleOrder: Record<string, number> = {
      admin_organisme: 0,
      officier_signataire: 1,
      chef_service: 2,
      agent_superviseur: 3,
      agent_instructeur: 4,
      admin_technique: 5,
      platform_admin: 6,
    }
    withCounts.sort((a, b) => {
      if (a.isMe !== b.isMe) return a.isMe ? -1 : 1
      const r = (roleOrder[a.role] ?? 99) - (roleOrder[b.role] ?? 99)
      if (r !== 0) return r
      return a.name.localeCompare(b.name)
    })

    const stats = {
      total: withCounts.length,
      active: withCounts.filter((a) => a.active).length,
      byRole: withCounts.reduce<Record<string, number>>((acc, a) => {
        acc[a.role] = (acc[a.role] ?? 0) + 1
        return acc
      }, {}),
    }

    return { members: withCounts, stats, canManage: canManageTeam(me) }
  },
})

export const listInvitations = query({
  args: {
    token: v.string(),
    scope: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("accepted"),
        v.literal("revoked"),
        v.literal("all"),
      ),
    ),
  },
  handler: async (ctx, { token, scope }) => {
    const me = await requireAgent(ctx, token)
    assertCan(actorFromAgent(me), "team.read")
    const all = await ctx.db
      .query("agentInvitations")
      .withIndex("by_organism_pending", (q) => q.eq("organismId", me.organismId))
      .collect()
    const s = scope ?? "all"
    const now = Date.now()
    const rows = all
      .map((inv) => {
        const state = computeInvitationState(inv, now)
        return {
          id: inv._id,
          email: inv.email,
          role: inv.role,
          roleLabel: roleLabel(inv.role),
          functionTitle: inv.functionTitle ?? "—",
          state,
          expiresAt: inv.expiresAt,
          createdAt: inv.createdAt,
          createdByAgentId: inv.createdByAgentId,
          acceptedAt: inv.acceptedAt,
          revokedAt: inv.revokedAt,
          token: inv.token, // utile pour copier le lien dans l'UI admin
        }
      })
      .filter((r) => s === "all" || r.state === s)
      .sort((a, b) => b.createdAt - a.createdAt)
    return rows
  },
})

/**
 * Public — utilisée par la page `/enrolement/[token]` (admin-web).
 * NE PAS exposer le organisme entier — juste les champs nécessaires
 * pour afficher l'écran d'acceptation.
 */
export const getInvitationByToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const inv = await ctx.db
      .query("agentInvitations")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first()
    if (!inv) return null
    const state = computeInvitationState(inv, Date.now())
    if (state !== "pending") {
      // On expose le statut pour pouvoir afficher un message clair côté UI
      return {
        state,
        email: inv.email,
        role: inv.role,
        organismName: null as string | null,
      }
    }
    const org = await ctx.db.get(inv.organismId)
    return {
      state: "pending" as const,
      email: inv.email,
      role: inv.role,
      roleLabel: roleLabel(inv.role),
      functionTitle: inv.functionTitle ?? null,
      authMethod: inv.authMethod ?? "nip_only",
      organismName: org?.name ?? null,
      organismShortName: org?.shortName ?? null,
      expiresAt: inv.expiresAt,
    }
  },
})

/* ============================================================
   Mutations
   ============================================================ */

export const inviteAgent = mutation({
  args: {
    token: v.string(),
    email: v.string(),
    role: agentRoleValidator,
    functionTitle: v.optional(v.string()),
    authMethod: v.optional(authMethodValidator),
  },
  handler: async (ctx, args) => {
    const me = await requireAgent(ctx, args.token)
    assertCan(actorFromAgent(me), "team.invite")

    const email = args.email.trim().toLowerCase()
    if (!isValidEmail(email)) {
      throw new Error("Adresse e-mail invalide.")
    }
    if (args.role === "platform_admin") {
      throw new Error(
        "Un admin organisme ne peut pas inviter de platform_admin.",
      )
    }
    // Refus si déjà membre actif de l'organisme
    const existingAgent = await ctx.db
      .query("agents")
      .withIndex("by_email", (q) => q.eq("email", email))
      .filter((q) => q.eq(q.field("organismId"), me.organismId))
      .first()
    if (existingAgent) {
      throw new Error("Cette adresse est déjà membre de votre organisme.")
    }
    // Refus si une invitation pending non expirée existe déjà
    const existingInv = await ctx.db
      .query("agentInvitations")
      .withIndex("by_email_org", (q) =>
        q.eq("email", email).eq("organismId", me.organismId),
      )
      .collect()
    const now = Date.now()
    const stillPending = existingInv.find(
      (inv) => computeInvitationState(inv, now) === "pending",
    )
    if (stillPending) {
      throw new Error(
        "Une invitation est déjà en attente pour cette adresse. Révoquez-la avant d'en envoyer une nouvelle.",
      )
    }

    const token = generateInvitationToken()
    const invitationId = await ctx.db.insert("agentInvitations", {
      organismId: me.organismId,
      email,
      role: args.role,
      functionTitle: args.functionTitle?.trim() || undefined,
      authMethod: args.authMethod,
      token,
      expiresAt: now + INVITATION_TTL_MS,
      createdAt: now,
      createdByAgentId: me._id,
    })

    await logTeamActivity(ctx, me, {
      verb: "a invité",
      subjectKind: "agentInvitations",
      subjectId: String(invitationId),
      subjectLabel: `${email} (${roleLabel(args.role)})`,
      iconKey: "userPlus",
    })
    await logAudit(ctx, me, "agent.invite", "agentInvitations", invitationId, {
      email,
      role: args.role,
    })

    return { invitationId, token }
  },
})

export const revokeInvitation = mutation({
  args: { token: v.string(), invitationId: v.id("agentInvitations") },
  handler: async (ctx, args) => {
    const me = await requireAgent(ctx, args.token)
    assertCan(actorFromAgent(me), "team.revoke_invitation")

    const inv = await ctx.db.get(args.invitationId)
    if (!inv) throw new Error("Invitation introuvable.")
    if (inv.organismId !== me.organismId) {
      throw new Error("Cette invitation n'appartient pas à votre organisme.")
    }
    const now = Date.now()
    const state = computeInvitationState(inv, now)
    if (state !== "pending") {
      throw new Error(`Cette invitation est déjà ${state}.`)
    }

    await ctx.db.patch(args.invitationId, {
      revokedAt: now,
      revokedByAgentId: me._id,
    })

    await logTeamActivity(ctx, me, {
      verb: "a révoqué l'invitation de",
      subjectKind: "agentInvitations",
      subjectId: String(args.invitationId),
      subjectLabel: inv.email,
      iconKey: "userX",
    })
    await logAudit(
      ctx,
      me,
      "agent.invite_revoke",
      "agentInvitations",
      args.invitationId,
      { email: inv.email },
    )

    return { ok: true as const }
  },
})

export const disableAgent = mutation({
  args: { token: v.string(), agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const me = await requireAgent(ctx, args.token)
    assertCan(actorFromAgent(me), "team.disable_agent")

    if (args.agentId === me._id) {
      throw new Error("Vous ne pouvez pas vous désactiver vous-même.")
    }
    const target = await ctx.db.get(args.agentId)
    if (!target) throw new Error("Agent introuvable.")
    if (target.organismId !== me.organismId) {
      throw new Error("Agent hors de votre organisme.")
    }
    if (target.active === false) {
      return { already: true as const }
    }
    await assertNotLastAdmin(ctx, target, "disable")

    const now = Date.now()
    await ctx.db.patch(args.agentId, {
      active: false,
      disabledAt: now,
      disabledByAgentId: me._id,
    })

    await logTeamActivity(ctx, me, {
      verb: "a désactivé",
      subjectKind: "agents",
      subjectId: String(args.agentId),
      subjectLabel: target.name,
      iconKey: "userMinus",
    })
    await logAudit(ctx, me, "agent.disable", "agents", args.agentId, {
      role: target.role,
    })

    return { already: false as const }
  },
})

export const enableAgent = mutation({
  args: { token: v.string(), agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const me = await requireAgent(ctx, args.token)
    assertCan(actorFromAgent(me), "team.enable_agent")

    const target = await ctx.db.get(args.agentId)
    if (!target) throw new Error("Agent introuvable.")
    if (target.organismId !== me.organismId) {
      throw new Error("Agent hors de votre organisme.")
    }
    if (target.active !== false) {
      return { already: true as const }
    }
    await ctx.db.patch(args.agentId, {
      active: true,
      disabledAt: undefined,
      disabledByAgentId: undefined,
    })

    await logTeamActivity(ctx, me, {
      verb: "a réactivé",
      subjectKind: "agents",
      subjectId: String(args.agentId),
      subjectLabel: target.name,
      iconKey: "userCheck",
    })
    await logAudit(ctx, me, "agent.enable", "agents", args.agentId, {})

    return { already: false as const }
  },
})

export const changeAgentRole = mutation({
  args: {
    token: v.string(),
    agentId: v.id("agents"),
    newRole: agentRoleValidator,
  },
  handler: async (ctx, args) => {
    const me = await requireAgent(ctx, args.token)
    assertCan(actorFromAgent(me), "team.change_role")

    if (args.newRole === "platform_admin") {
      throw new Error(
        "Un admin organisme ne peut pas attribuer le rôle platform_admin.",
      )
    }
    const target = await ctx.db.get(args.agentId)
    if (!target) throw new Error("Agent introuvable.")
    if (target.organismId !== me.organismId) {
      throw new Error("Agent hors de votre organisme.")
    }
    if (target.role === args.newRole) {
      return { already: true as const }
    }
    // Si on rétrograde un admin_organisme, vérifier qu'il en reste un autre actif
    if (target.role === "admin_organisme" && args.newRole !== "admin_organisme") {
      await assertNotLastAdmin(ctx, target, "demote")
    }

    const oldRole = target.role
    await ctx.db.patch(args.agentId, { role: args.newRole })

    await logTeamActivity(ctx, me, {
      verb: "a changé le rôle de",
      subjectKind: "agents",
      subjectId: String(args.agentId),
      subjectLabel: `${target.name} (${roleLabel(oldRole)} → ${roleLabel(args.newRole)})`,
      iconKey: "shieldCheck",
    })
    await logAudit(ctx, me, "agent.role_change", "agents", args.agentId, {
      from: oldRole,
      to: args.newRole,
    })

    return { already: false as const }
  },
})

/**
 * Public — pas d'auth, le secret est dans le token. Crée l'agent à partir
 * de l'invitation pending et marque l'invitation acceptedAt.
 *
 * Idempotence : si invitation déjà acceptée, renvoie l'agentId existant
 * sans rien recréer.
 */
export const acceptInvitation = mutation({
  args: {
    invitationToken: v.string(),
    nip: v.string(),
    name: v.string(),
    functionTitle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const inv = await ctx.db
      .query("agentInvitations")
      .withIndex("by_token", (q) => q.eq("token", args.invitationToken))
      .first()
    if (!inv) throw new Error("Invitation introuvable.")

    const now = Date.now()
    const state = computeInvitationState(inv, now)

    // Idempotence : déjà acceptée → on renvoie l'agent existant
    if (state === "accepted" && inv.acceptedByAgentId) {
      return { agentId: inv.acceptedByAgentId, already: true as const }
    }
    if (state !== "pending") {
      throw new Error(
        state === "revoked"
          ? "Cette invitation a été révoquée."
          : "Cette invitation a expiré.",
      )
    }

    const nip = args.nip.trim().toUpperCase()
    const name = args.name.trim()
    if (!nip) throw new Error("NIP requis.")
    if (!name) throw new Error("Nom requis.")

    // Refus si le NIP est déjà utilisé
    const existing = await ctx.db
      .query("agents")
      .withIndex("by_nip", (q) => q.eq("nip", nip))
      .first()
    if (existing) {
      throw new Error("Ce NIP est déjà associé à un compte.")
    }

    const agentId = await ctx.db.insert("agents", {
      organismId: inv.organismId,
      nip,
      name,
      email: inv.email,
      role: inv.role,
      function:
        args.functionTitle?.trim() || inv.functionTitle || undefined,
      authMethod: inv.authMethod ?? "nip_only",
      active: true,
    })

    await ctx.db.patch(inv._id, {
      acceptedAt: now,
      acceptedByAgentId: agentId,
    })

    // Audit (on ne logge PAS dans teamActivities car le nouvel agent n'est pas
    // encore en session et le logger requiert un me — on relie via auditLog)
    await ctx.db.insert("auditLog", {
      verb: "agent.invite_accept",
      actorKind: "agent",
      actorAgentId: agentId,
      subjectKind: "agentInvitations",
      subjectId: String(inv._id),
      organismId: inv.organismId,
      occurredAt: now,
      payloadHash: "stub-accept",
      payload: { email: inv.email, role: inv.role },
    })
    await ctx.db.insert("teamActivities", {
      organismId: inv.organismId,
      actorAgentId: agentId,
      actorDisplayName: name,
      verb: "a rejoint l'équipe",
      subjectKind: "agents",
      subjectId: String(agentId),
      subjectLabel: `${name} · ${roleLabel(inv.role)}`,
      iconKey: "userCheck",
      occurredAt: now,
    })

    return { agentId, already: false as const }
  },
})

/* ============================================================
   Helpers
   ============================================================ */

function computeInvitationState(
  inv: Doc<"agentInvitations">,
  now: number,
): "pending" | "accepted" | "revoked" | "expired" {
  if (inv.acceptedAt) return "accepted"
  if (inv.revokedAt) return "revoked"
  if (inv.expiresAt < now) return "expired"
  return "pending"
}

function generateInvitationToken(): string {
  // 64 chars hex ≈ 256 bits d'entropie depuis Math.random
  // (non-crypto-secure, mais l'invitation est éphémère et révocable).
  // Phase 2 : remplacer par un secret depuis env + HMAC pour vérification.
  let out = ""
  for (let i = 0; i < 16; i++) {
    out += Math.floor(Math.random() * 0xffffffff)
      .toString(16)
      .padStart(8, "0")
  }
  return out.slice(0, 64)
}

function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false
  // Validation minimale (la vraie est faite par le provider email Phase 2)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function canManageTeam(agent: Doc<"agents">): boolean {
  return agent.role === "admin_organisme" && (agent.active ?? true)
}

/**
 * Empêche de désactiver / rétrograder le dernier admin_organisme actif
 * d'un organisme — sinon plus personne ne pourrait gérer l'équipe.
 */
async function assertNotLastAdmin(
  ctx: MutationCtx | QueryCtx,
  target: Doc<"agents">,
  operation: "disable" | "demote",
): Promise<void> {
  if (target.role !== "admin_organisme") return
  if (target.active === false) return
  const allAdmins = await ctx.db
    .query("agents")
    .withIndex("by_organism_role", (q) =>
      q.eq("organismId", target.organismId).eq("role", "admin_organisme"),
    )
    .collect()
  const activeAdmins = allAdmins.filter((a) => a.active !== false)
  if (activeAdmins.length <= 1) {
    throw new Error(
      operation === "disable"
        ? "Impossible de désactiver le dernier admin organisme actif."
        : "Impossible de rétrograder le dernier admin organisme actif.",
    )
  }
}

async function logTeamActivity(
  ctx: MutationCtx,
  me: Doc<"agents">,
  data: {
    verb: string
    subjectKind: string
    subjectId: string
    subjectLabel: string
    iconKey?: string
  },
): Promise<void> {
  await ctx.db.insert("teamActivities", {
    organismId: me.organismId,
    actorAgentId: me._id,
    actorDisplayName: me.name,
    occurredAt: Date.now(),
    ...data,
  })
}

async function logAudit(
  ctx: MutationCtx,
  me: Doc<"agents">,
  verb:
    | "agent.invite"
    | "agent.invite_revoke"
    | "agent.disable"
    | "agent.enable"
    | "agent.role_change",
  subjectKind: string,
  subjectId: Id<"agents"> | Id<"agentInvitations">,
  payload: Record<string, unknown>,
): Promise<void> {
  await ctx.db.insert("auditLog", {
    verb,
    actorKind: "agent",
    actorAgentId: me._id,
    subjectKind,
    subjectId: String(subjectId),
    organismId: me.organismId,
    occurredAt: Date.now(),
    payloadHash: "stub-team", // Phase 2 : vrai SHA-256 du payload
    payload,
  })
}

function roleLabel(role: string): string {
  switch (role) {
    case "agent_instructeur":
      return "Agent instructeur"
    case "agent_superviseur":
      return "Agent superviseur"
    case "chef_service":
      return "Chef de service"
    case "officier_signataire":
      return "Officier signataire"
    case "admin_organisme":
      return "Admin organisme"
    case "admin_technique":
      return "Admin technique"
    case "platform_admin":
      return "Admin plateforme"
    default:
      return role
  }
}

function authMethodLabel(m: string | undefined): string {
  switch (m) {
    case "nip_only":
      return "NIP"
    case "nip_carte_agent":
      return "NIP + carte agent"
    case "nip_cle_api":
      return "NIP + clé API"
    default:
      return "—"
  }
}
