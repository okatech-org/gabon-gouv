/**
 * Permissions centralisées (ADR-0006).
 *
 * Toute mutation/query métier passe par `can()` ou un guard dérivé pour
 * autoriser l'action. Les *règles* sont du code TypeScript ; les *faits*
 * (rôles d'agents, habilitations sur dossiers) restent en base.
 *
 * Convention :
 *   - `can(actor, action)` : règle pure (role-based). Renvoie un booléen.
 *   - `assertCan(actor, action)` : version qui throw.
 *   - guards composés (`requireAgentRole`, `assertDossierAccess`, …)
 *     bundlent plusieurs vérifications fréquentes.
 *
 * Note : les actions qui dépendent du contenu de la base (habilitations
 * dossier, propriété d'une demande par un citoyen) ne peuvent pas être
 * évaluées par `can()` seul — utiliser les guards async dédiés.
 */

import type { Id } from "../_generated/dataModel"
import type { QueryCtx } from "../_generated/server"
import type { AgentRole, DossierAccessLevel } from "./enums"

// ============================================================
// Acteurs
// ============================================================

export type Actor =
  | {
      kind: "citizen"
      citizenId: Id<"citizens">
    }
  | {
      kind: "agent"
      agentId: Id<"agents">
      organismId: Id<"organisms">
      role: AgentRole
    }
  | {
      // Réservé aux jobs internes (cron, triggers, seed)
      kind: "system"
    }

// ============================================================
// Actions
// ============================================================

export type Action =
  // Demandes citoyennes
  | "request.deposit"
  | "request.read.own" // par le citoyen
  | "request.read.organism" // par un agent de l'organisme
  | "request.assign"
  | "request.transfer"
  | "request.cancel"
  | "request.reject"
  | "request.write_note"
  // Pièces
  | "piece.upload"
  | "piece.validate"
  | "piece.reject"
  | "piece.request_more"
  // Documents
  | "document.prepare"
  | "document.sign"
  | "document.issue"
  | "document.revoke"
  | "document.read"
  // Vérifications automatiques (Bloc 3)
  | "verification.update"
  // Signatures circuits (Bloc 3) — vérification dynamique additionnelle :
  // on contrôle aussi que l'agent appelant est bien l'`assigneeAgentId`
  // du step `current` (cf. `lib/signatureCircuit.ts`).
  | "signature.approve"
  | "signature.refuse"
  // Correspondance inter-admin (Bloc 5 — refonte exhaustive)
  | "correspondence.read"
  | "correspondence.create"               // créer un brouillon
  | "correspondence.send"                 // soumettre brouillon → circuit
  | "correspondence.send_direct"          // envoyer sans circuit (kind autorisé)
  | "correspondence.sign_smime"
  | "correspondence.acknowledge"          // AR formel
  | "correspondence.reply"
  | "correspondence.recall"               // rappel (admin_organisme only, avant 1er AR)
  | "correspondence.archive"
  | "correspondence.close"
  | "correspondence.escalate"             // saisine tutelle (admin_organisme)
  | "correspondence.platform_read"        // platform_admin : escalations
  | "correspondence.template.crud"        // admin_technique
  // Citoyen
  | "correspondence.citizen.read"
  | "correspondence.citizen.send"
  | "correspondence.citizen.reply"
  | "correspondence.citizen.acknowledge"
  // Archives SAE
  | "archive.verse"
  | "archive.read"
  | "archive.eliminate_request"
  | "archive.eliminate_visa" // DGAN uniquement
  // Catalogue de services (Bloc 1)
  | "service.read"
  | "service.read_stats"
  | "service.create"
  | "service.update"
  | "service.publish"
  | "service.unpublish"
  | "service.archive"
  | "service.duplicate"
  | "service.variant.crud"
  | "service.requirement.crud"
  | "service.template.update"
  | "service.template.validate"
  | "service.template.activate"
  // Legacy (conservés pour compat avec tests existants — à supprimer)
  | "service.draft"
  | "service.edit"
  // Organismes (plateforme)
  | "organism.register"
  | "organism.activate"
  | "organism.suspend"
  | "organism.onboard_step"
  // Conventions
  | "convention.sign.platform"
  | "convention.sign.organism"
  // Dossier 360°
  | "dossier.read"
  | "dossier.grant_access"
  | "dossier.revoke_access"
  // Plateforme
  | "platform.read_supervision"
  | "platform.acknowledge_alert"
  | "platform.generate_report"
  // Gestion d'équipe intra-organisme (Phase Trous B)
  | "team.read"
  | "team.invite"
  | "team.revoke_invitation"
  | "team.disable_agent"
  | "team.enable_agent"
  | "team.change_role"

