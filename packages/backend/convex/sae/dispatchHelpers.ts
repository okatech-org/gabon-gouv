/**
 * Helpers V8 pour le dispatch SAE (Phase Trous D).
 *
 * Séparés de `sae/dispatch.ts` (qui est en `"use node"` pour faire fetch +
 * HMAC) parce que Convex interdit les queries/mutations dans un module Node.
 *
 * Les 4 fonctions ici sont appelées par l'action `toDigitalium` via
 * `ctx.runQuery` / `ctx.runMutation`.
 */

import { v } from "convex/values"
import { internal } from "../_generated/api"
import { internalMutation, internalQuery } from "../_generated/server"

export const loadDispatchContext = internalQuery({
  args: { archiveId: v.id("archives") },
  handler: async (ctx, { archiveId }) => {
    const archive = await ctx.db.get(archiveId)
    if (!archive) return null
    const organism = await ctx.db.get(archive.producerOrganismId)
    return {
      archive: {
        _id: archive._id,
        cote: archive.cote,
        description: archive.description,
        producerOrganismId: String(archive.producerOrganismId),
        sha256: archive.sha256,
        qualifiedTimestamp: archive.qualifiedTimestamp,
        dua: archive.dua,
        duaExpiresAt: archive.duaExpiresAt,
        finalSort: archive.finalSort,
        sizeBytes: archive.sizeBytes,
        externalStatus: archive.externalStatus,
        externalDispatchAttempts: archive.externalDispatchAttempts ?? 0,
      },
      organism: organism
        ? {
            saeConfig: organism.saeConfig,
          }
        : null,
    }
  },
})

export const markDispatched = internalMutation({
  args: {
    archiveId: v.id("archives"),
    externalSaeId: v.string(),
  },
  handler: async (ctx, { archiveId, externalSaeId }) => {
    await ctx.db.patch(archiveId, {
      externalSaeId,
      externalStatus: "dispatched",
      externalStatusUpdatedAt: Date.now(),
      externalLastError: undefined,
    })
  },
})

export const markFailed = internalMutation({
  args: {
    archiveId: v.id("archives"),
    error: v.string(),
    nextAttempts: v.number(),
    finalize: v.boolean(),
  },
  handler: async (ctx, { archiveId, error, nextAttempts, finalize }) => {
    await ctx.db.patch(archiveId, {
      externalStatus: finalize ? "failed" : "pending_dispatch",
      externalStatusUpdatedAt: Date.now(),
      externalDispatchAttempts: nextAttempts,
      externalLastError: error.slice(0, 512),
    })
  },
})

export const markSkipped = internalMutation({
  args: { archiveId: v.id("archives"), reason: v.string() },
  handler: async (ctx, { archiveId, reason }) => {
    await ctx.db.patch(archiveId, {
      externalStatus: "skipped",
      externalStatusUpdatedAt: Date.now(),
      externalLastError: reason.slice(0, 512),
    })
  },
})

/**
 * Planifie un retry de toDigitalium. Vit dans dispatchHelpers (V8) pour
 * que dispatch.ts (Node) n'ait pas à se référencer lui-même via
 * `internal.sae.dispatch.toDigitalium` — ça créait une dépendance
 * circulaire de types que Convex tsc ne savait pas résoudre.
 */
export const scheduleRetry = internalMutation({
  args: { archiveId: v.id("archives"), delaySeconds: v.number() },
  handler: async (ctx, { archiveId, delaySeconds }) => {
    await ctx.scheduler.runAfter(
      delaySeconds * 1000,
      internal.sae.dispatch.toDigitalium,
      { archiveId },
    )
  },
})
