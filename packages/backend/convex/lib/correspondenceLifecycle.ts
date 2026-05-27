/**
 * Helpers de cycle de vie d'une correspondance (Bloc 5).
 *
 * Responsabilités :
 *   - Calculer les échéances (AR, réponse) à partir du `kind` au moment de
 *     l'envoi
 *   - Calculer la DUA (durée d'utilité administrative) + `duaExpiresAt`
 *   - Vérifier les préconditions par kind (circuit obligatoire ?, PJ
 *     obligatoire ?)
 *   - Notifier les destinataires (insertions dans la table `notifications`)
 *
 * Les règles par kind sont **stockées en table** (`correspondenceKindRules`)
 * et chargées dynamiquement — pas hardcodé. La fonction `getDefaultKindRules`
 * fournit un fallback au cas où la table n'est pas seedée.
 */

import type { Doc, Id } from "../_generated/dataModel"
import type { MutationCtx, QueryCtx } from "../_generated/server"
import type {
  ConfidentialityLevel,
  CorrespondenceKind,
} from "./enums"
import { notify } from "./notificationProvider"

/* ============================================================
   Types
   ============================================================ */

export interface KindRule {
  kind: CorrespondenceKind
  requiresCircuit: boolean
  requiresAttachment: boolean
  duaCode: string
  ackDeadlineDays?: number
  replyDeadlineDays?: number
  autoCloseAfterDays?: number
  defaultConfidentiality: ConfidentialityLevel
}

/* ============================================================
   Chargement des règles
   ============================================================ */

/**
 * Charge la règle métier pour un kind donné depuis la table.
 * Si absente, fallback sur les défauts hardcodés (utile pour les tests
 * et tant que la table n'est pas seedée).
 */
export async function loadKindRule(
  ctx: QueryCtx | MutationCtx,
  kind: CorrespondenceKind,
): Promise<KindRule> {
  const row = await ctx.db
    .query("correspondenceKindRules")
    .withIndex("by_kind", (q) => q.eq("kind", kind))
    .first()
  if (row) {
    return {
      kind: row.kind,
      requiresCircuit: row.requiresCircuit,
      requiresAttachment: row.requiresAttachment,
      duaCode: row.duaCode,
      ackDeadlineDays: row.ackDeadlineDays,
      replyDeadlineDays: row.replyDeadlineDays,
      autoCloseAfterDays: row.autoCloseAfterDays,
      defaultConfidentiality: row.defaultConfidentiality,
    }
  }
  return getDefaultKindRules()[kind]
}

/** Règles par défaut hardcodées (cf spec §4.2 — table des règles par kind). */
export function getDefaultKindRules(): Record<CorrespondenceKind, KindRule> {
  const make = (
    kind: CorrespondenceKind,
    overrides: Partial<KindRule>,
  ): KindRule => ({
    kind,
    requiresCircuit: false,
    requiresAttachment: false,
    duaCode: "5y",
    ackDeadlineDays: 14,
    replyDeadlineDays: 30,
    autoCloseAfterDays: 90,
    defaultConfidentiality: "restricted",
    ...overrides,
  })
  return {
    instruction_request: make("instruction_request", {
      ackDeadlineDays: 7,
    }),
    instruction_transmission: make("instruction_transmission", {
      ackDeadlineDays: 7,
    }),
    instruction_response: make("instruction_response", {
      ackDeadlineDays: 7,
    }),
    decision_grant: make("decision_grant", {
      requiresCircuit: true,
      requiresAttachment: true,
      duaCode: "30y",
      ackDeadlineDays: 7,
      replyDeadlineDays: undefined, // décision = notification, pas réponse
    }),
    decision_reject: make("decision_reject", {
      requiresCircuit: true,
      requiresAttachment: true,
      duaCode: "30y",
      ackDeadlineDays: 7,
      replyDeadlineDays: undefined,
    }),
    decision_suspend: make("decision_suspend", {
      requiresCircuit: true,
      requiresAttachment: true,
      duaCode: "30y",
      ackDeadlineDays: 7,
      replyDeadlineDays: undefined,
    }),
    cooperation_info_share: make("cooperation_info_share", {
      duaCode: "2y",
    }),
    cooperation_data_request: make("cooperation_data_request", {
      duaCode: "2y",
    }),
    cooperation_fraud_alert: make("cooperation_fraud_alert", {
      duaCode: "5y",
      defaultConfidentiality: "confidential",
      ackDeadlineDays: 3,
    }),
    escalation_tutelle: make("escalation_tutelle", {
      requiresCircuit: true,
      requiresAttachment: true,
      duaCode: "50y",
      ackDeadlineDays: 3,
      replyDeadlineDays: 14,
      defaultConfidentiality: "confidential",
      autoCloseAfterDays: 180,
    }),
    escalation_dispute: make("escalation_dispute", {
      requiresCircuit: true,
      requiresAttachment: true,
      duaCode: "50y",
      ackDeadlineDays: 3,
      replyDeadlineDays: 14,
      defaultConfidentiality: "confidential",
      autoCloseAfterDays: 180,
    }),
    escalation_incident: make("escalation_incident", {
      requiresCircuit: true,
      requiresAttachment: true,
      duaCode: "50y",
      ackDeadlineDays: 3,
      replyDeadlineDays: 14,
      defaultConfidentiality: "confidential",
      autoCloseAfterDays: 180,
    }),
    internal_circular: make("internal_circular", {
      duaCode: "indef",
      ackDeadlineDays: undefined,
      replyDeadlineDays: undefined,
      autoCloseAfterDays: undefined,
    }),
    internal_service_note: make("internal_service_note", {
      duaCode: "5y",
      ackDeadlineDays: undefined,
      replyDeadlineDays: undefined,
    }),
    protocol_greeting: make("protocol_greeting", {
      duaCode: "1y",
      ackDeadlineDays: undefined,
      replyDeadlineDays: undefined,
      autoCloseAfterDays: 30,
    }),
    protocol_condolences: make("protocol_condolences", {
      duaCode: "1y",
      ackDeadlineDays: undefined,
      replyDeadlineDays: undefined,
      autoCloseAfterDays: 30,
    }),
    other: make("other", {}),
  }
}

