"use node"

/**
 * Dispatch effectif vers Digitalium SAE (Phase Trous D — Bloc 6 Phase 4).
 *
 * Architecture (ADR-0021 du projet digitalium-sae) :
 *   - HMAC-SHA256 signing : `signature = sha256(body, DIGITALIUM_HMAC_SECRET)`
 *   - Headers : `X-Event-Id` (idempotency key), `X-Digitalium-Signature: sha256=...`
 *   - POST `{baseUrl}/api/connectors/{connectorId}/events`
 *
 * Cycle de vie :
 *   1. `DigitaliumSaeProvider.verse()` insère localement + scheduler.runAfter(0, …)
 *      cette action.
 *   2. Cette action lit archive + organism + secret env, compose le payload,
 *      signe, fetch.
 *   3. Si OK → `markDispatched` patche externalSaeId/Status.
 *   4. Si KO + attempts < 3 → patch attempts++ et re-scheduler avec backoff
 *      exponentiel (10s → 60s → 300s).
 *   5. Si KO + attempts >= 3 → `markFailed` externalStatus="failed" + lastError.
 *
 * **V1 : secret depuis `process.env.DIGITALIUM_HMAC_SECRET`.** Si absent,
 * l'action logge un warn et marque "skipped" (cas dev/test sans config).
 *
 * **Idempotence** : Digitalium est censé déduper sur `X-Event-Id = archiveId`.
 * Si on re-dispatch un archiveId déjà sent, le SAE renvoie 200 sans rien
 * faire — cf. la doc ADR-0021.
 */

import { createHmac } from "node:crypto"
import { v } from "convex/values"
import { internal } from "../_generated/api"
import {
  action,
  internalMutation,
  internalQuery,
} from "../_generated/server"

const MAX_ATTEMPTS = 3
const BACKOFF_SECONDS = [10, 60, 300]

interface DispatchPayload {
  eventId: string
  occurredAt: number
  archive: {
    cote: string
    description: string
    producerOrganismId: string
    sha256: string
    qualifiedTimestamp?: string
    dua: string
    duaExpiresAt?: number
    finalSort: string
    sizeBytes?: number
  }
}

/* ============================================================
   Queries / Mutations internes
   ============================================================ */

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

/* ============================================================
   Action principale — dispatch HMAC réel
   ============================================================ */

export const toDigitalium = action({
  args: { archiveId: v.id("archives") },
  handler: async (ctx, { archiveId }) => {
    const ctxData = await ctx.runQuery(
      internal.sae.dispatch.loadDispatchContext,
      { archiveId },
    )
    if (!ctxData) return { skipped: true, reason: "archive_not_found" }
    if (!ctxData.organism) return { skipped: true, reason: "organism_not_found" }

    const cfg = ctxData.organism.saeConfig
    if (cfg?.provider !== "digitalium") {
      // Mauvais provider : on ne devrait pas être appelé ici
      return { skipped: true, reason: "wrong_provider" }
    }

    // Idempotence : déjà dispatché → no-op
    if (ctxData.archive.externalStatus === "dispatched") {
      return { skipped: true, reason: "already_dispatched" }
    }

    const secret = process.env.DIGITALIUM_HMAC_SECRET
    const baseUrl = cfg.digitaliumBaseUrl
    const connectorId = cfg.digitaliumConnectorId

    if (!secret || !baseUrl || !connectorId) {
      // Config incomplète : on skip plutôt que de boucler en échec
      await ctx.runMutation(internal.sae.dispatch.markSkipped, {
        archiveId,
        reason: !secret
          ? "missing_env_DIGITALIUM_HMAC_SECRET"
          : "missing_baseUrl_or_connectorId",
      })
      return { skipped: true, reason: "missing_config" }
    }

    // Compose payload
    const payload: DispatchPayload = {
      eventId: String(archiveId), // = X-Event-Id pour idempotence côté SAE
      occurredAt: Date.now(),
      archive: {
        cote: ctxData.archive.cote,
        description: ctxData.archive.description,
        producerOrganismId: ctxData.archive.producerOrganismId,
        sha256: ctxData.archive.sha256,
        qualifiedTimestamp: ctxData.archive.qualifiedTimestamp,
        dua: ctxData.archive.dua,
        duaExpiresAt: ctxData.archive.duaExpiresAt,
        finalSort: ctxData.archive.finalSort,
        sizeBytes: ctxData.archive.sizeBytes,
      },
    }
    const body = JSON.stringify(payload)
    const signature = createHmac("sha256", secret).update(body).digest("hex")

    const url = `${baseUrl.replace(/\/$/, "")}/api/connectors/${connectorId}/events`
    const attempts = ctxData.archive.externalDispatchAttempts ?? 0

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Event-Id": payload.eventId,
          "X-Digitalium-Signature": `sha256=${signature}`,
        },
        body,
      })

      if (!res.ok) {
        const text = await safeText(res)
        return await handleFailure(
          ctx,
          archiveId,
          attempts,
          `HTTP ${res.status}: ${text.slice(0, 200)}`,
        )
      }

      const json = (await res.json().catch(() => ({}))) as {
        externalSaeId?: string
      }
      // Si le SAE ne renvoie pas d'id, on stocke l'eventId comme fallback
      await ctx.runMutation(internal.sae.dispatch.markDispatched, {
        archiveId,
        externalSaeId: json.externalSaeId ?? payload.eventId,
      })
      return { dispatched: true }
    } catch (e) {
      return await handleFailure(
        ctx,
        archiveId,
        attempts,
        e instanceof Error ? e.message : String(e),
      )
    }
  },
})

async function handleFailure(
  ctx: Parameters<typeof toDigitalium.handler>[0],
  archiveId: Parameters<typeof toDigitalium.handler>[1]["archiveId"],
  currentAttempts: number,
  error: string,
): Promise<{ retried: boolean; finalFailure?: boolean }> {
  const nextAttempts = currentAttempts + 1
  const willRetry = nextAttempts < MAX_ATTEMPTS

  await ctx.runMutation(internal.sae.dispatch.markFailed, {
    archiveId,
    error,
    nextAttempts,
    finalize: !willRetry,
  })

  if (willRetry) {
    const backoff = BACKOFF_SECONDS[currentAttempts] ?? 300
    await ctx.scheduler.runAfter(
      backoff * 1000,
      internal.sae.dispatch.toDigitalium,
      { archiveId },
    )
    return { retried: true }
  }
  return { retried: false, finalFailure: true }
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text()
  } catch {
    return "<no body>"
  }
}
