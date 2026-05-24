"use server"

import { revalidatePath } from "next/cache"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"
import { requireCurrentAgent } from "@/lib/current-agent"

export interface ActionResult {
  ok: boolean
  message?: string
}

/** Cast d'une chaîne en Id<> Convex (chaîne opaque côté client). */
const asId = (s: string) => s as unknown as never

function extractMessage(e: unknown): string {
  if (e instanceof Error) {
    const m = e.message.match(/\] (.+)$/)
    return m ? m[1]! : e.message
  }
  return "Erreur inattendue."
}

function revalidateSlug(slug: string) {
  revalidatePath(`/services/${slug}`, "layout")
  revalidatePath("/services")
}

/* ============================================================
   Variantes
   ============================================================ */

export async function addVariantAction(
  slug: string,
  serviceId: string,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireCurrentAgent()
  const key = String(formData.get("key") ?? "").trim()
  const label = String(formData.get("label") ?? "").trim()
  const description = String(formData.get("description") ?? "").trim() || undefined
  const whoCanApply = String(formData.get("whoCanApply") ?? "").trim() || undefined
  const feeOverride = String(formData.get("feeOverride") ?? "").trim() || undefined
  const feeFcfaRaw = String(formData.get("feeFcfaOverride") ?? "").trim()
  const delayRaw = String(formData.get("delayHoursOverride") ?? "").trim()

  if (!key) return { ok: false, message: "Clé requise." }
  if (!label) return { ok: false, message: "Libellé requis." }

  try {
    await convex.mutation(api.admin.serviceVariants.addVariant, {
      token: session.token,
      serviceId: asId(serviceId),
      key,
      label,
      description,
      whoCanApply,
      feeOverride,
      feeFcfaOverride: feeFcfaRaw ? Number(feeFcfaRaw) : undefined,
      delayHoursOverride: delayRaw ? Number(delayRaw) : undefined,
    })
  } catch (e) {
    return { ok: false, message: extractMessage(e) }
  }
  revalidateSlug(slug)
  return { ok: true, message: "Variante ajoutée." }
}

export async function updateVariantAction(
  slug: string,
  variantId: string,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireCurrentAgent()
  const patch: Record<string, unknown> = {}
  const label = String(formData.get("label") ?? "").trim()
  if (label) patch.label = label
  const description = String(formData.get("description") ?? "").trim()
  if (description) patch.description = description
  const whoCanApply = String(formData.get("whoCanApply") ?? "").trim()
  if (whoCanApply) patch.whoCanApply = whoCanApply
  const feeOverride = String(formData.get("feeOverride") ?? "").trim()
  if (feeOverride) patch.feeOverride = feeOverride
  const feeFcfaRaw = String(formData.get("feeFcfaOverride") ?? "").trim()
  if (feeFcfaRaw) patch.feeFcfaOverride = Number(feeFcfaRaw)
  const delayRaw = String(formData.get("delayHoursOverride") ?? "").trim()
  if (delayRaw) patch.delayHoursOverride = Number(delayRaw)

  try {
    await convex.mutation(api.admin.serviceVariants.updateVariant, {
      token: session.token,
      variantId: asId(variantId),
      patch,
    })
  } catch (e) {
    return { ok: false, message: extractMessage(e) }
  }
  revalidateSlug(slug)
  return { ok: true, message: "Variante mise à jour." }
}

export async function setDefaultVariantAction(
  slug: string,
  variantId: string,
): Promise<ActionResult> {
  const session = await requireCurrentAgent()
  try {
    await convex.mutation(api.admin.serviceVariants.setDefaultVariant, {
      token: session.token,
      variantId: asId(variantId),
    })
  } catch (e) {
    return { ok: false, message: extractMessage(e) }
  }
  revalidateSlug(slug)
  return { ok: true, message: "Variante par défaut mise à jour." }
}

export async function reorderVariantsAction(
  slug: string,
  serviceId: string,
  orderedIds: string[],
): Promise<ActionResult> {
  const session = await requireCurrentAgent()
  try {
    await convex.mutation(api.admin.serviceVariants.reorderVariants, {
      token: session.token,
      serviceId: asId(serviceId),
      orderedVariantIds: orderedIds.map(asId),
    })
  } catch (e) {
    return { ok: false, message: extractMessage(e) }
  }
  revalidateSlug(slug)
  return { ok: true, message: "Ordre mis à jour." }
}

export async function deleteVariantAction(
  slug: string,
  variantId: string,
): Promise<ActionResult> {
  const session = await requireCurrentAgent()
  try {
    await convex.mutation(api.admin.serviceVariants.deleteVariant, {
      token: session.token,
      variantId: asId(variantId),
    })
  } catch (e) {
    return { ok: false, message: extractMessage(e) }
  }
  revalidateSlug(slug)
  return { ok: true, message: "Variante supprimée." }
}

/* ============================================================
   Pièces requises
   ============================================================ */

const PIECE_DOC_TYPES = [
  "cni",
  "passeport",
  "permis_conduire",
  "livret_famille",
  "acte_naissance",
  "acte_mariage",
  "acte_deces",
  "certificat_residence",
  "justif_domicile",
  "mandat",
  "attestation",
  "photo_identite",
  "autre",
] as const

const AUTOFILL_SOURCES = [
  "citizen_identity",
  "previous_request",
  "third_party_api",
  "none",
] as const

