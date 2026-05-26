/**
 * Tests Bloc 6 — SaeProvider Option C hybride.
 *
 * Couvre :
 *   - LocalSaeProvider.verse : insert + idempotence (par documentId, par cote)
 *   - LocalSaeProvider.getStatus : mapping correct status local → ArchiveStatus
 *   - getSaeProvider : factory renvoie LocalSaeProvider par défaut (saeConfig
 *     absent), DigitaliumSaeProvider quand provider="digitalium"
 *   - DigitaliumSaeProvider.verse : insert local + externalSaeKind="digitalium"
 *     + externalStatus="pending_dispatch" (skeleton v1)
 *   - Queries admin.archives.listForOrg/getDetail/getStatsForOrg
 */
import { register as registerAggregate } from "@convex-dev/aggregate/test"
import { convexTest, type TestConvex } from "convex-test"
import type { GenericSchema, SchemaDefinition } from "convex/server"
import { describe, expect, test } from "vitest"
import { api } from "../_generated/api"
import type { Id } from "../_generated/dataModel"
import schema from "../schema"
import { triggers } from "./triggers"
import { modules } from "../test.setup"
import { DigitaliumSaeProvider, LocalSaeProvider, getSaeProvider } from "./saeProvider"

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

interface Fixture {
  t: ReturnType<typeof convexTest>
  orgLocal: Id<"organisms">
  orgDigitalium: Id<"organisms">
  agentLocalToken: string
  agentLocalId: Id<"agents">
  agentDigToken: string
}

async function buildFixture(): Promise<Fixture> {
  const t = convexTest(schema, modules)
  registerAggregates(t)
  const seeded = await t.run(async (rawCtx) => {
    const ctx = { ...rawCtx, db: triggers.wrapDB(rawCtx).db }
    const orgLocal = await ctx.db.insert("organisms", {
      name: "DG État Civil",
      shortName: "DG EC",
      category: "direction_generale",
      status: "active",
      // pas de saeConfig → LocalSaeProvider par défaut
    })
    const orgDigitalium = await ctx.db.insert("organisms", {
      name: "DG Documentation",
      shortName: "DG DOC",
      category: "direction_generale",
      status: "active",
      saeConfig: {
        provider: "digitalium",
        digitaliumConnectorId: "cnx_test_xxx",
        digitaliumBaseUrl: "https://sae.example/gov",
      },
    })
    const agentLocalId = await ctx.db.insert("agents", {
      organismId: orgLocal,
      nip: "AL01",
      name: "Agent Local",
      email: "al@x",
      role: "officier_signataire",
    })
    await ctx.db.insert("agents", {
      organismId: orgDigitalium,
      nip: "AD01",
      name: "Agent Dig",
      email: "ad@x",
      role: "officier_signataire",
    })
    return { orgLocal, orgDigitalium, agentLocalId }
  })
  const al = await t.mutation(api.auth.signInWithNip, { nip: "AL01" })
  const ad = await t.mutation(api.auth.signInWithNip, { nip: "AD01" })
  return {
    t,
    ...seeded,
    agentLocalToken: al.token,
    agentDigToken: ad.token,
  }
}

// ====================================================================
// LocalSaeProvider
// ====================================================================

