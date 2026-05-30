"use server"

import { revalidatePath } from "next/cache"
import { api } from "@workspace/backend/generated"
import { getCitizenConvex } from "@/lib/convex"
import { requireCurrentSession } from "@/lib/current-citizen"

export interface UpdateProfileResult {
  ok: boolean
  message?: string
}

const PROVINCES = [
  "estuaire",
  "haut_ogooue",
  "moyen_ogooue",
  "ngounie",
  "nyanga",
  "ogooue_ivindo",
  "ogooue_lolo",
  "ogooue_maritime",
  "woleu_ntem",
] as const

type ProvinceCode = (typeof PROVINCES)[number]

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

export async function updateProfileAction(
  formData: FormData,
): Promise<UpdateProfileResult> {
  const session = await requireCurrentSession()
  const convex = await getCitizenConvex(session)
  const email = String(formData.get("email") ?? "").trim()
  const phone = String(formData.get("phone") ?? "").trim()
  const address = String(formData.get("address") ?? "").trim()
  const provinceRaw = String(formData.get("addressProvinceCode") ?? "").trim()
  const addressProvinceCode = PROVINCES.includes(provinceRaw as ProvinceCode)
    ? (provinceRaw as ProvinceCode)
    : undefined

  try {
    await convex.mutation(api.citizen.profile.updateMyProfile, {
      email,
      phone,
      address,
      addressProvinceCode,
    })
    revalidatePath("/mon-espace/profil")
    revalidatePath("/mon-espace")
    return { ok: true, message: "Coordonnées mises à jour." }
  } catch (error) {
    return { ok: false, message: extractFriendlyMessage(error) }
  }
}
