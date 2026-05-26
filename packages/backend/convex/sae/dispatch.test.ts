/**
 * Tests Phase Trous D — dispatch effectif vers Digitalium SAE.
 *
 * Couvre :
 *   - skip si organism n'a pas saeConfig digitalium
 *   - skip si secret env manquant → status="skipped"
 *   - fetch est appelé avec HMAC + X-Event-Id corrects
 *   - succès 200 → markDispatched (externalStatus=dispatched + externalSaeId)
 *   - échec 500 (attempts<3) → markFailed + reschedule (status reste
 *     "pending_dispatch")
 *   - échec final (attempts=3) → markFailed avec finalize=true
 *     (status="failed")
 *   - idempotence : 2e call si already dispatched → skip
 *
 * Pour mocker fetch on utilise `vi.stubGlobal("fetch", ...)`.
 */
import { register as registerAggregate } from "@convex-dev/aggregate/test"
import { convexTest, type TestConvex } from "convex-test"
import type { GenericSchema, SchemaDefinition } from "convex/server"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { createHmac } from "node:crypto"
import { api, internal } from "../_generated/api"
import type { Id } from "../_generated/dataModel"
import schema from "../schema"
import { triggers } from "../lib/triggers"
import { modules } from "../test.setup"

const AGGREGATE_NAMES = [
  "aggCitizensGlobal",
  "aggRequestsGlobal",
  "aggDocumentsGlobal",
  "aggArchivesGlobal",
  "aggRequestsByOrg",
  "aggDocumentsByOrg",
  "aggRequestsByOrgStatus",
  "aggArchivesByOrgStatus",
  "aggRequestsByOrgAgent",
  "aggRequestsByService",
  "aggRequestsByServiceVariant",
  "aggOrgsByStatus",
  "aggNotifsUnread",
] as const

function registerAggregates(
  t: TestConvex<SchemaDefinition<GenericSchema, boolean>>,
): void {
  for (const name of AGGREGATE_NAMES) registerAggregate(t, name)
}

const SECRET = "test-hmac-secret-do-not-use-in-prod"

interface Fixture {
  t: ReturnType<typeof convexTest>
  orgId: Id<"organisms">
  archiveId: Id<"archives">
}

async function buildFixture(): Promise<Fixture> {
  const t = convexTest(schema, modules)
  registerAggregates(t)
  const ids = await t.run(async (rawCtx) => {
    const ctx = { ...rawCtx, db: triggers.wrapDB(rawCtx).db }
    const orgId = await ctx.db.insert("organisms", {
      name: "DG Test",
      shortName: "DGT",
      category: "direction_generale",
      status: "active",
      saeConfig: {
        provider: "digitalium",
        digitaliumConnectorId: "cnx_test_abc",
        digitaliumBaseUrl: "https://sae.example.gov.ga",
      },
    })
    const archiveId = await ctx.db.insert("archives", {
      cote: "GA/EC/2026/00042",
      description: "Test archive dispatch",
      producerOrganismId: orgId,
      versedAt: Date.now(),
      dua: "5y",
      duaExpiresAt: Date.now() + 5 * 365 * 24 * 3600 * 1000,
      status: "active",
      finalSort: "À définir",
      sha256: "a".repeat(64),
      externalSaeKind: "digitalium",
      externalStatus: "pending_dispatch",
    })
    return { orgId, archiveId }
  })
  return { t, ...ids }
}

beforeEach(() => {
  vi.stubEnv("DIGITALIUM_HMAC_SECRET", SECRET)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

/* ============================================================
   toDigitalium — succès
   ============================================================ */

describe("toDigitalium — succès", () => {
  test("dispatch OK 200 → markDispatched", async () => {
    const f = await buildFixture()
    let capturedUrl = ""
    let capturedHeaders: Record<string, string> = {}
    let capturedBody = ""
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string, init?: RequestInit) => {
        capturedUrl = input
        capturedHeaders = (init?.headers ?? {}) as Record<string, string>
        capturedBody = String(init?.body ?? "")
        return new Response(
          JSON.stringify({ externalSaeId: "dgt_external_42" }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        )
      }),
    )

    const result = await f.t.action(internal.sae.dispatch.toDigitalium, {
      archiveId: f.archiveId,
    })
    expect((result as { dispatched?: boolean }).dispatched).toBe(true)
    expect(capturedUrl).toContain("/api/connectors/cnx_test_abc/events")
    expect(capturedHeaders["X-Event-Id"]).toBe(String(f.archiveId))
    expect(capturedHeaders["X-Digitalium-Signature"]).toMatch(/^sha256=/)

    // Vérification HMAC
    const expectedSig = createHmac("sha256", SECRET)
      .update(capturedBody)
      .digest("hex")
    expect(capturedHeaders["X-Digitalium-Signature"]).toBe(
      `sha256=${expectedSig}`,
    )

    const archive = await f.t.run((ctx) => ctx.db.get(f.archiveId))
    expect(archive?.externalStatus).toBe("dispatched")
    expect(archive?.externalSaeId).toBe("dgt_external_42")
  })

  test("réponse sans externalSaeId → utilise eventId comme fallback", async () => {
    const f = await buildFixture()
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } }),
      ),
    )
    await f.t.action(internal.sae.dispatch.toDigitalium, {
      archiveId: f.archiveId,
    })
    const archive = await f.t.run((ctx) => ctx.db.get(f.archiveId))
    expect(archive?.externalSaeId).toBe(String(f.archiveId))
  })
})

