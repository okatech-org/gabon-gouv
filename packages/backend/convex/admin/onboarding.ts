/**
 * Onboarding réel côté admin_organisme (Phase Trous C).
 *
 * Quand la platform crée un organisme + invite le 1er admin (cf.
 * `platform/organisms.ts::registerOrganism`), le nouvel admin se
 * connecte via `/enrolement/{token}` et arrive sur son back-office.
 * Ce module expose :
 *
 *   - `getOnboardingStatus` : statut bootstrap pour piloter le banner
 *     "Premiers pas" sur le dashboard (checklist 3 étapes).
 *   - `finalizeActivation` : passe l'organism de `onboarding` → `active`
 *     une fois que l'admin estime que sa config est prête. Trace dans
 *     teamActivities + auditLog.
 *
 * Distingue 3 checks pour la checklist UI :
 *   - teamInvited : au moins 1 invitation envoyée OU 1 autre agent existe
 *   - saeConfigured : organism.saeConfig est défini
 *   - servicesPublished : au moins 1 service status=published
 *
 * L'admin peut activer même si tout n'est pas coché (overrideable) — le
 * banner reste informationnel, pas bloquant.
 */
import { v } from "convex/values"
import { query } from "../_generated/server"
import { mutation } from "../lib/triggers"
import { requireAgent } from "../auth"
import { actorFromAgent, assertCan } from "../lib/permissions"

export const getOnboardingStatus = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const me = await requireAgent(ctx, token)
    const org = await ctx.db.get(me.organismId)
    if (!org) return null

    // teamInvited : 1+ invitation (tout état) OU 2+ agents (moi + autre)
    const allAgents = await ctx.db
      .query("agents")
      .withIndex("by_organism", (q) => q.eq("organismId", me.organismId))
      .collect()
    const invitations = await ctx.db
      .query("agentInvitations")
      .withIndex("by_organism_pending", (q) =>
        q.eq("organismId", me.organismId),
      )
      .collect()
    const teamInvited = allAgents.length > 1 || invitations.length > 0

    // saeConfigured : organism.saeConfig est défini
    const saeConfigured = Boolean(org.saeConfig)

    // servicesPublished : 1+ service status=published
    const services = await ctx.db
      .query("services")
      .withIndex("by_organism_status", (q) =>
        q.eq("organismId", me.organismId).eq("status", "published"),
      )
      .first()
    const servicesPublished = services !== null

    const completedCount = [teamInvited, saeConfigured, servicesPublished].filter(
      Boolean,
    ).length

    return {
      isOnboarding: org.status === "onboarding",
      canFinalize:
        me.role === "admin_organisme" && org.status === "onboarding",
      organismName: org.shortName ?? org.name,
      checklist: {
        teamInvited,
        saeConfigured,
        servicesPublished,
      },
      completedCount,
      totalSteps: 3,
    }
  },
})

export const finalizeActivation = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const me = await requireAgent(ctx, token)
    assertCan(actorFromAgent(me), "organism.finalize_self")
    const org = await ctx.db.get(me.organismId)
    if (!org) throw new Error("Organisme introuvable.")
    if (org.status === "active") {
      return { already: true as const }
    }
    if (org.status === "suspended") {
      throw new Error(
        "Organisme suspendu — contactez la plateforme avant d'activer.",
      )
    }

    const now = Date.now()
    await ctx.db.patch(me.organismId, { status: "active" })

    // Si un onboardingProcess existe et n'est pas clos, on le marque terminé
    const process = await ctx.db
      .query("onboardingProcesses")
      .withIndex("by_organism", (q) => q.eq("organismId", me.organismId))
      .first()
    if (process && !process.completedAt) {
      await ctx.db.patch(process._id, { completedAt: now })
    }

    await ctx.db.insert("teamActivities", {
      organismId: me.organismId,
      actorAgentId: me._id,
      actorDisplayName: me.name,
      verb: "a activé l'organisme",
      subjectKind: "organisms",
      subjectId: String(me.organismId),
      subjectLabel: org.shortName ?? org.name,
      iconKey: "checkCircle",
      occurredAt: now,
    })
    await ctx.db.insert("auditLog", {
      verb: "organism.activate",
      actorKind: "agent",
      actorAgentId: me._id,
      subjectKind: "organisms",
      subjectId: String(me.organismId),
      organismId: me.organismId,
      occurredAt: now,
      payloadHash: "stub-finalize",
    })

    return { already: false as const }
  },
})