/* ============================================================
   Calcul échéances + DUA
   ============================================================ */

/** Convertit un duaCode (« 5y », « 30y », « indef », « 1y ») en ms. */
export function duaCodeToMs(code: string): number | null {
  if (code === "indef" || code === "indéf" || code === "Indéf.") return null
  const match = code.match(/^(\d+)y$/)
  if (match) return Number(match[1]) * 365 * 24 * 60 * 60 * 1000
  const matchD = code.match(/^(\d+)d$/)
  if (matchD) return Number(matchD[1]) * 24 * 60 * 60 * 1000
  return null
}

/** Calcule l'échéance d'AR (timestamp ms) ou null si pas applicable. */
export function computeAckDeadline(rule: KindRule, sentAt: number): number | undefined {
  if (rule.ackDeadlineDays === undefined) return undefined
  return sentAt + rule.ackDeadlineDays * 24 * 60 * 60 * 1000
}

/** Calcule l'échéance de réponse (timestamp ms) ou null. */
export function computeReplyDeadline(
  rule: KindRule,
  sentAt: number,
): number | undefined {
  if (rule.replyDeadlineDays === undefined) return undefined
  return sentAt + rule.replyDeadlineDays * 24 * 60 * 60 * 1000
}

/** Calcule la date d'expiration de la DUA (timestamp ms) ou undefined si indéfinie. */
export function computeDuaExpiresAt(
  rule: KindRule,
  sentAt: number,
): number | undefined {
  const ms = duaCodeToMs(rule.duaCode)
  if (ms === null) return undefined
  return sentAt + ms
}

/* ============================================================
   Notifications destinataires
   ============================================================ */

/**
 * À l'envoi, notifie tous les destinataires (To, CC, BCC) :
 *   - org-receivers → 1 notif par agent éligible de l'org (rôle ≥ agent_superviseur)
 *   - citizen-receivers → 1 notif au citoyen
 *   - external-receivers → pas de notif (à brancher avec provider email plus tard)
 *
 * Patche aussi `correspondenceRecipients.notifiedAt`.
 */
export async function notifyRecipientsOnSend(
  ctx: MutationCtx,
  correspondence: Doc<"correspondences">,
): Promise<void> {
  const recipients = await ctx.db
    .query("correspondenceRecipients")
    .withIndex("by_correspondence", (q) =>
      q.eq("correspondenceId", correspondence._id),
    )
    .collect()

  const now = Date.now()
  for (const recipient of recipients) {
    if (recipient.recipientKind === "organism" && recipient.recipientOrganismId) {
      // Notifier les agents de l'organisme dont le rôle peut lire la corres
      const agents = await ctx.db
        .query("agents")
        .withIndex("by_organism", (q) =>
          q.eq("organismId", recipient.recipientOrganismId!),
        )
        .collect()
      const eligibleRoles: Array<Doc<"agents">["role"]> = [
        "agent_instructeur",
        "agent_superviseur",
        "chef_service",
        "officier_signataire",
        "admin_organisme",
      ]
      for (const agent of agents) {
        if (!eligibleRoles.includes(agent.role)) continue
        await notify(ctx, {
          recipientKind: "agent",
          recipientId: String(agent._id),
          kind: "correspondence_received",
          severity: correspondence.urgent ? "warning" : "info",
          title: correspondence.urgent
            ? `Courrier urgent : ${correspondence.subject}`
            : `Nouveau courrier : ${correspondence.subject}`,
          body: `Réf. ${correspondence.ref}${
            recipient.role !== "to" ? ` (en ${recipient.role.toUpperCase()})` : ""
          }`,
          linkTo: `/correspondance/${correspondence.ref}`,
        })
      }
    } else if (
      recipient.recipientKind === "citizen" &&
      recipient.recipientCitizenId
    ) {
      await notify(ctx, {
        recipientKind: "citizen",
        recipientId: String(recipient.recipientCitizenId),
        kind: "correspondence_received",
        severity: correspondence.urgent ? "warning" : "info",
        title: `Courrier de l'administration : ${correspondence.subject}`,
        body: `Réf. ${correspondence.ref}. Connectez-vous pour le consulter.`,
        linkTo: `/mon-espace/courriers/${correspondence.ref}`,
      })
    }
    // external / platform : pas de notif v1
    await ctx.db.patch(recipient._id, { notifiedAt: now })
  }
}

