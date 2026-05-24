/**
 * Tests des mutations admin/services.ts (Bloc 1.3).
 */
import { register as registerAggregate } from "@convex-dev/aggregate/test"
import { convexTest, type TestConvex } from "convex-test"
import type { GenericSchema, SchemaDefinition } from "convex/server"
import { describe, expect, test } from "vitest"
import { api } from "../_generated/api"
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

interface Fixture {
  t: ReturnType<typeof convexTest>
  orgId: Id<"organisms">
  yolandeToken: string // agent_instructeur (pas de droits service)
  cyrilToken: string // chef_service (créer/éditer, pas publier)
  patriceToken: string // officier_signataire (pas de droits service)
  mireilleToken: string // admin_organisme (tous les droits)
  citizenId: Id<"citizens">
}

async function buildFixture(): Promise<Fixture> {
  const t = convexTest(schema, modules)
  registerAggregates(t)

  const seeded = await t.run(async (rawCtx) => {
    const ctx = { ...rawCtx, db: triggers.wrapDB(rawCtx).db }
    const orgId = await ctx.db.insert("organisms", {
      name: "DG État Civil",
      shortName: "DG EC",
      category: "direction_generale",
      status: "active",
    })
    const yolandeId = await ctx.db.insert("agents", {
      organismId: orgId,
      nip: "198501100001",
      name: "Yolande",
      email: "y@x",
      role: "agent_instructeur",
    })
    const cyrilId = await ctx.db.insert("agents", {
      organismId: orgId,
      nip: "197603100002",
      name: "Cyril",
      email: "c@x",
      role: "chef_service",
    })
    const patriceId = await ctx.db.insert("agents", {
      organismId: orgId,
      nip: "196812100003",
      name: "Patrice",
      email: "p@x",
      role: "officier_signataire",
    })
    const mireilleId = await ctx.db.insert("agents", {
      organismId: orgId,
      nip: "197003100005",
      name: "Mireille",
      email: "m@x",
      role: "admin_organisme",
    })
    void yolandeId
    void cyrilId
    void patriceId
    void mireilleId
    await ctx.db.insert("serviceCategories", {
      slug: "etat-civil",
      label: "État civil",
      icon: "fileText",
      color: "#1a4480",
      order: 1,
    })
    const citizenId = await ctx.db.insert("citizens", {
      nip: "184127600504",
      name: "Marie OBAME",
      identityVerified: true,
      createdAt: Date.now(),
    })
    return { orgId, citizenId }
  })

  const yolande = await t.mutation(api.auth.signInWithNip, {
    nip: "198501100001",
  })
  const cyril = await t.mutation(api.auth.signInWithNip, {
    nip: "197603100002",
  })
  const patrice = await t.mutation(api.auth.signInWithNip, {
    nip: "196812100003",
  })
  const mireille = await t.mutation(api.auth.signInWithNip, {
    nip: "197003100005",
  })

  return {
    t,
    ...seeded,
    yolandeToken: yolande.token,
    cyrilToken: cyril.token,
    patriceToken: patrice.token,
    mireilleToken: mireille.token,
  }
}

// ====================================================================
// createService
// ====================================================================