/* ============================================================
   toDigitalium — échecs + retry
   ============================================================ */

describe("toDigitalium — échecs", () => {
  test("HTTP 500 + attempts=0 → markFailed avec finalize=false (pending)", async () => {
    const f = await buildFixture()
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("Internal error", { status: 500 })),
    )
    const result = await f.t.action(internal.sae.dispatch.toDigitalium, {
      archiveId: f.archiveId,
    })
    expect((result as { retried?: boolean }).retried).toBe(true)
    const archive = await f.t.run((ctx) => ctx.db.get(f.archiveId))
    expect(archive?.externalStatus).toBe("pending_dispatch")
    expect(archive?.externalDispatchAttempts).toBe(1)
    expect(archive?.externalLastError).toContain("500")
  })

  test("HTTP 500 + attempts=2 → markFailed avec finalize=true (failed)", async () => {
    const f = await buildFixture()
    // Pré-positionner attempts=2 pour simuler 3e tentative
    await f.t.run(async (ctx) => {
      await ctx.db.patch(f.archiveId, { externalDispatchAttempts: 2 })
    })
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("Server down", { status: 503 })),
    )
    const result = await f.t.action(internal.sae.dispatch.toDigitalium, {
      archiveId: f.archiveId,
    })
    expect((result as { finalFailure?: boolean }).finalFailure).toBe(true)
    const archive = await f.t.run((ctx) => ctx.db.get(f.archiveId))
    expect(archive?.externalStatus).toBe("failed")
    expect(archive?.externalDispatchAttempts).toBe(3)
  })

  test("fetch throw (réseau down) → markFailed avec retry", async () => {
    const f = await buildFixture()
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNREFUSED")
      }),
    )
    const result = await f.t.action(internal.sae.dispatch.toDigitalium, {
      archiveId: f.archiveId,
    })
    expect((result as { retried?: boolean }).retried).toBe(true)
    const archive = await f.t.run((ctx) => ctx.db.get(f.archiveId))
    expect(archive?.externalLastError).toContain("ECONNREFUSED")
  })
})

/* ============================================================
   toDigitalium — skip cases
   ============================================================ */

describe("toDigitalium — skip", () => {
  test("secret env manquant → markSkipped, pas de fetch", async () => {
    const f = await buildFixture()
    vi.unstubAllEnvs() // retire le secret
    vi.stubEnv("DIGITALIUM_HMAC_SECRET", "")
    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)

    const result = await f.t.action(internal.sae.dispatch.toDigitalium, {
      archiveId: f.archiveId,
    })
    expect((result as { skipped?: boolean }).skipped).toBe(true)
    expect(fetchSpy).not.toHaveBeenCalled()
    const archive = await f.t.run((ctx) => ctx.db.get(f.archiveId))
    expect(archive?.externalStatus).toBe("skipped")
    expect(archive?.externalLastError).toContain("DIGITALIUM_HMAC_SECRET")
  })

  test("organism avec provider=local → skip wrong_provider", async () => {
    const f = await buildFixture()
    await f.t.run(async (ctx) => {
      await ctx.db.patch(f.orgId, {
        saeConfig: { provider: "local" },
      })
    })
    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)

    const result = await f.t.action(internal.sae.dispatch.toDigitalium, {
      archiveId: f.archiveId,
    })
    expect((result as { reason?: string }).reason).toBe("wrong_provider")
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  test("idempotence : archive déjà dispatched → skip", async () => {
    const f = await buildFixture()
    await f.t.run(async (ctx) => {
      await ctx.db.patch(f.archiveId, {
        externalStatus: "dispatched",
        externalSaeId: "previously_dispatched_id",
      })
    })
    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)
    const result = await f.t.action(internal.sae.dispatch.toDigitalium, {
      archiveId: f.archiveId,
    })
    expect((result as { reason?: string }).reason).toBe("already_dispatched")
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

void api // satisfait import
