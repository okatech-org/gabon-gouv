/**
 * Tests d'authentification — faux IdP NIP (à remplacer par OIDC réel plus tard).
 */
import { convexTest } from "convex-test"
import { beforeEach, describe, expect, test } from "vitest"
import { api } from "./_generated/api"
import schema from "./schema"
import { modules } from "./test.setup"

async function seedAgent(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const orgId = await ctx.db.insert("organisms", {
      name: "DG État Civil",
      shortName: "DG EC",
      category: "direction_generale",
      status: "active",
    })
    const agentId = await ctx.db.insert("agents", {
      organismId: orgId,
      nip: "198501100001",
      name: "Yolande NGUEMA",
      email: "y@x",
      role: "agent_instructeur",
    })
    return { orgId, agentId }
  })
}

describe("signInWithNip", () => {
  test("retourne un token + expiration pour un NIP valide", async () => {
    const t = convexTest(schema, modules)
    await seedAgent(t)
    const { token, expiresAt } = await t.mutation(api.auth.signInWithNip, {
      nip: "198501100001",
    })
    expect(token).toMatch(/^[a-z0-9]+-[a-z0-9]+-[a-z0-9]+-[a-z0-9]+$/)
    expect(expiresAt).toBeGreaterThan(Date.now())
  })

  test("accepte un NIP avec espaces", async () => {
    const t = convexTest(schema, modules)
    await seedAgent(t)
    const { token } = await t.mutation(api.auth.signInWithNip, {
      nip: "198 50 11 00 001",
    })
    expect(token).toBeDefined()
  })

  test("rejette un NIP inconnu", async () => {
    const t = convexTest(schema, modules)
    await seedAgent(t)
    await expect(
      t.mutation(api.auth.signInWithNip, { nip: "000000000000" }),
    ).rejects.toThrowError(/NIP inconnu/)
  })

  test("persiste la session dans authSessions", async () => {
    const t = convexTest(schema, modules)
    const { agentId } = await seedAgent(t)
    const { token } = await t.mutation(api.auth.signInWithNip, {
      nip: "198501100001",
    })
    const session = await t.run((ctx) =>
      ctx.db
        .query("authSessions")
        .withIndex("by_token", (q) => q.eq("token", token))
        .unique(),
    )
    expect(session?.agentId).toBe(agentId)
  })
})

describe("currentAgent", () => {
  let token: string
  let t: ReturnType<typeof convexTest>

  beforeEach(async () => {
    t = convexTest(schema, modules)
    await seedAgent(t)
    const res = await t.mutation(api.auth.signInWithNip, { nip: "198501100001" })
    token = res.token
  })

  test("retourne le profil de l'agent + son organisme", async () => {
    const agent = await t.query(api.auth.currentAgent, { token })
    expect(agent).toMatchObject({
      name: "Yolande NGUEMA",
      role: "agent_instructeur",
      organism: { shortName: "DG EC" },
    })
  })

  test("retourne null pour un token absent", async () => {
    const agent = await t.query(api.auth.currentAgent, { token: undefined })
    expect(agent).toBeNull()
  })

  test("retourne null pour un token invalide", async () => {
    const agent = await t.query(api.auth.currentAgent, { token: "bogus" })
    expect(agent).toBeNull()
  })

  test("retourne null quand la session est expirée", async () => {
    // Force l'expiration en patchant la session
    await t.run(async (ctx) => {
      const session = await ctx.db
        .query("authSessions")
        .withIndex("by_token", (q) => q.eq("token", token))
        .unique()
      if (session) {
        await ctx.db.patch(session._id, { expiresAt: Date.now() - 1000 })
      }
    })
    const agent = await t.query(api.auth.currentAgent, { token })
    expect(agent).toBeNull()
  })
})

describe("signOut", () => {
  test("supprime la session — currentAgent devient null", async () => {
    const t = convexTest(schema, modules)
    await seedAgent(t)
    const { token } = await t.mutation(api.auth.signInWithNip, {
      nip: "198501100001",
    })

    expect(await t.query(api.auth.currentAgent, { token })).not.toBeNull()
    await t.mutation(api.auth.signOut, { token })
    expect(await t.query(api.auth.currentAgent, { token })).toBeNull()
  })

  test("est idempotent — pas d'erreur si la session n'existe pas", async () => {
    const t = convexTest(schema, modules)
    await expect(
      t.mutation(api.auth.signOut, { token: "never-existed" }),
    ).resolves.toBeNull()
  })
})