// ============================================================
// Règle pure (role-based) — toutes les actions qui peuvent se
// décider à partir de la seule connaissance de l'acteur.
// ============================================================

export function can(actor: Actor, action: Action): boolean {
  if (actor.kind === "system") return true

  if (actor.kind === "citizen") {
    return CITIZEN_ALLOWED.has(action)
  }

  // actor.kind === "agent"
  const r = actor.role
  if (r === "platform_admin") return PLATFORM_ADMIN_ALLOWED.has(action)

  if (AGENT_ANY_ROLE.has(action)) return true

  switch (r) {
    case "agent_instructeur":
      return AGENT_INSTRUCTEUR_ALLOWED.has(action)
    case "agent_superviseur":
      return AGENT_SUPERVISEUR_ALLOWED.has(action)
    case "chef_service":
      return CHEF_SERVICE_ALLOWED.has(action)
    case "officier_signataire":
      return OFFICIER_ALLOWED.has(action)
    case "admin_organisme":
      return ADMIN_ORGANISME_ALLOWED.has(action)
    case "admin_technique":
      return ADMIN_TECHNIQUE_ALLOWED.has(action)
    default:
      return false
  }
}

/** Version impérative — throw si refusé. */
export function assertCan(actor: Actor, action: Action): void {
  if (!can(actor, action)) {
    throw new Error(
      `Action "${action}" refusée pour ${describeActor(actor)}.`,
    )
  }
}

function describeActor(actor: Actor): string {
  switch (actor.kind) {
    case "citizen":
      return `citoyen ${actor.citizenId}`
    case "agent":
      return `agent (${actor.role})`
    case "system":
      return "système"
  }
}

// ============================================================
// Matrices — quelles actions chaque rôle peut faire
// ============================================================

const CITIZEN_ALLOWED = new Set<Action>([
  "request.deposit",
  "request.read.own",
  "request.cancel",
  "piece.upload",
  "document.read",
  // Bloc 5 — Correspondance
  "correspondence.citizen.read",
  "correspondence.citizen.send",
  "correspondence.citizen.reply",
  "correspondence.citizen.acknowledge",
])

// Actions qu'un agent (quel que soit son rôle) peut faire dans son organisme.
const AGENT_ANY_ROLE = new Set<Action>([
  "request.read.organism",
  "correspondence.read",
  "archive.read",
  "service.read",
  "service.read_stats",
  "team.read",
])

const AGENT_INSTRUCTEUR_ALLOWED = new Set<Action>([
  "request.write_note",
  "piece.validate",
  "piece.reject",
  "piece.request_more",
  "document.prepare",
  "verification.update",
  // L'instructeur est l'assignee du step 0 dans le circuit standard
  // (`buildDocumentCircuit`). Il doit pouvoir l'approuver. La vérification
  // dynamique d'assignee dans `approveStep` empêche un instructeur
  // d'approuver un step qui n'est pas le sien.
  "signature.approve",
  "signature.refuse",
  // Bloc 5 — Correspondance : l'instructeur peut créer brouillons, soumettre
  // pour signature, accuser réception, répondre. Pas de send_direct (chef+).
  "correspondence.create",
  "correspondence.send",
  "correspondence.sign_smime",
  "correspondence.acknowledge",
  "correspondence.reply",
])

