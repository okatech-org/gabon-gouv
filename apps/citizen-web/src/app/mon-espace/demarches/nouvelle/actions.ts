"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"
import { requireCurrentSession } from "@/lib/current-citizen"

/* ============================================================
   Types
   ============================================================ */

export interface SubmitArgs {
  serviceSlug: string
  variantKey?: string
  numberOfCopies?: number
  recipientEmail?: string
  beneficiaryKind?: "self" | "third_party"
  urgent?: boolean
  urgentReason?: string
  payload?: Record<string, unknown>
  attachedPieceIds?: string[]
  honor: boolean
  rgpd: boolean
}

export interface SubmitResult {
  ok: boolean
  message?: string
  ref?: string
}

export interface UploadUrlResult {
  ok: boolean
  url?: string
  message?: string
}

export interface AttachPieceArgs {
  storageId: string
  label: string
  filename: string
  mimeType: string
  sizeBytes: number
  required: boolean
  requirementId?: string
}

export interface AttachPieceResult {
  ok: boolean
  pieceId?: string
  message?: string
}

export interface RemovePieceResult {
  ok: boolean
  message?: string
}

export interface SaveDraftArgs {
  serviceId: string
  serviceVariantId?: string
  currentStep: number
  payload: Record<string, unknown>
}

/* ============================================================
   Helpers
   ============================================================ */

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

const asId = (s: string) => s as unknown as never

/* ============================================================
   Upload pièces
   ============================================================ */

export async function getUploadUrlAction(): Promise<UploadUrlResult> {
  const session = await requireCurrentSession()
  try {
    const url = await convex.mutation(api.citizen.uploads.generateUploadUrl, {
      idnSub: session.idnSub,
    })
    return { ok: true, url }
  } catch (error) {
    return { ok: false, message: extractFriendlyMessage(error) }
  }
}

export async function attachPieceAction(
  args: AttachPieceArgs,
): Promise<AttachPieceResult> {
  const session = await requireCurrentSession()
  try {
    const res = await convex.mutation(api.citizen.uploads.attachPiece, {
      idnSub: session.idnSub,
      storageId: asId(args.storageId),
      label: args.label,
      filename: args.filename,
      mimeType: args.mimeType,
      sizeBytes: args.sizeBytes,
      required: args.required,
      requirementId: args.requirementId ? asId(args.requirementId) : undefined,
    })
    return { ok: true, pieceId: String(res.id) }
  } catch (error) {
    return { ok: false, message: extractFriendlyMessage(error) }
  }
}

export async function removePieceAction(
  pieceId: string,
): Promise<RemovePieceResult> {
  const session = await requireCurrentSession()
  try {
    await convex.mutation(api.citizen.uploads.removePiece, {
      idnSub: session.idnSub,
      pieceId: asId(pieceId),
    })
    return { ok: true }
  } catch (error) {
    return { ok: false, message: extractFriendlyMessage(error) }
  }
}

/* ============================================================
   Brouillons (saveDraft / discardDraft)
   ============================================================ */

export async function saveDraftAction(args: SaveDraftArgs): Promise<{ ok: boolean; message?: string }> {
  const session = await requireCurrentSession()
  try {
    await convex.mutation(api.citizen.drafts.saveDraft, {
      idnSub: session.idnSub,
      serviceId: asId(args.serviceId),
      serviceVariantId: args.serviceVariantId
        ? asId(args.serviceVariantId)
        : undefined,
      currentStep: args.currentStep,
      payload: args.payload,
    })
    return { ok: true }
  } catch (error) {
    return { ok: false, message: extractFriendlyMessage(error) }
  }
}

/* ============================================================
   Submit final
   ============================================================ */

export async function submitDepositAction(
  args: SubmitArgs,
): Promise<SubmitResult> {
  const session = await requireCurrentSession()
  let res: { ref: string }
  try {
    res = await convex.mutation(api.citizen.requests.submitRequest, {
      idnSub: session.idnSub,
      serviceSlug: args.serviceSlug,
      variantKey: args.variantKey,
      numberOfCopies: args.numberOfCopies,
      recipientEmail: args.recipientEmail,
      beneficiaryKind: args.beneficiaryKind,
      urgent: args.urgent,
      payload: args.payload,
      attachedPieceIds: args.attachedPieceIds?.map(asId),
      consents: { honor: args.honor, rgpd: args.rgpd },
    })
  } catch (error) {
    return { ok: false, message: extractFriendlyMessage(error) }
  }
  revalidatePath("/mon-espace")
  revalidatePath(`/mon-espace/demarches/${res.ref}`)
  redirect(`/mon-espace/demarches/${res.ref}`)
}
