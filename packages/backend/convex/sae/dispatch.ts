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
 *
 * **Architecture fichiers** : les queries/mutations associées
 * (loadDispatchContext, markDispatched, markFailed, markSkipped) vivent dans
 * `sae/dispatchHelpers.ts` (sans "use node") car Convex interdit les queries
 * et mutations dans un module Node.
 */

import { createHmac } from "node:crypto"
import { v } from "convex/values"
import type { Id } from "../_generated/dataModel"
import type { ActionCtx } from "../_generated/server"
import { internal } from "../_generated/api"
import { internalAction } from "../_generated/server"

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

interface DispatchContextResult {
  archive: {
    _id: Id<"archives">
    cote: string
    description: string
    producerOrganismId: string
    sha256: string
    qualifiedTimestamp?: string
    dua: string
    duaExpiresAt?: number
    finalSort: string
    sizeBytes?: number
    externalStatus?: string
    externalDispatchAttempts: number
  }
  organism: {
    saeConfig?: {
      provider: "local" | "digitalium"
      digitaliumConnectorId?: string
      digitaliumBaseUrl?: string
    }
  } | null
}

interface DispatchResult {
  skipped?: boolean
  reason?: string
  dispatched?: boolean
  retried?: boolean
  finalFailure?: boolean
}

export const toDigitalium = internalAction({
  args: { archiveId: v.id("archives") },
  handler: async (ctx, { archiveId }): Promise<DispatchResult> => {
    const ctxData: DispatchContextResult | null = await ctx.runQuery(
      internal.sae.dispatchHelpers.loadDispatchContext,
      { archiveId },
    )
    if (!ctxData) return { skipped: true, reason: "archive_not_found" }
    if (!ctxData.organism) return { skipped: true, reason: "organism_not_found" }

    const cfg = ctxData.organism.saeConfig
    if (cfg?.provider !== "digitalium") {
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
      await ctx.runMutation(internal.sae.dispatchHelpers.markSkipped, {
        archiveId,
        reason: !secret
          ? "missing_env_DIGITALIUM_HMAC_SECRET"
          : "missing_baseUrl_or_connectorId",
      })
      return { skipped: true, reason: "missing_config" }
    }

    // Compose payload
    const payload: DispatchPayload = {
      eventId: String(archiveId),
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
    const attempts: number = ctxData.archive.externalDispatchAttempts ?? 0

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
      await ctx.runMutation(internal.sae.dispatchHelpers.markDispatched, {
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
  ctx: ActionCtx,
  archiveId: Id<"archives">,
  currentAttempts: number,
  error: string,
): Promise<{ retried: boolean; finalFailure?: boolean }> {
  const nextAttempts = currentAttempts + 1
  const willRetry = nextAttempts < MAX_ATTEMPTS

  await ctx.runMutation(internal.sae.dispatchHelpers.markFailed, {
    archiveId,
    error,
    nextAttempts,
    finalize: !willRetry,
  })

  if (willRetry) {
    const backoff = BACKOFF_SECONDS[currentAttempts] ?? 300
    // Délègue le scheduling à dispatchHelpers.scheduleRetry (V8) pour
    // éviter de référencer dispatch.toDigitalium depuis dispatch.ts
    // (circular dep que tsc strict de Convex ne savait pas résoudre).
    await ctx.runMutation(internal.sae.dispatchHelpers.scheduleRetry, {
      archiveId,
      delaySeconds: backoff,
    })
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