export async function addRequirementAction(
  slug: string,
  serviceId: string,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireCurrentAgent()
  const label = String(formData.get("label") ?? "").trim()
  if (!label) return { ok: false, message: "Libellé requis." }
  const description = String(formData.get("description") ?? "").trim() || undefined
  const required = formData.get("required") === "on"
  const acceptedDocTypes = formData
    .getAll("acceptedDocTypes")
    .map(String)
    .filter((d): d is (typeof PIECE_DOC_TYPES)[number] =>
      PIECE_DOC_TYPES.includes(d as never),
    )
  if (acceptedDocTypes.length === 0) {
    return { ok: false, message: "Choisissez au moins un type de document." }
  }
  const autofillRaw = String(formData.get("autofillSource") ?? "none")
  const autofillSource = AUTOFILL_SOURCES.includes(autofillRaw as never)
    ? (autofillRaw as (typeof AUTOFILL_SOURCES)[number])
    : "none"

  try {
    await convex.mutation(api.admin.serviceRequirements.addRequirement, {
      token: session.token,
      serviceId: asId(serviceId),
      label,
      description,
      required,
      acceptedDocTypes,
      autofillSource,
    })
  } catch (e) {
    return { ok: false, message: extractMessage(e) }
  }
  revalidateSlug(slug)
  return { ok: true, message: "Pièce ajoutée." }
}

export async function updateRequirementAction(
  slug: string,
  requirementId: string,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireCurrentAgent()
  const patch: Record<string, unknown> = {}
  const label = String(formData.get("label") ?? "").trim()
  if (label) patch.label = label
  const description = String(formData.get("description") ?? "").trim()
  if (description) patch.description = description
  if (formData.has("required")) {
    patch.required = formData.get("required") === "on"
  }
  const types = formData.getAll("acceptedDocTypes").map(String)
  if (types.length > 0) {
    patch.acceptedDocTypes = types.filter((d) =>
      PIECE_DOC_TYPES.includes(d as never),
    )
  }
  const autofillRaw = String(formData.get("autofillSource") ?? "")
  if (AUTOFILL_SOURCES.includes(autofillRaw as never)) {
    patch.autofillSource = autofillRaw
  }

  try {
    await convex.mutation(api.admin.serviceRequirements.updateRequirement, {
      token: session.token,
      requirementId: asId(requirementId),
      patch,
    })
  } catch (e) {
    return { ok: false, message: extractMessage(e) }
  }
  revalidateSlug(slug)
  return { ok: true, message: "Pièce mise à jour." }
}

export async function deleteRequirementAction(
  slug: string,
  requirementId: string,
): Promise<ActionResult> {
  const session = await requireCurrentAgent()
  try {
    await convex.mutation(api.admin.serviceRequirements.deleteRequirement, {
      token: session.token,
      requirementId: asId(requirementId),
    })
  } catch (e) {
    return { ok: false, message: extractMessage(e) }
  }
  revalidateSlug(slug)
  return { ok: true, message: "Pièce supprimée." }
}

export async function reorderRequirementsAction(
  slug: string,
  serviceId: string,
  orderedIds: string[],
): Promise<ActionResult> {
  const session = await requireCurrentAgent()
  try {
    await convex.mutation(
      api.admin.serviceRequirements.reorderRequirements,
      {
        token: session.token,
        serviceId: asId(serviceId),
        orderedRequirementIds: orderedIds.map(asId),
      },
    )
  } catch (e) {
    return { ok: false, message: extractMessage(e) }
  }
  revalidateSlug(slug)
  return { ok: true, message: "Ordre mis à jour." }
}

/* ============================================================
   Templates de document
   ============================================================ */

export async function upsertTemplateAction(
  slug: string,
  variantId: string,
  templateId: string | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireCurrentAgent()
  const key = String(formData.get("key") ?? "").trim()
  const title = String(formData.get("title") ?? "").trim()
  const bodyTemplate = String(formData.get("bodyTemplate") ?? "")
  const legalReference =
    String(formData.get("legalReference") ?? "").trim() || undefined

  if (!key) return { ok: false, message: "Clé requise." }
  if (!title) return { ok: false, message: "Titre requis." }
  if (bodyTemplate.trim().length < 20) {
    return {
      ok: false,
      message: "Le corps du template doit faire au moins 20 caractères.",
    }
  }

  try {
    await convex.mutation(api.admin.documentTemplates.upsertTemplate, {
      token: session.token,
      serviceVariantId: asId(variantId),
      key,
      title,
      bodyTemplate,
      legalReference,
      templateId: templateId ? asId(templateId) : undefined,
    })
  } catch (e) {
    return { ok: false, message: extractMessage(e) }
  }
  revalidateSlug(slug)
  return { ok: true, message: "Template enregistré." }
}

export async function validateTemplateAction(
  slug: string,
  templateId: string,
): Promise<ActionResult> {
  const session = await requireCurrentAgent()
  try {
    await convex.mutation(api.admin.documentTemplates.validateTemplate, {
      token: session.token,
      templateId: asId(templateId),
    })
  } catch (e) {
    return { ok: false, message: extractMessage(e) }
  }
  revalidateSlug(slug)
  return { ok: true, message: "Template validé par le comité." }
}

export async function activateTemplateAction(
  slug: string,
  templateId: string,
): Promise<ActionResult> {
  const session = await requireCurrentAgent()
  try {
    await convex.mutation(api.admin.documentTemplates.activateTemplate, {
      token: session.token,
      templateId: asId(templateId),
    })
  } catch (e) {
    return { ok: false, message: extractMessage(e) }
  }
  revalidateSlug(slug)
  return { ok: true, message: "Template activé." }
}
