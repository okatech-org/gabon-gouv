import { defineTable } from "convex/server"
import { v } from "convex/values"
import {
  citizenRelationKindValidator,
  civilStatusValidator,
  provinceCodeValidator,
  recommendationReasonValidator,
  savedItemKindValidator,
  sexValidator,
} from "../lib/enums"
import { notificationPreferencesValidator } from "./notifications"

/**
 * Citoyens, relations familiales déclarées, items sauvegardés, recommandations.
 */
export const citizensTables = {
  citizens: defineTable({
    nip: v.string(),
    // Subject identifier de l'IDP Identité Numérique Gabonaise (citoyen.ga).
    // Renseigné au premier login OIDC (provisioning manuel pour l'instant).
    // Optionnel : un citoyen seedé sans idnSub ne peut pas se connecter.
    idnSub: v.optional(v.string()),
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    addressProvinceCode: v.optional(provinceCodeValidator),
    birthDate: v.optional(v.string()),
    birthPlace: v.optional(v.string()),
    birthProvinceCode: v.optional(provinceCodeValidator),
    fatherName: v.optional(v.string()),
    motherName: v.optional(v.string()),
    sex: v.optional(sexValidator),
    civilStatus: v.optional(civilStatusValidator),
    nationality: v.optional(v.string()),
    identityVerified: v.boolean(),
    identityVerifiedAt: v.optional(v.number()),
    accountCreatedAt: v.optional(v.number()),
    // Phase Trous A — préférences notif (défaut: in_app uniquement)
    notificationPreferences: v.optional(notificationPreferencesValidator),
    createdAt: v.number(),
  })
    .index("by_nip", ["nip"])
    .index("by_email", ["email"])
    .index("by_idn_sub", ["idnSub"]),

  // Filiation / relations déclarées (livret de famille, conjoint, enfants)
  citizenRelations: defineTable({
    citizenId: v.id("citizens"),
    kind: citizenRelationKindValidator,
    relatedCitizenId: v.optional(v.id("citizens")), // si le proche est connu
    displayedName: v.string(), // sinon nom déclaré sur l'acte
    profession: v.optional(v.string()),
    declaredAt: v.optional(v.string()),
  })
    .index("by_citizen", ["citizenId"])
    .index("by_related", ["relatedCitizenId"]),

  // Items sauvegardés depuis la vitrine ("Sauvegarder pour plus tard")
  citizenSavedItems: defineTable({
    citizenId: v.id("citizens"),
    kind: savedItemKindValidator,
    targetServiceId: v.optional(v.id("services")),
    targetOrganismId: v.optional(v.id("organisms")),
    targetDraftId: v.optional(v.id("requestDrafts")),
    savedAt: v.number(),
  }).index("by_citizen", ["citizenId"]),

  // Recommandations affichées sur le dashboard citoyen (C3)
  recommendations: defineTable({
    citizenId: v.id("citizens"),
    serviceId: v.id("services"),
    reason: recommendationReasonValidator,
    urgent: v.boolean(),
    description: v.string(),
    dismissedAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_citizen_active", ["citizenId", "dismissedAt"]),
}
