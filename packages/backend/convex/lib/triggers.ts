/**
 * Wrappers `mutation` / `internalMutation` qui branchent automatiquement les
 * triggers d'agrégats déclarés dans `../aggregates.ts` (ADR-0007).
 *
 * IMPORTANT : tous les fichiers `convex/*.ts` qui écrivent dans les tables
 * tracées par un agrégat doivent importer `mutation` / `internalMutation`
 * **d'ici** plutôt que depuis `./_generated/server`. Sinon les arbres
 * ne sont pas mis à jour et les KPIs divergent.
 *
 * Tables tracées (voir aggregates.ts) :
 *   - citizens, requests, documents, archives, organisms, notifications
 *
 * Les autres tables peuvent continuer à utiliser `_generated/server`
 * directement sans conséquence — mais pour éviter la confusion on
 * recommande d'utiliser systématiquement ces wrappers.
 */

import {
  customCtx,
  customMutation,
} from "convex-helpers/server/customFunctions"
import { Triggers } from "convex-helpers/server/triggers"
import {
  mutation as rawMutation,
  internalMutation as rawInternalMutation,
} from "../_generated/server"
import type { DataModel } from "../_generated/dataModel"
import {
  aggArchivesByOrgStatus,
  aggArchivesGlobal,
  aggCitizensGlobal,
  aggDocumentsByOrg,
  aggDocumentsGlobal,
  aggNotifsUnread,
  aggOrgsByStatus,
  aggRequestsByOrg,
  aggRequestsByOrgAgent,
  aggRequestsByOrgStatus,
  aggRequestsByService,
  aggRequestsByServiceVariant,
  aggRequestsGlobal,
} from "../aggregates"

export const triggers = new Triggers<DataModel>()

// NB : on utilise `idempotentTrigger()` partout pour tolérer les divergences
// transitoires entre la table et l'arbre d'agrégat (notamment au reset du
// seed et lors d'un backfill). Un delete d'une row absente de l'arbre est
// silencieusement ignoré au lieu de jeter DELETE_MISSING_KEY.

// ────────── citizens ──────────
triggers.register("citizens", aggCitizensGlobal.idempotentTrigger())

// ────────── organisms ──────────
triggers.register("organisms", aggOrgsByStatus.idempotentTrigger())

// ────────── requests ──────────
triggers.register("requests", aggRequestsGlobal.idempotentTrigger())
triggers.register("requests", aggRequestsByOrg.idempotentTrigger())
triggers.register("requests", aggRequestsByOrgStatus.idempotentTrigger())
triggers.register("requests", aggRequestsByOrgAgent.idempotentTrigger())
triggers.register("requests", aggRequestsByService.idempotentTrigger())
triggers.register("requests", aggRequestsByServiceVariant.idempotentTrigger())

// ────────── documents ──────────
triggers.register("documents", aggDocumentsGlobal.idempotentTrigger())
triggers.register("documents", aggDocumentsByOrg.idempotentTrigger())

// ────────── archives ──────────
triggers.register("archives", aggArchivesGlobal.idempotentTrigger())
triggers.register("archives", aggArchivesByOrgStatus.idempotentTrigger())

// ────────── notifications ──────────
// Trigger conditionnel : on n'insère dans l'arbre que les non lues.
triggers.register("notifications", async (ctx, change) => {
  const wasUnread =
    change.oldDoc !== null && change.oldDoc.readAt === undefined
  const isUnread =
    change.newDoc !== null && change.newDoc.readAt === undefined

  if (!wasUnread && isUnread && change.newDoc) {
    await aggNotifsUnread.insert(ctx, change.newDoc)
  } else if (wasUnread && !isUnread && change.oldDoc) {
    await aggNotifsUnread.delete(ctx, change.oldDoc)
  } else if (wasUnread && isUnread && change.oldDoc && change.newDoc) {
    await aggNotifsUnread.replace(ctx, change.oldDoc, change.newDoc)
  }
})

// ============================================================
// Wrappers exportés — à utiliser à la place de _generated/server
// ============================================================

export const mutation = customMutation(
  rawMutation,
  customCtx(triggers.wrapDB),
)

export const internalMutation = customMutation(
  rawInternalMutation,
  customCtx(triggers.wrapDB),
)
