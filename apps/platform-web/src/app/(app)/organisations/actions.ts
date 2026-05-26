"use server"

import { revalidatePath } from "next/cache"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"
import { requireSessionToken } from "@/lib/session"

export interface ActionResult {
  ok: boolean
  message?: string
  data?: unknown
}

function extractFriendlyMessage(error: unknown): string {
  if (!(error instanceof Error) || !error.message) return "Erreur inconnue."
  const m = error.message
  const match = m.match(/Uncaught (?:Convex)?Error:\s*([^\n]+?)(?:\s+at\s|$)/)
  if (match) return match[1].trim()
  return m
    .split("\n")[0]
    .replace(/^\[Request ID:[^\]]+\]\s*/, "")
    .replace(/^Server Error\s*/, "")
    .trim()
}

function fail(error: unknown): ActionResult {
  return { ok: false, message: extractFriendlyMessage(error) }
}

type Category =
  | "ministere"
  | "direction_generale"
  | "etablissement_public"
  | "collectivite"
  | "autorite"
  | "institution"

type Province =
  | "estuaire"
  | "haut_ogooue"
  | "moyen_ogooue"
  | "ngounie"
  | "nyanga"
  | "ogooue_ivindo"
  | "ogooue_lolo"
  | "ogooue_maritime"
  | "woleu_ntem"

const PROVINCE_LABELS: Record<Province, string> = {
  estuaire: "Estuaire",
  haut_ogooue: "Haut-Ogooué",
  moyen_ogooue: "Moyen-Ogooué",
  ngounie: "Ngounié",
  nyanga: "Nyanga",
  ogooue_ivindo: "Ogooué-Ivindo",
  ogooue_lolo: "Ogooué-Lolo",
  ogooue_maritime: "Ogooué-Maritime",
  woleu_ntem: "Woleu-Ntem",
}

export async function registerOrganismAction(formData: FormData): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim()
  const shortName = String(formData.get("shortName") ?? "").trim() || undefined
  const category = String(formData.get("category") ?? "") as Category
  const provinceCode = String(formData.get("provinceCode") ?? "") as Province | ""
  const siege = String(formData.get("siege") ?? "").trim() || undefined
  const contactEmail = String(formData.get("contactEmail") ?? "").trim() || undefined
  const phone = String(formData.get("phone") ?? "").trim() || undefined
  const firstAdminEmail =
    String(formData.get("firstAdminEmail") ?? "").trim() || undefined
  const firstAdminFunction =
    String(formData.get("firstAdminFunction") ?? "").trim() || undefined

  if (!name) return { ok: false, message: "Le nom est requis." }
  if (!category) return { ok: false, message: "La catégorie est requise." }

  const token = await requireSessionToken()
  try {
    const result = await convex.mutation(api.platform.organisms.registerOrganism, {
      token,
      name,
      shortName,
      category,
      province: provinceCode ? PROVINCE_LABELS[provinceCode] : undefined,
      provinceCode: provinceCode || undefined,
      siege,
      contactEmail,
      phone,
      firstAdminEmail,
      firstAdminFunction,
    })
    revalidatePath("/organisations")
    revalidatePath("/onboarding")
    revalidatePath("/")
    return {
      ok: true,
      message: `Organisme « ${name} » enregistré en onboarding.`,
      data: { ...result, firstAdminEmail: firstAdminEmail ?? null },
    }
  } catch (error) {
    return fail(error)
  }
}

export async function suspendOrganismAction(
  organismId: string,
  reason: string,
): Promise<ActionResult> {
  const trimmed = reason.trim()
  if (!trimmed) return { ok: false, message: "Un motif est requis." }

  const token = await requireSessionToken()
  try {
    await convex.mutation(api.platform.organisms.suspendOrganism, {
      token,
      organismId: organismId as never,
      reason: trimmed,
    })
    revalidatePath("/organisations")
    revalidatePath("/")
    return { ok: true, message: "Organisme suspendu." }
  } catch (error) {
    return fail(error)
  }
}

export async function reactivateOrganismAction(
  organismId: string,
): Promise<ActionResult> {
  const token = await requireSessionToken()
  try {
    await convex.mutation(api.platform.organisms.reactivateOrganism, {
      token,
      organismId: organismId as never,
    })
    revalidatePath("/organisations")
    revalidatePath("/")
    return { ok: true, message: "Organisme réactivé." }
  } catch (error) {
    return fail(error)
  }
}