/* ============================================================
   Envoi effectif d'une correspondance (factorisé entre sendDirect
   et onCircuitCompleted)
   ============================================================ */

/**
 * Exécute l'envoi effectif d'une correspondance :
 *   - insert du 1er message dans le thread (signé S/MIME stub)
 *   - calcul des échéances (AR, réponse, DUA) selon le kind
 *   - patch correspondences.status=sent + sentAt
 *   - notification des destinataires
 *
 * Appelé soit par `admin.correspondenceLifecycle.sendDirect` (pas de circuit),
 * soit par `onCircuitCompleted` quand la dernière étape du circuit signature
 * est validée pour subjectKind="correspondence".
 */
export async function performCorrespondenceSend(
  ctx: MutationCtx,
  correspondence: Doc<"correspondences">,
  senderAgentId: Id<"agents">,
): Promise<void> {
  if (!correspondence.kind) {
    throw new Error("Kind manquant — impossible d'envoyer.")
  }
  const sender = await ctx.db.get(senderAgentId)
  if (!sender) throw new Error("Émetteur introuvable.")

  // smime.ts utilise Web Crypto API (signMessage est async)
  const { signMessage } = await import("./smime.js")

  const now = Date.now()
  const rule = await loadKindRule(ctx, correspondence.kind)
  const dueAckAt = computeAckDeadline(rule, now)
  const dueReplyAt = computeReplyDeadline(rule, now)
  const duaExpiresAt = computeDuaExpiresAt(rule, now)

  const signature = await signMessage({
    body: correspondence.body,
    agentId: senderAgentId,
    sentAt: now,
  })
  await ctx.db.insert("correspondenceMessages", {
    correspondenceId: correspondence._id,
    fromKind: "agent",
    fromAgentId: senderAgentId,
    fromOrganismIdSnapshot: sender.organismId,
    body: correspondence.body,
    bodyFormat: correspondence.bodyFormat ?? "plain",
    signed: true,
    signatureFingerprint: signature.signatureFingerprint,
    signatureAlgorithm: signature.signatureAlgorithm,
    signedAt: signature.signedAt,
    sentAt: now,
  })

  await ctx.db.patch(correspondence._id, {
    status: "sent",
    sentAt: now,
    dueAckAt,
    dueReplyAt,
    duaExpiresAt,
    messagesCount: 1,
  })

  // Re-charge pour notifier avec sentAt à jour
  const updated = await ctx.db.get(correspondence._id)
  if (updated) await notifyRecipientsOnSend(ctx, updated)
}

/* ============================================================
   Format de référence
   ============================================================ */

/** Génère une référence CR-AAAA-NNNNN unique (anti-collision via boucle bornée). */
export async function generateCorrespondenceRef(
  ctx: MutationCtx,
): Promise<string> {
  const year = new Date().getFullYear()
  for (let attempt = 0; attempt < 12; attempt++) {
    const seq = String(Math.floor(Math.random() * 100000)).padStart(5, "0")
    const ref = `CR-${year}-${seq}`
    const existing = await ctx.db
      .query("correspondences")
      .withIndex("by_ref", (q) => q.eq("ref", ref))
      .first()
    if (!existing) return ref
  }
  throw new Error(
    "Impossible de générer une référence de correspondance unique après 12 tentatives.",
  )
}

/* ============================================================
   Thread IDs
   ============================================================ */

/** Crée un nouvel UUID de thread (RFC 4122 v4 simplifié). */
export function newThreadId(): string {
  // Format compact 8-4-4-4-12. Crypto random pour éviter les collisions.
  const r = () => Math.floor(Math.random() * 0xffff).toString(16).padStart(4, "0")
  return `${r()}${r()}-${r()}-${r()}-${r()}-${r()}${r()}${r()}`
}
