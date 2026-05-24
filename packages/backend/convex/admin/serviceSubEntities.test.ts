/**
 * Tests des mutations des sous-entités d'un service (Bloc 1.4 → 1.6) :
 * - serviceVariants
 * - serviceRequirements
 * - documentTemplates + documentTemplateVariables
 *
 * Fixture partagée : un service `etat-civil/acte-naissance` déjà créé avec
 * une variante par défaut « Standard ».
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
  cyrilToken: string
  mireilleToken: string
  serviceId: Id<"services">
  serviceSlug: string
  defaultVariantId: Id<"serviceVariants">
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
    await ctx.db.insert("agents", {
      organismId: orgId,
      nip: "197603100002",
      name: "Cyril",
      email: "c@x",
      role: "chef_service",
    })
    await ctx.db.insert("agents", {
      organismId: orgId,
      nip: "197003100005",
      name: "Mireille",
      email: "m@x",
      role: "admin_organisme",
    })
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

  const cyril = await t.mutation(api.auth.signInWithNip, { nip: "197603100002" })
  const mireille = await t.mutation(api.auth.signInWithNip, { nip: "197003100005" })

  // Crée le service via la mutation (qui crée la variante par défaut)
  const { slug, id: serviceId } = await t.mutation(
    api.admin.services.createService,
    {
      token: cyril.token,
      title: "Acte de naissance",
      categorySlug: "etat-civil",
      description: "Demander un acte de naissance.",
    },
  )

  const defaultVariant = await t.run((ctx) =>
    ctx.db
      .query("serviceVariants")
      .withIndex("by_service", (q) => q.eq("serviceId", serviceId))
      .unique(),
  )

  return {
    t,
    ...seeded,
    cyrilToken: cyril.token,
    mireilleToken: mireille.token,
    serviceId,
    serviceSlug: slug,
    defaultVariantId: defaultVariant!._id,
  }
}

// ====================================================================
// serviceVariants
// ====================================================================

describe("addVariant", () => {
  test("ajoute une variante non-défaut quand une variante existe déjà", async () => {
    const f = await buildFixture()
    const { id } = await f.t.mutation(api.admin.serviceVariants.addVariant, {
      token: f.cyrilToken,
      serviceId: f.serviceId,
      key: "copie_integrale",
      label: "Copie intégrale",
    })
    const variant = await f.t.run((ctx) => ctx.db.get(id))
    expect(variant?.isDefault).toBe(false)
    expect(variant?.order).toBe(1)
  })

  test("refuse une clé déjà utilisée", async () => {
    const f = await buildFixture()
    await f.t.mutation(api.admin.serviceVariants.addVariant, {
      token: f.cyrilToken,
      serviceId: f.serviceId,
      key: "extrait",
      label: "Extrait",
    })
    await expect(
      f.t.mutation(api.admin.serviceVariants.addVariant, {
        token: f.cyrilToken,
        serviceId: f.serviceId,
        key: "Extrait", // même clé normalisée
        label: "Extrait 2",
      }),
    ).rejects.toThrowError(/existe déjà/)
  })
})

describe("setDefaultVariant", () => {
  test("bascule la variante par défaut", async () => {
    const f = await buildFixture()
    const { id } = await f.t.mutation(api.admin.serviceVariants.addVariant, {
      token: f.cyrilToken,
      serviceId: f.serviceId,
      key: "extrait",
      label: "Extrait",
    })
    await f.t.mutation(api.admin.serviceVariants.setDefaultVariant, {
      token: f.cyrilToken,
      variantId: id,
    })
    const variants = await f.t.run((ctx) =>
      ctx.db
        .query("serviceVariants")
        .withIndex("by_service", (q) => q.eq("serviceId", f.serviceId))
        .collect(),
    )
    const defaults = variants.filter((v) => v.isDefault)
    expect(defaults).toHaveLength(1)
    expect(defaults[0]?._id).toBe(id)
  })
})

describe("reorderVariants", () => {
  test("met à jour les `order` selon la liste fournie", async () => {
    const f = await buildFixture()
    const { id: v2 } = await f.t.mutation(api.admin.serviceVariants.addVariant, {
      token: f.cyrilToken,
      serviceId: f.serviceId,
      key: "v2",
      label: "V2",
    })
    const { id: v3 } = await f.t.mutation(api.admin.serviceVariants.addVariant, {
      token: f.cyrilToken,
      serviceId: f.serviceId,
      key: "v3",
      label: "V3",
    })
    await f.t.mutation(api.admin.serviceVariants.reorderVariants, {
      token: f.cyrilToken,
      serviceId: f.serviceId,
      orderedVariantIds: [v3, f.defaultVariantId, v2],
    })
    const variants = await f.t.run((ctx) =>
      ctx.db
        .query("serviceVariants")
        .withIndex("by_service", (q) => q.eq("serviceId", f.serviceId))
        .collect(),
    )
    const byId = new Map(variants.map((v) => [v._id, v.order]))
    expect(byId.get(v3)).toBe(0)
    expect(byId.get(f.defaultVariantId)).toBe(1)
    expect(byId.get(v2)).toBe(2)
  })
})

describe("deleteVariant", () => {
  test("refuse de supprimer la dernière variante", async () => {
    const f = await buildFixture()
    await expect(
      f.t.mutation(api.admin.serviceVariants.deleteVariant, {
        token: f.cyrilToken,
        variantId: f.defaultVariantId,
      }),
    ).rejects.toThrowError(/au moins une variante/)
  })

  test("refuse si utilisée par une demande", async () => {
    const f = await buildFixture()
    await f.t.run(async (rawCtx) => {
      const ctx = { ...rawCtx, db: triggers.wrapDB(rawCtx).db }
      await ctx.db.insert("requests", {
        ref: "GC-T-VAR",
        citizenId: f.citizenId,
        serviceId: f.serviceId,
        serviceVariantId: f.defaultVariantId,
        organismId: f.orgId,
        status: "in_instruction",
        progressPct: 30,
        depositedAt: Date.now(),
      })
    })
    // Ajoute une 2e variante pour pouvoir tenter la suppression de la 1re
    await f.t.mutation(api.admin.serviceVariants.addVariant, {
      token: f.cyrilToken,
      serviceId: f.serviceId,
      key: "autre",
      label: "Autre",
    })
    await expect(
      f.t.mutation(api.admin.serviceVariants.deleteVariant, {
        token: f.cyrilToken,
        variantId: f.defaultVariantId,
      }),
    ).rejects.toThrowError(/utilisée par au moins une demande/)
  })

  test("réassigne le défaut si on supprime la variante par défaut", async () => {
    const f = await buildFixture()
    const { id: other } = await f.t.mutation(
      api.admin.serviceVariants.addVariant,
      {
        token: f.cyrilToken,
        serviceId: f.serviceId,
        key: "autre",
        label: "Autre",
      },
    )
    await f.t.mutation(api.admin.serviceVariants.deleteVariant, {
      token: f.cyrilToken,
      variantId: f.defaultVariantId,
    })
    const remaining = await f.t.run((ctx) => ctx.db.get(other))
    expect(remaining?.isDefault).toBe(true)
  })
})

// ====================================================================
// serviceRequirements
// ====================================================================

describe("addRequirement", () => {
  test("ajoute une pièce avec ordre incrémental", async () => {
    const f = await buildFixture()
    await f.t.mutation(api.admin.serviceRequirements.addRequirement, {
      token: f.cyrilToken,
      serviceId: f.serviceId,
      label: "CNI",
      required: true,
      acceptedDocTypes: ["cni", "passeport"],
    })
    const { id } = await f.t.mutation(
      api.admin.serviceRequirements.addRequirement,
      {
        token: f.cyrilToken,
        serviceId: f.serviceId,
        label: "Justificatif de domicile",
        required: false,
        acceptedDocTypes: ["justif_domicile"],
      },
    )
    const req = await f.t.run((ctx) => ctx.db.get(id))
    expect(req?.order).toBe(1)
  })

  test("refuse une liste de types vide", async () => {
    const f = await buildFixture()
    await expect(
      f.t.mutation(api.admin.serviceRequirements.addRequirement, {
        token: f.cyrilToken,
        serviceId: f.serviceId,
        label: "X",
        required: true,
        acceptedDocTypes: [],
      }),
    ).rejects.toThrowError(/Au moins un type/)
  })
})

describe("updateRequirement", () => {
  test("accepte des variantOverrides pour des variantes valides", async () => {
    const f = await buildFixture()
    const { id: variantId } = await f.t.mutation(
      api.admin.serviceVariants.addVariant,
      {
        token: f.cyrilToken,
        serviceId: f.serviceId,
        key: "sans_filiation",
        label: "Sans filiation",
      },
    )
    const { id: reqId } = await f.t.mutation(
      api.admin.serviceRequirements.addRequirement,
      {
        token: f.cyrilToken,
        serviceId: f.serviceId,
        label: "Filiation",
        required: true,
        acceptedDocTypes: ["livret_famille"],
      },
    )
    await f.t.mutation(api.admin.serviceRequirements.updateRequirement, {
      token: f.cyrilToken,
      requirementId: reqId,
      patch: {
        variantOverrides: [
          { variantId, required: false, acceptedDocTypes: ["livret_famille"] },
        ],
      },
    })
    const req = await f.t.run((ctx) => ctx.db.get(reqId))
    expect(req?.variantOverrides).toHaveLength(1)
    expect(req?.variantOverrides?.[0]?.required).toBe(false)
  })

  test("refuse un override sur une variante hors du service", async () => {
    const f = await buildFixture()
    const orphanVariantId = await f.t.run(async (ctx) => {
      // Crée un autre service avec sa propre variante
      const otherSvcId = await ctx.db.insert("services", {
        organismId: f.orgId,
        slug: "autre-service",
        title: "Autre",
        category: "État civil",
        fee: "Gratuit",
        delayHours: 24,
        status: "draft",
      })
      return await ctx.db.insert("serviceVariants", {
        serviceId: otherSvcId,
        key: "std",
        label: "Std",
        isDefault: true,
        order: 0,
      })
    })
    const { id: reqId } = await f.t.mutation(
      api.admin.serviceRequirements.addRequirement,
      {
        token: f.cyrilToken,
        serviceId: f.serviceId,
        label: "X",
        required: true,
        acceptedDocTypes: ["cni"],
      },
    )
    await expect(
      f.t.mutation(api.admin.serviceRequirements.updateRequirement, {
        token: f.cyrilToken,
        requirementId: reqId,
        patch: {
          variantOverrides: [
            {
              variantId: orphanVariantId,
              required: false,
              acceptedDocTypes: undefined,
            },
          ],
        },
      }),
    ).rejects.toThrowError(/hors du service/)
  })
})

// ====================================================================
// documentTemplates
// ====================================================================

describe("upsertTemplate", () => {
  test("crée un template en v1 draft", async () => {
    const f = await buildFixture()
    const { id, version } = await f.t.mutation(
      api.admin.documentTemplates.upsertTemplate,
      {
        token: f.cyrilToken,
        serviceVariantId: f.defaultVariantId,
        key: "acte",
        title: "Extrait d'acte de naissance",
        bodyTemplate: "Le {{date_naissance}}, est né {{nom}}.",
      },
    )
    expect(version).toBe("v1")
    const tpl = await f.t.run((ctx) => ctx.db.get(id))
    expect(tpl?.status).toBe("draft")
    expect(tpl?.validatedByComite).toBe(false)
  })

  test("snapshot : édition d'un template active → nouvelle version v(N+1) draft", async () => {
    const f = await buildFixture()
    const { id: v1Id } = await f.t.mutation(
      api.admin.documentTemplates.upsertTemplate,
      {
        token: f.cyrilToken,
        serviceVariantId: f.defaultVariantId,
        key: "acte",
        title: "v1",
        bodyTemplate: "v1 body",
      },
    )
    await f.t.run((ctx) =>
      ctx.db.patch(v1Id, { status: "active", validatedByComite: true }),
    )
    const { id: v2Id, version: v2Version } = await f.t.mutation(
      api.admin.documentTemplates.upsertTemplate,
      {
        token: f.cyrilToken,
        serviceVariantId: f.defaultVariantId,
        key: "acte",
        title: "v2 title",
        bodyTemplate: "v2 body",
        templateId: v1Id,
      },
    )
    expect(v2Id).not.toBe(v1Id)
    expect(v2Version).toBe("v2")
    const v1 = await f.t.run((ctx) => ctx.db.get(v1Id))
    expect(v1?.status).toBe("active") // l'ancien reste active jusqu'à activate(v2)
    const v2 = await f.t.run((ctx) => ctx.db.get(v2Id))
    expect(v2?.status).toBe("draft")
  })

  test("édition d'un draft : in-place + invalidation comité", async () => {
    const f = await buildFixture()
    const { id } = await f.t.mutation(
      api.admin.documentTemplates.upsertTemplate,
      {
        token: f.cyrilToken,
        serviceVariantId: f.defaultVariantId,
        key: "acte",
        title: "v1",
        bodyTemplate: "body",
      },
    )
    await f.t.mutation(api.admin.documentTemplates.validateTemplate, {
      token: f.mireilleToken,
      templateId: id,
    })
    await f.t.mutation(api.admin.documentTemplates.upsertTemplate, {
      token: f.cyrilToken,
      serviceVariantId: f.defaultVariantId,
      key: "acte",
      title: "v1 modifié",
      bodyTemplate: "body modifié",
      templateId: id,
    })
    const tpl = await f.t.run((ctx) => ctx.db.get(id))
    expect(tpl?.title).toBe("v1 modifié")
    expect(tpl?.validatedByComite).toBe(false) // validation perdue
  })
})

describe("activateTemplate", () => {
  test("refuse d'activer un template non validé", async () => {
    const f = await buildFixture()
    const { id } = await f.t.mutation(
      api.admin.documentTemplates.upsertTemplate,
      {
        token: f.cyrilToken,
        serviceVariantId: f.defaultVariantId,
        key: "acte",
        title: "v1",
        bodyTemplate: "body",
      },
    )
    await expect(
      f.t.mutation(api.admin.documentTemplates.activateTemplate, {
        token: f.mireilleToken,
        templateId: id,
      }),
    ).rejects.toThrowError(/validé par le comité/)
  })

  test("active une version et déprécie l'ancienne active de la même key", async () => {
    const f = await buildFixture()
    const { id: v1Id } = await f.t.mutation(
      api.admin.documentTemplates.upsertTemplate,
      {
        token: f.cyrilToken,
        serviceVariantId: f.defaultVariantId,
        key: "acte",
        title: "v1",
        bodyTemplate: "body",
      },
    )
    await f.t.mutation(api.admin.documentTemplates.validateTemplate, {
      token: f.mireilleToken,
      templateId: v1Id,
    })
    await f.t.mutation(api.admin.documentTemplates.activateTemplate, {
      token: f.mireilleToken,
      templateId: v1Id,
    })

    // Crée v2 et active
    const { id: v2Id } = await f.t.mutation(
      api.admin.documentTemplates.upsertTemplate,
      {
        token: f.cyrilToken,
        serviceVariantId: f.defaultVariantId,
        key: "acte",
        title: "v2",
        bodyTemplate: "body v2",
        templateId: v1Id,
      },
    )
    await f.t.mutation(api.admin.documentTemplates.validateTemplate, {
      token: f.mireilleToken,
      templateId: v2Id,
    })
    await f.t.mutation(api.admin.documentTemplates.activateTemplate, {
      token: f.mireilleToken,
      templateId: v2Id,
    })

    const v1 = await f.t.run((ctx) => ctx.db.get(v1Id))
    const v2 = await f.t.run((ctx) => ctx.db.get(v2Id))
    expect(v1?.status).toBe("deprecated")
    expect(v2?.status).toBe("active")
  })
})

describe("template variables", () => {
  test("addTemplateVariable refuse sur un template active", async () => {
    const f = await buildFixture()
    const { id: tplId } = await f.t.mutation(
      api.admin.documentTemplates.upsertTemplate,
      {
        token: f.cyrilToken,
        serviceVariantId: f.defaultVariantId,
        key: "acte",
        title: "v1",
        bodyTemplate: "body",
      },
    )
    await f.t.mutation(api.admin.documentTemplates.validateTemplate, {
      token: f.mireilleToken,
      templateId: tplId,
    })
    await f.t.mutation(api.admin.documentTemplates.activateTemplate, {
      token: f.mireilleToken,
      templateId: tplId,
    })
    await expect(
      f.t.mutation(api.admin.documentTemplates.addTemplateVariable, {
        token: f.cyrilToken,
        templateId: tplId,
        key: "nom",
        label: "Nom",
        source: "citizen_profile",
        required: true,
      }),
    ).rejects.toThrowError(/template actif/)
  })
})