const AGENT_SUPERVISEUR_ALLOWED = new Set<Action>([
  ...AGENT_INSTRUCTEUR_ALLOWED,
  "request.assign",
  "request.transfer",
])

const CHEF_SERVICE_ALLOWED = new Set<Action>([
  ...AGENT_SUPERVISEUR_ALLOWED,
  "request.reject",
  // Le chef de service est un signataire intermédiaire dans les circuits.
  // Le rôle est nécessaire mais pas suffisant : la mutation vérifie en plus
  // que l'agent est bien l'assignee du step current.
  "signature.approve",
  "signature.refuse",
  // Bloc 5 — Correspondance : le chef peut envoyer sans circuit pour les
  // kinds autorisés (cooperation_*, protocol_*, internal_service_note),
  // archiver et clôturer.
  "correspondence.send_direct",
  "correspondence.archive",
  "correspondence.close",
  // Gestion catalogue services : config métier sans publication
  "service.create",
  "service.update",
  "service.duplicate",
  "service.variant.crud",
  "service.requirement.crud",
  "service.template.update",
])

const OFFICIER_ALLOWED = new Set<Action>([
  ...CHEF_SERVICE_ALLOWED,
  "document.sign",
  "document.issue",
  "document.revoke",
  "archive.verse",
  "archive.eliminate_request",
])

const ADMIN_ORGANISME_ALLOWED = new Set<Action>([
  ...OFFICIER_ALLOWED,
  // Hérité de chef_service (sinon admin_organisme ne pourrait pas créer un service)
  "service.create",
  "service.update",
  "service.duplicate",
  "service.variant.crud",
  "service.requirement.crud",
  "service.template.update",
  // Spécifique admin_organisme : cycle de publication + validation comité
  "service.publish",
  "service.unpublish",
  "service.archive",
  "service.template.validate",
  "service.template.activate",
  // Bloc 5 — Correspondance : rappel (avant 1er AR) + saisines de la tutelle
  "correspondence.recall",
  "correspondence.escalate",
  // Dossiers et conventions
  "dossier.grant_access",
  "dossier.revoke_access",
  "convention.sign.organism",
  // Phase Trous B — Gestion d'équipe (admin_organisme exclusif)
  "team.invite",
  "team.revoke_invitation",
  "team.disable_agent",
  "team.enable_agent",
  "team.change_role",
  // Legacy
  "service.draft",
  "service.edit",
])

const ADMIN_TECHNIQUE_ALLOWED = new Set<Action>([
  // Profil DSI/intégration — pas d'actions métier, juste lecture +
  // gestion des templates de correspondance (Bloc 5).
  "correspondence.template.crud",
])

const PLATFORM_ADMIN_ALLOWED = new Set<Action>([
  // Plateforme
  "platform.read_supervision",
  "platform.acknowledge_alert",
  "platform.generate_report",
  // Organismes
  "organism.register",
  "organism.activate",
  "organism.suspend",
  "organism.onboard_step",
  // Conventions côté plateforme
  "convention.sign.platform",
  // Archives — visa DGAN d'élimination
  "archive.eliminate_visa",
  // Lecture cross-organisme
  "request.read.organism",
  "correspondence.read",
  "correspondence.platform_read", // toutes les saisines escalation_*
  "archive.read",
  "dossier.read",
])

// ============================================================
// Guards composés (avec accès à la base)
// ============================================================

/**
 * Vérifie qu'un agent appartient bien à l'organisme attendu.
 * À utiliser dès qu'on accepte un `Id<"organisms">` en argument et qu'on
 * veut empêcher un agent d'agir sur l'organisme d'un autre.
 */