describe("createService", () => {
  test("crée un service en draft avec une variante par défaut", async () => {
    const f = await buildFixture()
    const { slug } = await f.t.mutation(api.admin.services.createService, {
      token: f.cyrilToken,
      title: "Acte de naissance",
      categorySlug: "etat-civil",
      description: "Demander un acte de naissance.",
    })
    expect(slug).toBe("acte-de-naissance")

    const service = await f.t.run((ctx) =>
      ctx.db
        .query("services")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique(),
    )
    expect(service?.status).toBe("draft")
    expect(service?.title).toBe("Acte de naissance")

    const variants = await f.t.run((ctx) =>
      ctx.db
        .query("serviceVariants")
        .withIndex("by_service", (q) => q.eq("serviceId", service!._id))
        .collect(),
    )
    expect(variants).toHaveLength(1)
    expect(variants[0]?.isDefault).toBe(true)
  })

  test("refuse un agent_instructeur (pas la permission)", async () => {
    const f = await buildFixture()
    await expect(
      f.t.mutation(api.admin.services.createService, {
        token: f.yolandeToken,
        title: "X",
        categorySlug: "etat-civil",
      }),
    ).rejects.toThrowError(/Action "service\.create" refusée/)
  })

  test("génère un suffixe en cas de collision de slug", async () => {
    const f = await buildFixture()
    await f.t.mutation(api.admin.services.createService, {
      token: f.cyrilToken,
      title: "Acte de naissance",
      categorySlug: "etat-civil",
    })
    const second = await f.t.mutation(api.admin.services.createService, {
      token: f.cyrilToken,
      title: "Acte de naissance",
      categorySlug: "etat-civil",
    })
    expect(second.slug).toBe("acte-de-naissance-2")
  })

  test("refuse une catégorie inconnue", async () => {
    const f = await buildFixture()
    await expect(
      f.t.mutation(api.admin.services.createService, {
        token: f.cyrilToken,
        title: "X",
        categorySlug: "inexistante",
      }),
    ).rejects.toThrowError(/Catégorie inconnue/)
  })

  test("écrit une ligne d'audit + une activité d'équipe", async () => {
    const f = await buildFixture()
    await f.t.mutation(api.admin.services.createService, {
      token: f.cyrilToken,
      title: "Test audit",
      categorySlug: "etat-civil",
    })
    const audit = await f.t.run((ctx) =>
      ctx.db.query("auditLog").collect(),
    )
    expect(audit.some((a) => a.verb === "service.created")).toBe(true)
    const activity = await f.t.run((ctx) =>
      ctx.db.query("teamActivities").collect(),
    )
    expect(
      activity.some((a) => a.verb === "a créé le service"),
    ).toBe(true)
  })
})

// ====================================================================
// updateService
// ====================================================================

describe("updateService", () => {
  test("met à jour les champs métier", async () => {
    const f = await buildFixture()
    const { slug } = await f.t.mutation(api.admin.services.createService, {
      token: f.cyrilToken,
      title: "Original",
      categorySlug: "etat-civil",
    })
    await f.t.mutation(api.admin.services.updateService, {
      token: f.cyrilToken,
      slug,
      patch: {
        description: "Nouvelle description",
        whoCanApply: "Toute personne majeure",
        delayHours: 24,
        fee: "500 FCFA",
        feeFcfa: 500,
      },
    })
    const service = await f.t.run((ctx) =>
      ctx.db
        .query("services")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique(),
    )
    expect(service?.description).toBe("Nouvelle description")
    expect(service?.whoCanApply).toBe("Toute personne majeure")
    expect(service?.delayHours).toBe(24)
    expect(service?.fee).toBe("500 FCFA")
    expect(service?.feeFcfa).toBe(500)
  })

  test("change de catégorie en mettant à jour le label dénormalisé", async () => {
    const f = await buildFixture()
    await f.t.run(async (ctx) => {
      await ctx.db.insert("serviceCategories", {
        slug: "justice",
        label: "Justice",
        icon: "scale",
        color: "#000",
        order: 2,
      })
    })
    const { slug } = await f.t.mutation(api.admin.services.createService, {
      token: f.cyrilToken,
      title: "X",
      categorySlug: "etat-civil",
    })
    await f.t.mutation(api.admin.services.updateService, {
      token: f.cyrilToken,
      slug,
      patch: { categorySlug: "justice" },
    })
    const service = await f.t.run((ctx) =>
      ctx.db
        .query("services")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique(),
    )
    expect(service?.categorySlug).toBe("justice")
    expect(service?.category).toBe("Justice")
  })
})

// ====================================================================
// publishService — checklist
// ====================================================================