describe("LocalSaeProvider", () => {
  test("verse insère une archive avec champs minimum", async () => {
    const f = await buildFixture()
    const result = await f.t.run(async (ctx) => {
      const provider = new LocalSaeProvider()
      return await provider.verse(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ctx as any,
        {
          organismId: f.orgLocal,
          cote: "GA/EC/2026/00001",
          description: "Test",
          sha256: "a".repeat(64),
          duaCode: "5y",
          duaExpiresAt: Date.now() + 5 * 365 * 24 * 60 * 60 * 1000,
        },
      )
    })
    expect(result.cote).toBe("GA/EC/2026/00001")
    expect(result.alreadyExisted).toBe(false)
    expect(result.externalSaeId).toBeUndefined()
    const archive = await f.t.run((ctx) => ctx.db.get(result.archiveId))
    expect(archive?.status).toBe("active")
    expect(archive?.dua).toBe("5y")
    expect(archive?.externalSaeKind).toBeUndefined()
  })

  test("verse est idempotent : 2e appel avec même linkedDocumentId renvoie alreadyExisted=true", async () => {
    const f = await buildFixture()
    // Crée un vrai document (avec citizen + request réels) pour avoir un Id valide
    const { docId } = await f.t.run(async (ctx) => {
      const citizenId = await ctx.db.insert("citizens", {
        nip: "184127600504",
        name: "Marie",
        identityVerified: true,
        createdAt: Date.now(),
      })
      const serviceId = await ctx.db.insert("services", {
        organismId: f.orgLocal,
        slug: "t",
        title: "T",
        category: "État civil",
        fee: "Gratuit",
        delayHours: 48,
        status: "published",
      })
      const requestId = await ctx.db.insert("requests", {
        ref: "GC-T-XXX",
        citizenId,
        serviceId,
        organismId: f.orgLocal,
        status: "issued",
        progressPct: 100,
        depositedAt: Date.now(),
      })
      const docId = await ctx.db.insert("documents", {
        actNumber: "EC-T-001",
        requestId,
        citizenId,
        issuedByAgentId: f.agentLocalId,
        organismId: f.orgLocal,
        title: "Test",
        status: "issued",
        issuedAt: Date.now(),
        sha256: "0".repeat(64),
        qualifiedTimestamp: "now",
        qrCode: "Q",
        payload: {},
      })
      return { docId }
    })
    const id1 = await f.t.run((ctx) =>
      ctx.db.insert("archives", {
        cote: "GA/EC/2026/00002",
        description: "Existante",
        producerOrganismId: f.orgLocal,
        versedAt: Date.now(),
        dua: "5y",
        status: "active",
        finalSort: "—",
        sha256: "b".repeat(64),
        linkedDocumentId: docId,
      }),
    )
    const result = await f.t.run(async (ctx) => {
      const provider = new LocalSaeProvider()
      return await provider.verse(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ctx as any,
        {
          organismId: f.orgLocal,
          cote: "GA/EC/2026/00002-bis",
          description: "Tentative double",
          sha256: "c".repeat(64),
          duaCode: "5y",
          linkedDocumentId: docId,
        },
      )
    })
    expect(result.alreadyExisted).toBe(true)
    expect(result.archiveId).toBe(id1)
  })

  test("getStatus mappe les statuts locaux correctement", async () => {
    const f = await buildFixture()
    await f.t.run((ctx) =>
      ctx.db.insert("archives", {
        cote: "GA/EC/2026/STAT",
        description: "x",
        producerOrganismId: f.orgLocal,
        versedAt: Date.now(),
        dua: "5y",
        status: "scheduled_destruction",
        finalSort: "—",
        sha256: "d".repeat(64),
      }),
    )
    const status = await f.t.run(async (ctx) => {
      const provider = new LocalSaeProvider()
      return await provider.getStatus(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ctx as any,
        { cote: "GA/EC/2026/STAT" },
      )
    })
    expect(status?.status).toBe("pending")
  })

  test("getStatus renvoie null pour une cote inconnue", async () => {
    const f = await buildFixture()
    const status = await f.t.run(async (ctx) => {
      const provider = new LocalSaeProvider()
      return await provider.getStatus(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ctx as any,
        { cote: "INEXISTANT" },
      )
    })
    expect(status).toBeNull()
  })
})

// ====================================================================
// Factory getSaeProvider
// ====================================================================

describe("getSaeProvider factory", () => {
  test("renvoie LocalSaeProvider par défaut (saeConfig absent)", async () => {
    const f = await buildFixture()
    // L'instance de classe ne peut pas être retournée par t.run() (non
    // sérialisable Convex) — on lit `.kind` à l'intérieur.
    const kind = await f.t.run(async (ctx) => {
      const provider = await getSaeProvider(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ctx as any,
        f.orgLocal,
      )
      return provider.kind
    })
    expect(kind).toBe("local")
  })

  test("renvoie DigitaliumSaeProvider si saeConfig.provider=digitalium", async () => {
    const f = await buildFixture()
    const kind = await f.t.run(async (ctx) => {
      const provider = await getSaeProvider(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ctx as any,
        f.orgDigitalium,
      )
      return provider.kind
    })
    expect(kind).toBe("digitalium")
  })
})

// ====================================================================
// DigitaliumSaeProvider (skeleton v1)
// ====================================================================

describe("DigitaliumSaeProvider", () => {
  test("verse insère localement avec externalSaeKind=digitalium et pending_dispatch", async () => {
    const f = await buildFixture()
    const result = await f.t.run(async (ctx) => {
      const provider = new DigitaliumSaeProvider({
        connectorId: "cnx_xxx",
        baseUrl: "https://sae.example",
      })
      return await provider.verse(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ctx as any,
        {
          organismId: f.orgDigitalium,
          cote: "GA/DI/2026/00001",
          description: "Test digitalium",
          sha256: "e".repeat(64),
          duaCode: "30y",
        },
      )
    })
    expect(result.externalSaeKind).toBe("digitalium")
    const archive = await f.t.run((ctx) => ctx.db.get(result.archiveId))
    expect(archive?.externalSaeKind).toBe("digitalium")
    expect(archive?.externalStatus).toBe("pending_dispatch")
    expect(archive?.externalStatusUpdatedAt).toBeGreaterThan(0)
  })
})

// ====================================================================
// Queries admin.archives.*
// ====================================================================