export function requireSameOrganism(
  actor: Actor,
  organismId: Id<"organisms">,
): void {
  if (actor.kind !== "agent") {
    throw new Error("Action réservée aux agents.")
  }
  if (actor.organismId !== organismId) {
    throw new Error(
      "Action refusée : l'agent n'appartient pas à l'organisme cible.",
    )
  }
}

/**
 * Vérifie qu'un agent a l'un des rôles attendus dans son organisme.
 */
export function requireAgentRole(
  actor: Actor,
  ...allowedRoles: AgentRole[]
): void {
  if (actor.kind !== "agent") {
    throw new Error("Action réservée aux agents.")
  }
  if (!allowedRoles.includes(actor.role)) {
    throw new Error(
      `Action refusée : rôles autorisés [${allowedRoles.join(", ")}], rôle actuel "${actor.role}".`,
    )
  }
}

/**
 * Vérifie qu'un citoyen est bien le propriétaire de la ressource.
 */
export function requireOwnCitizen(
  actor: Actor,
  citizenId: Id<"citizens">,
): void {
  if (actor.kind !== "citizen") {
    throw new Error("Action réservée au citoyen propriétaire.")
  }
  if (actor.citizenId !== citizenId) {
    throw new Error("Action refusée : ressource d'un autre citoyen.")
  }
}

/**
 * Vérifie qu'un agent a (ou peut accéder à) le dossier d'un citoyen.
 *
 * Règle :
 *   1. Si la demande / le document a été produit par l'organisme de l'agent
 *      → accès automatique (handle au call-site via requireSameOrganism).
 *   2. Sinon, on cherche une habilitation `dossierAccessGrants` active.
 *   3. Platform admins ont toujours accès.
 *
 * Renvoie le niveau d'accès résolu (read / read_write / read_subset).
 */
export async function resolveDossierAccess(
  ctx: QueryCtx,
  actor: Actor,
  citizenId: Id<"citizens">,
): Promise<DossierAccessLevel | null> {
  if (actor.kind === "system") return "read_write"
  if (actor.kind === "citizen") {
    return actor.citizenId === citizenId ? "read_write" : null
  }
  if (actor.role === "platform_admin") return "read"

  const grant = await ctx.db
    .query("dossierAccessGrants")
    .withIndex("by_citizen_organism", (q) =>
      q.eq("citizenId", citizenId).eq("organismId", actor.organismId),
    )
    .filter((q) => q.eq(q.field("revokedAt"), undefined))
    .first()

  if (!grant) return null
  if (grant.expiresAt && grant.expiresAt < Date.now()) return null
  return grant.level
}

export async function assertDossierAccess(
  ctx: QueryCtx,
  actor: Actor,
  citizenId: Id<"citizens">,
  minLevel: DossierAccessLevel = "read",
): Promise<void> {
  const level = await resolveDossierAccess(ctx, actor, citizenId)
  if (level === null) {
    throw new Error(
      "Accès au dossier refusé : aucune habilitation active pour cet organisme.",
    )
  }
  // read_write > read_subset > read
  const rank: Record<DossierAccessLevel, number> = {
    read: 1,
    read_subset: 2,
    read_write: 3,
  }
  if (rank[level] < rank[minLevel]) {
    throw new Error(
      `Niveau d'accès insuffisant : requis "${minLevel}", actuel "${level}".`,
    )
  }
}

// ============================================================
// Construction d'un Actor depuis le contexte
// ============================================================

/**
 * Construit un `Actor` agent à partir d'un document `agents`.
 * Pratique au début d'une mutation, après `requireAgent` (cf auth.ts).
 */
export function actorFromAgent(agent: {
  _id: Id<"agents">
  organismId: Id<"organisms">
  role: AgentRole
}): Actor {
  return {
    kind: "agent",
    agentId: agent._id,
    organismId: agent.organismId,
    role: agent.role,
  }
}

export function actorFromCitizen(citizenId: Id<"citizens">): Actor {
  return { kind: "citizen", citizenId }
}

export const SYSTEM_ACTOR: Actor = { kind: "system" }