describe("publishService", () => {
  test("refuse de publier sans prérequis", async () => {
    const f = await buildFixture()
    const { slug } = await f.t.mutation(api.admin.services.createService, {
      token: f.cyrilToken,
      title: "Bloqué",
      categorySlug: "etat-civil",
    })
    await expect(
      f.t.mutation(api.admin.services.publishService, {
        token: f.mireilleToken,
        slug,
      }),
    ).rejects.toThrowError(/Publication bloquée/)
  })

  test("refuse à un chef_service (pas la permission service.publish)", async () => {
    const f = await buildFixture()
    const { slug } = await f.t.mutation(api.admin.services.createService, {
      token: f.cyrilToken,
      title: "X",
      categorySlug: "etat-civil",
    })
    await expect(
      f.t.mutation(api.admin.services.publishService, {
        token: f.cyrilToken,
        slug,
      }),
    ).rejects.toThrowError(/Action "service\.publish" refusée/)
  })

  test("publie quand tous les prérequis sont remplis", async () => {
    const f = await buildFixture()
    const { slug, id: serviceId } = await f.t.mutation(
      api.admin.services.createService,
      {
        token: f.cyrilToken,
        title: "Complet",
        categorySlug: "etat-civil",
        description: "Description suffisamment longue pour valider.",
      },
    )
    // Update pour passer la checklist
    await f.t.mutation(api.admin.services.updateService, {
      token: f.cyrilToken,
      slug,
      patch: { whoCanApply: "Citoyens" },
    })
    // Ajoute une pièce et un template active+validé
    await f.t.run(async (ctx) => {
      const variant = await ctx.db
        .query("serviceVariants")
        .withIndex("by_service", (q) => q.eq("serviceId", serviceId))
        .unique()
      await ctx.db.insert("serviceRequirements", {
        serviceId,
        label: "Pièce 1",
        required: true,
        acceptedDocTypes: ["cni"],
        order: 0,
      })
      await ctx.db.insert("documentTemplates", {
        serviceVariantId: variant!._id,
        key: "acte",
        version: "v1",
        title: "Acte",
        bodyTemplate: "...",
        status: "active",
        validatedByComite: true,
      })
    })
    await f.t.mutation(api.admin.services.publishService, {
      token: f.mireilleToken,
      slug,
    })
    const service = await f.t.run((ctx) =>
      ctx.db
        .query("services")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique(),
    )
    expect(service?.status).toBe("published")
    expect(service?.publishedAt).toBeTruthy()
  })
})

// ====================================================================
// unpublishService
// ====================================================================

describe("unpublishService", () => {
  test("repasse en draft un service publié", async () => {
    const f = await buildFixture()
    const slug = await f.t.run(async (ctx) => {
      const serviceId = await ctx.db.insert("services", {
        organismId: f.orgId,
        slug: "déjà-publié",
        title: "Déjà publié",
        category: "État civil",
        fee: "Gratuit",
        delayHours: 48,
        status: "published",
      })
      return (await ctx.db.get(serviceId))!.slug
    })
    await f.t.mutation(api.admin.services.unpublishService, {
      token: f.mireilleToken,
      slug,
    })
    const service = await f.t.run((ctx) =>
      ctx.db
        .query("services")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique(),
    )
    expect(service?.status).toBe("draft")
  })
})

// ====================================================================
// archiveService
// ====================================================================

