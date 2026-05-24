/**
 * Helpers d'écriture du journal d'audit probant (ADR-0012).
 *
 * Deux tables alimentées en parallèle :
 *   - `auditLog` : journal append-only NF Z42-013, scellé quotidiennement.
 *   - `teamActivities` : feed d'activité pour l'UI (modifiable, redécorable).
 *
 * Convention : toute mutation métier qui modifie l'état doit appeler
 * `writeAudit(ctx, { verb, ... })` avant de renvoyer.
 */

import type { Id } from "../_generated/dataModel"
import type { MutationCtx } from "../_generated/server"
import type { ActorKind, AuditVerb } from "./enums"

interface WriteAuditArgs {
  ctx: MutationCtx
  verb: AuditVerb
  actorKind: ActorKind
  actorAgentId?: Id<"agents">
  actorAgentName?: string // pour teamActivities (snapshot)
  actorCitizenId?: Id<"citizens">
  organismId?: Id<"organisms">
  subjectKind: string // « services », « serviceVariants », « documentTemplates »…
  subjectId: string
  subjectLabel: string // « Acte de naissance · copie intégrale »
  /** Verbe localisé pour le feed UI (ex. « a publié », « a créé »). */
  uiVerb: string
  linkTo?: string // chemin Next.js (« /services/acte-naissance »)
  iconKey?: string // nom d'icône
  /** Détails non scellés (peut contenir le diff). */
  payload?: unknown
}

/**
 * Sérialise un payload de manière déterministe et calcule son SHA-256.
 * On évite d'ajouter de dépendance — on utilise WebCrypto disponible dans Convex.
 */
async function sha256Hex(payload: unknown): Promise<string> {
  const text = JSON.stringify(payload ?? null)
  const bytes = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
  return hex
}

/** Insère une ligne dans `auditLog` + `teamActivities`. */
export async function writeAudit(args: WriteAuditArgs): Promise<void> {
  const {
    ctx,
    verb,
    actorKind,
    actorAgentId,
    actorAgentName,
    actorCitizenId,
    organismId,
    subjectKind,
    subjectId,
    subjectLabel,
    uiVerb,
    linkTo,
    iconKey,
    payload,
  } = args

  const now = Date.now()
  const payloadHash = await sha256Hex(payload)

  await ctx.db.insert("auditLog", {
    verb,
    actorKind,
    actorAgentId,
    actorCitizenId,
    organismId,
    subjectKind,
    subjectId,
    occurredAt: now,
    payloadHash,
    payload,
  })

  await ctx.db.insert("teamActivities", {
    organismId,
    actorAgentId,
    actorDisplayName: actorAgentName ?? "Système",
    verb: uiVerb,
    subjectKind,
    subjectId,
    subjectLabel,
    linkTo,
    iconKey,
    occurredAt: now,
  })
}
