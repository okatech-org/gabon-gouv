/**
 * Upload de pièces justificatives par le citoyen (Bloc 2.3).
 *
 * Flow :
 *   1. Le client appelle `generateUploadUrl` → reçoit une URL d'upload unique
 *      (Convex storage).
 *   2. Le client POST le fichier sur cette URL → reçoit un `storageId`.
 *   3. Le client appelle `attachPiece({ storageId, ... })` → crée une pièce
 *      « orpheline » (citizenId set, requestId vide) avec status=uploaded.
 *   4. Au submit de la demande, `submitRequest({ attachedPieceIds: [...] })`
 *      patche requestId sur chaque pièce.
 *
 * Le citoyen peut aussi appeler `removePiece` avant submit pour annuler.
 */

import { v } from "convex/values"
import { mutation } from "../lib/triggers"
import { requireCitizen } from "./auth"
import { pieceDocTypeValidator } from "../lib/enums"

/* ============================================================
   generateUploadUrl — URL d'upload single-use Convex storage
   ============================================================ */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    // Vérifie que le citoyen est authentifié avant de générer une URL
    // (sinon n'importe qui pourrait uploader sur notre storage).
    await requireCitizen(ctx)
    return await ctx.storage.generateUploadUrl()
  },
})

/* ============================================================
   attachPiece — création de la pièce après upload réussi
   ============================================================ */
export const attachPiece = mutation({
  args: {
    storageId: v.id("_storage"),
    label: v.string(),
    filename: v.string(),
    mimeType: v.string(),
    sizeBytes: v.number(),
    docType: v.optional(pieceDocTypeValidator),
    requirementId: v.optional(v.id("serviceRequirements")),
    required: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { citizen } = await requireCitizen(ctx)

    // Validation basique : taille (max 10 Mo), mime (PDF/JPG/PNG)
    if (args.sizeBytes > 10 * 1024 * 1024) {
      throw new Error("Le fichier dépasse 10 Mo.")
    }
    const ALLOWED_MIMES = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
    ]
    if (!ALLOWED_MIMES.includes(args.mimeType)) {
      throw new Error(
        `Type de fichier non accepté : ${args.mimeType}. Acceptés : PDF, JPEG, PNG.`,
      )
    }

    // Si une requirement est fournie, vérifier que le type accepté correspond
    if (args.requirementId && args.docType) {
      const req = await ctx.db.get(args.requirementId)
      if (req && !req.acceptedDocTypes.includes(args.docType)) {
        throw new Error(
          `Le type « ${args.docType} » n'est pas accepté pour « ${req.label} ».`,
        )
      }
    }

    const pieceId = await ctx.db.insert("pieces", {
      // requestId vide : la pièce est orpheline jusqu'au submit
      citizenId: citizen._id,
      requirementId: args.requirementId,
      label: args.label.trim(),
      docType: args.docType,
      filename: args.filename,
      storageKey: args.storageId,
      mimeType: args.mimeType,
      sizeBytes: args.sizeBytes,
      status: "uploaded",
      required: args.required,
      uploadedAt: Date.now(),
    })

    return { id: pieceId }
  },
})

/* ============================================================
   removePiece — annulation avant submit
   ============================================================ */
export const removePiece = mutation({
  args: { pieceId: v.id("pieces") },
  handler: async (ctx, { pieceId }) => {
    const { citizen } = await requireCitizen(ctx)
    const piece = await ctx.db.get(pieceId)
    if (!piece) return // idempotent

    // Sécurité : seul le citoyen propriétaire peut supprimer, et seulement
    // tant que la pièce n'est pas rattachée à une demande (orphan).
    if (piece.citizenId !== citizen._id) {
      throw new Error("Cette pièce ne vous appartient pas.")
    }
    if (piece.requestId) {
      throw new Error(
        "Cette pièce est déjà rattachée à une demande déposée. Adressez-vous à l'administration.",
      )
    }

    // Supprime le fichier dans le storage Convex puis la pièce
    if (piece.storageKey) {
      try {
        await ctx.storage.delete(piece.storageKey as never)
      } catch {
        // Storage déjà supprimé : on continue quand même
      }
    }
    await ctx.db.delete(pieceId)
  },
})
