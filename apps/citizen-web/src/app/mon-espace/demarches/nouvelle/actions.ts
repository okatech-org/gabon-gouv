"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"
import { requireCurrentSession } from "@/lib/current-citizen"

export interface SubmitArgs {
  serviceSlug: string
  variantKey?: string
  numberOfCopies?: number
  recipientEmail?: string
  beneficiaryKind?: "self" | "third_party"
  honor: boolean
  rgpd: boolean
}

export interface SubmitResult {
  ok: boolean
  message?: string
  ref?: string
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
      consents: { honor: args.honor, rgpd: args.rgpd },
    })
  } catch (error) {
    return { ok: false, message: extractFriendlyMessage(error) }
  }
  revalidatePath("/mon-espace")
  revalidatePath(`/mon-espace/demarches/${res.ref}`)
  redirect(`/mon-espace/demarches/${res.ref}`)
}
