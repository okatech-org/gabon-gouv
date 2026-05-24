import { v } from "convex/values"
import { query } from "../_generated/server"
import { mutation } from "../lib/triggers"
import { provinceCodeValidator } from "../lib/enums"
import { requireCitizen } from "./auth"

/**
 * Profil citoyen (page « Mes informations ») — getter + updater des champs
 * éditables. L'identité civile (NIP, nom, sexe, date/lieu de naissance) est
 * en lecture seule — toute modification doit passer par une demande
 * d'acte rectificatif auprès de la DG État Civil.
 */
export const getMyProfile = query({
  args: { idnSub: v.string() },
  handler: async (ctx, { idnSub }) => {
    const { citizen } = await requireCitizen(ctx, idnSub)
    return {
      // Lecture seule (identité civile)
      readonly: {
        nip: citizen.nip,
        name: citizen.name,
        sex:
          citizen.sex === "F"
            ? "Féminin"
            : citizen.sex === "M"
              ? "Masculin"
              : "Non renseigné",
        birthDate: citizen.birthDate ?? "—",
        birthPlace: citizen.birthPlace ?? "—",
        nationality: citizen.nationality ?? "—",
        fatherName: citizen.fatherName ?? "—",
        motherName: citizen.motherName ?? "—",
      },
      // Éditables (contact)
      editable: {
        email: citizen.email ?? "",
        phone: citizen.phone ?? "",
        address: citizen.address ?? "",
        addressProvinceCode: citizen.addressProvinceCode ?? null,
      },
    }
  },
})

export const updateMyProfile = mutation({
  args: {
    idnSub: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    addressProvinceCode: v.optional(provinceCodeValidator),
  },
  handler: async (ctx, args) => {
    const { citizen } = await requireCitizen(ctx, args.idnSub)
    const patch: Record<string, unknown> = {}
    if (args.email !== undefined) {
      const trimmed = args.email.trim().toLowerCase()
      if (trimmed && !trimmed.includes("@")) {
        throw new Error("Adresse e-mail invalide.")
      }
      patch.email = trimmed || undefined
    }
    if (args.phone !== undefined) {
      const trimmed = args.phone.trim()
      patch.phone = trimmed || undefined
    }
    if (args.address !== undefined) {
      const trimmed = args.address.trim()
      patch.address = trimmed || undefined
    }
    if (args.addressProvinceCode !== undefined) {
      patch.addressProvinceCode = args.addressProvinceCode
    }
    await ctx.db.patch(citizen._id, patch)
    return { updated: Object.keys(patch).length }
  },
})