describe("archiveService", () => {
  test("refuse si des demandes sont actives", async () => {
    const f = await buildFixture()
    const slug = await f.t.run(async (rawCtx) => {
      const ctx = { ...rawCtx, db: triggers.wrapDB(rawCtx).db }
      const serviceId = await ctx.db.insert("services", {
        organismId: f.orgId,
        slug: "actif",
        title: "Service avec demandes",
        category: "État civil",
        fee: "Gratuit",
        delayHours: 48,
        status: "published",
      })
      await ctx.db.insert("requests", {
        ref: "GC-T-ARC",
        citizenId: f.citizenId,
        serviceId,
        organismId: f.orgId,
        status: "in_instruction",
        progressPct: 30,
        depositedAt: Date.now(),
      })
      return (await rawCtx.db.get(serviceId))!.slug
    })
    await expect(
      f.t.mutation(api.admin.services.archiveService, {
        token: f.mireilleToken,
        slug,
        reasonKind: "policy_change",
        reason: "Test",
      }),
    ).rejects.toThrowError(/Archivage refusé/)
  })

  test("archive si toutes les demandes sont terminées", async () => {
    const f = await buildFixture()
    const slug = await f.t.run(async (rawCtx) => {
      const ctx = { ...rawCtx, db: triggers.wrapDB(rawCtx).db }
      const serviceId = await ctx.db.insert("services", {
        organismId: f.orgId,
        slug: "archivable",
        title: "Archivable",
        category: "État civil",
        fee: "Gratuit",
        delayHours: 48,
        status: "published",
      })
      await ctx.db.insert("requests", {
        ref: "GC-T-OK",
        citizenId: f.citizenId,
        serviceId,
        organismId: f.orgId,
        status: "issued",
        progressPct: 100,
        depositedAt: Date.now(),
      })
      return (await rawCtx.db.get(serviceId))!.slug
    })
    await f.t.mutation(api.admin.services.archiveService, {
      token: f.mireilleToken,
      slug,
      reasonKind: "legal_obsolete",
      reason: "Remplacé par une nouvelle procédure",
    })
    const service = await f.t.run((ctx) =>
      ctx.db
        .query("services")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique(),
    )
    expect(service?.status).toBe("archived")
    expect(service?.archivedReasonKind).toBe("legal_obsolete")
    expect(service?.archivedReason).toContain("Remplacé")
  })
})

// ====================================================================
// duplicateService
// ====================================================================

describe("duplicateService", () => {
  test("clone service + variantes + requirements + templates en draft", async () => {
    const f = await buildFixture()
    const { slug, id: serviceId } = await f.t.mutation(
      api.admin.services.createService,
      {
        token: f.cyrilToken,
        title: "Source",
        categorySlug: "etat-civil",
      },
    )
    await f.t.run(async (ctx) => {
      const variant = await ctx.db
        .query("serviceVariants")
        .withIndex("by_service", (q) => q.eq("serviceId", serviceId))
        .unique()
      await ctx.db.insert("serviceRequirements", {
        serviceId,
        label: "Pièce d'identité",
        required: true,
        acceptedDocTypes: ["cni", "passeport"],
        order: 0,
      })
      await ctx.db.insert("documentTemplates", {
        serviceVariantId: variant!._id,
        key: "acte",
        version: "v3",
        title: "Acte",
        bodyTemplate: "L'an {{annee}}…",
        status: "active",
        validatedByComite: true,
      })
    })

    const { slug: newSlug, id: newId } = await f.t.mutation(
      api.admin.services.duplicateService,
      { token: f.cyrilToken, slug },
    )
    expect(newSlug).toBe(`${slug}-copie`)

    const newService = await f.t.run((ctx) => ctx.db.get(newId))
    expect(newService?.status).toBe("draft")
    expect(newService?.title).toBe("Source (copie)")

    const newVariants = await f.t.run((ctx) =>
      ctx.db
        .query("serviceVariants")
        .withIndex("by_service", (q) => q.eq("serviceId", newId))
        .collect(),
    )
    expect(newVariants).toHaveLength(1)

    const newTemplates = await f.t.run((ctx) =>
      ctx.db
        .query("documentTemplates")
        .withIndex("by_variant", (q) =>
          q.eq("serviceVariantId", newVariants[0]!._id),
        )
        .collect(),
    )
    expect(newTemplates).toHaveLength(1)
    // Template recommencé en v1 draft, validation comité remise à zéro
    expect(newTemplates[0]?.version).toBe("v1")
    expect(newTemplates[0]?.status).toBe("draft")
    expect(newTemplates[0]?.validatedByComite).toBe(false)
  })
})
