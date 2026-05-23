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

export async function validateStepAction(stepId: string): Promise<ActionResult> {
  const token = await requireSessionToken()
  try {
    const result = await convex.mutation(
      api.platform.onboarding.validateOnboardingStep,
      { token, stepId: stepId as never },
    )
    revalidatePath("/onboarding")
    revalidatePath("/")
    revalidatePath("/organisations")
    return {
      ok: true,
      message: result.processCompleted
        ? "Processus d'onboarding terminé · organisme activé."
        : `Étape validée. Étape suivante : ${result.nextStepKey ?? "—"}.`,
      data: result,
    }
  } catch (error) {
    return fail(error)
  }
}

export async function startSignatureAction(
  processId: string,
): Promise<ActionResult> {
  const token = await requireSessionToken()
  try {
    await convex.mutation(api.platform.onboarding.startSignatureStep, {
      token,
      processId: processId as never,
    })
    revalidatePath("/onboarding")
    return { ok: true, message: "Signature lancée · convention en attente." }
  } catch (error) {
    return fail(error)
  }
}

type AgentRole =
  | "agent_instructeur"
  | "agent_superviseur"
  | "chef_service"
  | "officier_signataire"
  | "admin_organisme"
  | "admin_technique"
  | "platform_admin"

type AuthMethod = "nip_only" | "nip_carte_agent" | "nip_cle_api"

export async function addReferentAction(
  processId: string,
  formData: FormData,
): Promise<ActionResult> {
  const fullName = String(formData.get("fullName") ?? "").trim()
  const functionTitle = String(formData.get("functionTitle") ?? "").trim()
  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  const role = String(formData.get("role") ?? "") as AgentRole
  const authMethod = String(formData.get("authMethod") ?? "") as AuthMethod

  if (!fullName || !email) {
    return { ok: false, message: "Nom et e-mail sont requis." }
  }
  if (!role || !authMethod) {
    return { ok: false, message: "Rôle et méthode d'authentification requis." }
  }

  const token = await requireSessionToken()
  try {
    await convex.mutation(api.platform.onboarding.addOnboardingReferent, {
      token,
      processId: processId as never,
      fullName,
      functionTitle,
      email,
      role,
      authMethod,
    })
    revalidatePath("/onboarding")
    return { ok: true, message: `Référent ${fullName} ajouté.` }
  } catch (error) {
    return fail(error)
  }
}