describe("admin.archives queries", () => {
  test("listForOrg scope=all renvoie les archives de l'organisme", async () => {
    const f = await buildFixture()
    await f.t.run(async (ctx) => {
      await ctx.db.insert("archives", {
        cote: "GA/EC/2026/A01",
        description: "Active",
        producerOrganismId: f.orgLocal,
        versedAt: Date.now(),
        dua: "5y",
        status: "active",
        finalSort: "—",
        sha256: "f".repeat(64),
      })
      await ctx.db.insert("archives", {
        cote: "GA/EC/2026/D01",
        description: "Détruite",
        producerOrganismId: f.orgLocal,
        versedAt: Date.now() - 86_400_000,
        dua: "1y",
        status: "destroyed",
        finalSort: "Éliminé",
        sha256: "0".repeat(64),
      })
    })
    const list = await f.t.query(api.admin.archives.listForOrg, {
      token: f.agentLocalToken,
      scope: "all",
    })
    expect(list.length).toBeGreaterThanOrEqual(2)
  })

  test("listForOrg scope=dua_expired filtre uniquement les DUA dépassées", async () => {
    const f = await buildFixture()
    const past = Date.now() - 30 * 24 * 60 * 60 * 1000
    await f.t.run(async (ctx) => {
      await ctx.db.insert("archives", {
        cote: "GA/EC/EXP/01",
        description: "Expirée",
        producerOrganismId: f.orgLocal,
        versedAt: past - 1000,
        dua: "1y",
        duaExpiresAt: past,
        status: "active",
        finalSort: "—",
        sha256: "1".repeat(64),
      })
      await ctx.db.insert("archives", {
        cote: "GA/EC/FRESH/01",
        description: "Fraîche",
        producerOrganismId: f.orgLocal,
        versedAt: Date.now(),
        dua: "5y",
        duaExpiresAt: Date.now() + 5 * 365 * 24 * 60 * 60 * 1000,
        status: "active",
        finalSort: "—",
        sha256: "2".repeat(64),
      })
    })
    const list = await f.t.query(api.admin.archives.listForOrg, {
      token: f.agentLocalToken,
      scope: "dua_expired",
    })
    expect(list).toHaveLength(1)
    expect(list[0].cote).toBe("GA/EC/EXP/01")
  })

  test("getDetail refuse une archive d'un autre organisme", async () => {
    const f = await buildFixture()
    await f.t.run((ctx) =>
      ctx.db.insert("archives", {
        cote: "GA/DI/OTHER/01",
        description: "x",
        producerOrganismId: f.orgDigitalium,
        versedAt: Date.now(),
        dua: "5y",
        status: "active",
        finalSort: "—",
        sha256: "3".repeat(64),
      }),
    )
    await expect(
      f.t.query(api.admin.archives.getDetail, {
        token: f.agentLocalToken,
        cote: "GA/DI/OTHER/01",
      }),
    ).rejects.toThrowError(/périmètre/i)
  })

  test("getStatsForOrg renvoie providerKind correct", async () => {
    const f = await buildFixture()
    const statsLocal = await f.t.query(api.admin.archives.getStatsForOrg, {
      token: f.agentLocalToken,
    })
    expect(statsLocal.providerKind).toBe("local")
    const statsDig = await f.t.query(api.admin.archives.getStatsForOrg, {
      token: f.agentDigToken,
    })
    expect(statsDig.providerKind).toBe("digitalium")
  })

  test("getStatsForOrg compte correctement total + active + DUA expirée", async () => {
    const f = await buildFixture()
    const past = Date.now() - 30 * 24 * 60 * 60 * 1000
    await f.t.run(async (ctx) => {
      await ctx.db.insert("archives", {
        cote: "GA/STATS/01",
        description: "x",
        producerOrganismId: f.orgLocal,
        versedAt: Date.now(),
        dua: "5y",
        status: "active",
        finalSort: "—",
        sha256: "4".repeat(64),
      })
      await ctx.db.insert("archives", {
        cote: "GA/STATS/02",
        description: "x",
        producerOrganismId: f.orgLocal,
        versedAt: past,
        dua: "1y",
        duaExpiresAt: past,
        status: "active",
        finalSort: "—",
        sha256: "5".repeat(64),
      })
      await ctx.db.insert("archives", {
        cote: "GA/STATS/03",
        description: "x",
        producerOrganismId: f.orgLocal,
        versedAt: past,
        dua: "1y",
        status: "destroyed",
        finalSort: "—",
        sha256: "6".repeat(64),
      })
    })
    const stats = await f.t.query(api.admin.archives.getStatsForOrg, {
      token: f.agentLocalToken,
    })
    expect(stats.total).toBe(3)
    expect(stats.active).toBe(2)
    expect(stats.duaExpired).toBe(1)
  })
})
