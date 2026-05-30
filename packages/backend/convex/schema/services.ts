import { defineTable } from "convex/server"
import { v } from "convex/values"
import {
  agentRoleValidator,
  pieceDocTypeValidator,
  requirementAutofillSourceValidator,
  serviceArchivedReasonKindValidator,
  serviceDeliveryModeValidator,
  serviceStatusValidator,
  templateStatusValidator,
  templateVariableSourceValidator,
} from "../lib/enums"

/**
 * Catalogue de services (C1, C2, A8) avec variantes (ADR-0005),
 * pièces requises et templates de documents générés.
 */
export const servicesTables = {
  // Catégories de démarches (C1 vitrine, 8 thèmes)
  serviceCategories: defineTable({
    slug: v.string(),
    label: v.string(),
    icon: v.string(),
    color: v.string(),
    order: v.number(),
    description: v.optional(v.string()),
  }).index("by_slug", ["slug"]),

  // Services parents (1 service = 1 démarche)
  services: defineTable({
    organismId: v.id("organisms"),
    categorySlug: v.optional(v.string()), // FK lâche vers serviceCategories.slug
    slug: v.string(),
    title: v.string(),
    // Legacy : champ variant string (à migrer vers serviceVariants). Conservé
    // pour compat avec admin/* qui s'en sert encore.
    variant: v.optional(v.string()),
    category: v.string(),
    description: v.optional(v.string()),
    longDescription: v.optional(v.string()), // markdown pour fiche publique
    legalReferences: v.optional(v.array(v.string())), // « art. 71 Code civil »…
    whoCanApply: v.optional(v.string()),
    deliveryMode: v.optional(serviceDeliveryModeValidator),
    online: v.optional(v.boolean()),
    fee: v.string(), // « Gratuit », « 5 000 FCFA »
    feeFcfa: v.optional(v.number()), // valeur numérique pour stats / tri
    delayHours: v.number(),
    status: serviceStatusValidator,
    satisfaction: v.optional(v.number()),
    // Médias / contenus enrichis
    imageStorageKey: v.optional(v.string()),
    faqStorageKey: v.optional(v.string()), // JSON: [{q, a}]
    // Cycle de vie — audit dénormalisé pour affichage rapide
    publishedAt: v.optional(v.number()),
    publishedByAgentId: v.optional(v.id("agents")),
    archivedAt: v.optional(v.number()),
    archivedByAgentId: v.optional(v.id("agents")),
    archivedReason: v.optional(v.string()),
    archivedReasonKind: v.optional(serviceArchivedReasonKindValidator),
    // Circuit de signature par défaut pour les documents générés par ce service
    defaultSignatureCircuitTemplate: v.optional(
      v.object({
        steps: v.array(
          v.object({
            roleRequired: agentRoleValidator,
            order: v.number(),
          }),
        ),
      }),
    ),
    // Caches stats
    requestsLast30d: v.optional(v.number()),
    avgDelayHours: v.optional(v.number()),
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"]) // catalogue public : ne scanner que les publiés
    .index("by_organism_status", ["organismId", "status"])
    .index("by_category", ["categorySlug"])
    .index("by_organism_updatedAt", ["organismId"]) // tri par _creationTime descendant
    .index("by_category_status", ["categorySlug", "status"]),

  // Variantes d'un service (ADR-0005)
  serviceVariants: defineTable({
    serviceId: v.id("services"),
    key: v.string(), // « copie_integrale », « extrait_avec_filiation »…
    label: v.string(),
    description: v.optional(v.string()),
    whoCanApply: v.optional(v.string()),
    isDefault: v.boolean(),
    feeOverride: v.optional(v.string()),
    feeFcfaOverride: v.optional(v.number()),
    delayHoursOverride: v.optional(v.number()),
    requestsLast30d: v.optional(v.number()),
    avgSatisfaction: v.optional(v.number()),
    order: v.number(),
  })
    .index("by_service", ["serviceId"])
    .index("by_service_key", ["serviceId", "key"]),

  // Pièces requises par service (template).
  // `variantOverrides` permet de surcharger `required` / `acceptedDocTypes`
  // pour une variante donnée — ex. « Extrait sans filiation » qui ne demande
  // pas de justificatif de filiation.
  serviceRequirements: defineTable({
    serviceId: v.id("services"),
    label: v.string(),
    description: v.optional(v.string()),
    required: v.boolean(),
    acceptedDocTypes: v.array(pieceDocTypeValidator),
    autofillSource: v.optional(requirementAutofillSourceValidator),
    order: v.number(),
    variantOverrides: v.optional(
      v.array(
        v.object({
          variantId: v.id("serviceVariants"),
          required: v.boolean(),
          acceptedDocTypes: v.optional(v.array(pieceDocTypeValidator)),
        }),
      ),
    ),
  }).index("by_service", ["serviceId"]),

  // Templates de documents générés (A5)
  documentTemplates: defineTable({
    serviceVariantId: v.id("serviceVariants"),
    key: v.string(),
    version: v.string(), // « v3.2 »
    title: v.string(),
    bodyTemplate: v.string(), // texte avec {{variables}}
    status: templateStatusValidator,
    validatedByComite: v.optional(v.boolean()),
    validatedAt: v.optional(v.string()),
    legalReference: v.optional(v.string()),
  })
    .index("by_variant", ["serviceVariantId"])
    .index("by_variant_status", ["serviceVariantId", "status"]),

  // Définition des variables d'un template
  documentTemplateVariables: defineTable({
    templateId: v.id("documentTemplates"),
    key: v.string(), // « nom », « date_naissance »…
    label: v.string(),
    source: templateVariableSourceValidator,
    sourcePath: v.optional(v.string()), // dot path dans la source (ex: "registry.actNumber")
    required: v.boolean(),
    order: v.number(),
  }).index("by_template", ["templateId"]),
}
