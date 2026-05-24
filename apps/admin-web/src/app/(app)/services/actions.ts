"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"
import { requireCurrentAgent } from "@/lib/current-agent"

export interface ActionResult {
  ok: boolean
  message?: string
  data?: Record<string, unknown>
}

const SERVICE_CATEGORIES = [
  "etat-civil",
  "documentation",
  "fiscalite",
  "justice",
  "social",
  "education",
  "sante",
  "urbanisme",
] as const

const DELIVERY_MODES = ["online", "hybrid", "in_person"] as const

const ARCHIVE_REASON_KINDS = [
  "replaced_by_other",
  "policy_change",
  "legal_obsolete",
  "other",
] as const

/* ------------------------------------------------------------
   Création de service (depuis /services/nouveau)
   ------------------------------------------------------------ */
export async function createServiceAction(
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireCurrentAgent()
  const title = String(formData.get("title") ?? "").trim()
  const categorySlug = String(formData.get("categorySlug") ?? "").trim()
  const description = String(formData.get("description") ?? "").trim() || undefined
  const deliveryMode = String(formData.get("deliveryMode") ?? "online")
  const fee = String(formData.get("fee") ?? "Gratuit").trim()
  const feeFcfaRaw = String(formData.get("feeFcfa") ?? "").trim()
  const delayHoursRaw = String(formData.get("delayHours") ?? "48").trim()

  if (title.length < 3) {
    return { ok: false, message: "Le titre doit faire au moins 3 caractères." }
  }
  if (!SERVICE_CATEGORIES.includes(categorySlug as never)) {
    return { ok: false, message: "Catégorie inconnue." }
  }
  if (!DELIVERY_MODES.includes(deliveryMode as never)) {
    return { ok: false, message: "Mode de délivrance invalide." }
  }

  const feeFcfa = feeFcfaRaw ? Number(feeFcfaRaw) : 0
  const delayHours = Number(delayHoursRaw) || 48
  if (Number.isNaN(feeFcfa) || feeFcfa < 0) {
    return { ok: false, message: "Coût numérique invalide." }
  }

  let result: { slug: string }
  try {
    result = await convex.mutation(api.admin.services.createService, {
      token: session.token,
      title,
      categorySlug,
      description,
      deliveryMode: deliveryMode as (typeof DELIVERY_MODES)[number],
      fee,
      feeFcfa,
      delayHours,
    })
  } catch (e) {
    return { ok: false, message: extractMessage(e) }
  }

  revalidatePath("/services")
  redirect(`/services/${result.slug}`)
}

/* ------------------------------------------------------------
   Cycle de vie depuis le kebab menu / page détail
   ------------------------------------------------------------ */
export async function publishServiceAction(
  slug: string,
): Promise<ActionResult> {
  const session = await requireCurrentAgent()
  try {
    await convex.mutation(api.admin.services.publishService, {
      token: session.token,
      slug,
    })
  } catch (e) {
    return { ok: false, message: extractMessage(e) }
  }
  revalidatePath("/services")
  revalidatePath(`/services/${slug}`)
  return { ok: true, message: "Service publié." }
}

export async function unpublishServiceAction(
  slug: string,
): Promise<ActionResult> {
  const session = await requireCurrentAgent()
  try {
    await convex.mutation(api.admin.services.unpublishService, {
      token: session.token,
      slug,
    })
  } catch (e) {
    return { ok: false, message: extractMessage(e) }
  }
  revalidatePath("/services")
  revalidatePath(`/services/${slug}`)
  return { ok: true, message: "Service dépublié (retour en brouillon)." }
}

export async function archiveServiceAction(
  slug: string,
  reasonKind: string,
  reason: string,
): Promise<ActionResult> {
  const session = await requireCurrentAgent()
  if (!ARCHIVE_REASON_KINDS.includes(reasonKind as never)) {
    return { ok: false, message: "Motif d'archivage invalide." }
  }
  if (reason.trim().length < 3) {
    return { ok: false, message: "Précisez un motif (au moins 3 caractères)." }
  }
  try {
    await convex.mutation(api.admin.services.archiveService, {
      token: session.token,
      slug,
      reasonKind: reasonKind as (typeof ARCHIVE_REASON_KINDS)[number],
      reason,
    })
  } catch (e) {
    return { ok: false, message: extractMessage(e) }
  }
  revalidatePath("/services")
  revalidatePath(`/services/${slug}`)
  return { ok: true, message: "Service archivé." }
}

export async function duplicateServiceAction(
  slug: string,
): Promise<ActionResult> {
  const session = await requireCurrentAgent()
  let result: { slug: string }
  try {
    result = await convex.mutation(api.admin.services.duplicateService, {
      token: session.token,
      slug,
    })
  } catch (e) {
    return { ok: false, message: extractMessage(e) }
  }
  revalidatePath("/services")
  redirect(`/services/${result.slug}`)
}

/* ------------------------------------------------------------
   Mise à jour des champs métier (depuis l'onglet Vue d'ensemble)
   ------------------------------------------------------------ */
export async function updateServiceAction(
  slug: string,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireCurrentAgent()
  const patch: Record<string, unknown> = {}

  const title = String(formData.get("title") ?? "").trim()
  if (title) patch.title = title
  const description = String(formData.get("description") ?? "").trim()
  if (description) patch.description = description
  const longDescription = String(
    formData.get("longDescription") ?? "",
  ).trim()
  if (longDescription) patch.longDescription = longDescription
  const whoCanApply = String(formData.get("whoCanApply") ?? "").trim()
  if (whoCanApply) patch.whoCanApply = whoCanApply
  const deliveryMode = String(formData.get("deliveryMode") ?? "")
  if (DELIVERY_MODES.includes(deliveryMode as never)) {
    patch.deliveryMode = deliveryMode
  }
  const fee = String(formData.get("fee") ?? "").trim()
  if (fee) patch.fee = fee
  const feeFcfaRaw = String(formData.get("feeFcfa") ?? "").trim()
  if (feeFcfaRaw) {
    const feeFcfa = Number(feeFcfaRaw)
    if (!Number.isNaN(feeFcfa) && feeFcfa >= 0) patch.feeFcfa = feeFcfa
  }
  const delayHoursRaw = String(formData.get("delayHours") ?? "").trim()
  if (delayHoursRaw) {
    const delayHours = Number(delayHoursRaw)
    if (!Number.isNaN(delayHours) && delayHours > 0) {
      patch.delayHours = delayHours
    }
  }
  const legalRefRaw = String(formData.get("legalReferences") ?? "").trim()
  if (legalRefRaw) {
    patch.legalReferences = legalRefRaw
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
  }
  const categorySlug = String(formData.get("categorySlug") ?? "")
  if (categorySlug && SERVICE_CATEGORIES.includes(categorySlug as never)) {
    patch.categorySlug = categorySlug
  }

  if (Object.keys(patch).length === 0) {
    return { ok: false, message: "Aucune modification à enregistrer." }
  }

  try {
    await convex.mutation(api.admin.services.updateService, {
      token: session.token,
      slug,
      patch,
    })
  } catch (e) {
    return { ok: false, message: extractMessage(e) }
  }

  revalidatePath("/services")
  revalidatePath(`/services/${slug}`)
  return { ok: true, message: "Modifications enregistrées." }
}

/* ------------------------------------------------------------
   Helpers
   ------------------------------------------------------------ */
function extractMessage(e: unknown): string {
  if (e instanceof Error) {
    // Convex enveloppe l'erreur — on extrait le message lisible
    const m = e.message.match(/\] (.+)$/)
    return m ? m[1]! : e.message
  }
  return "Erreur inattendue."
}
