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

// ────────── citizens ──────────
triggers.register("citizens", aggCitizensGlobal.trigger())

// ────────── organisms ──────────
triggers.register("organisms", aggOrgsByStatus.trigger())

// ────────── requests ──────────
triggers.register("requests", aggRequestsGlobal.trigger())
triggers.register("requests", aggRequestsByOrg.trigger())
triggers.register("requests", aggRequestsByOrgStatus.trigger())
triggers.register("requests", aggRequestsByOrgAgent.trigger())
triggers.register("requests", aggRequestsByService.trigger())
triggers.register("requests", aggRequestsByServiceVariant.trigger())

// ────────── documents ──────────
triggers.register("documents", aggDocumentsGlobal.trigger())
triggers.register("documents", aggDocumentsByOrg.trigger())

// ────────── archives ──────────
triggers.register("archives", aggArchivesGlobal.trigger())
triggers.register("archives", aggArchivesByOrgStatus.trigger())

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
