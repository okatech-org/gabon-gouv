/**
 * State machine d'un circuit de signature polymorphe (ADR-0009).
 *
 * Un circuit pilote la séquence d'étapes (agent_instructeur → chef → officier)
 * pour 3 types de sujets : `document`, `correspondence`, `convention`.
 *
 * États possibles :
 *   - circuit : pending → active → completed | refused | cancelled
 *   - step    : pending → active → done | refused | skipped
 *
 * À chaque transition, la complétion du dernier step déclenche le callback
 * spécifique au sujet (issuer le doc, envoyer la correspondance, activer l'org).
 * Voir `onCircuitCompleted` pour le dispatch — l'implémentation des hooks
 * vit dans les mutations métier qui sont importées en lazy depuis le caller.
 */

import type { Id } from "../_generated/dataModel"
import type { MutationCtx } from "../_generated/server"
import type {
  AgentRole,
  SignatureCircuitStatus,
  SignatureStepStatus,
  SignatureSubjectKind,
} from "./enums"

// ============================================================
// Création d'un circuit
// ============================================================

export interface CircuitStepSpec {
  assigneeAgentId: Id<"agents">
  assigneeRole: AgentRole
}

export interface CreateCircuitArgs {
  subjectKind: SignatureSubjectKind
  subjectId: string
  steps: CircuitStepSpec[]
}

/**
 * Crée un circuit + ses étapes ordonnées. La première étape passe directement
 * en `active`, les suivantes en `pending`.
 *
 * Renvoie l'ID du circuit créé.
 */
export async function createCircuit(
  ctx: MutationCtx,
  args: CreateCircuitArgs,
): Promise<Id<"signatureCircuits">> {
  if (args.steps.length === 0) {
    throw new Error("Un circuit doit comporter au moins une étape.")
  }

  const now = Date.now()
  const circuitId = await ctx.db.insert("signatureCircuits", {
    subjectKind: args.subjectKind,
    subjectId: args.subjectId,
    status: "active",
    startedAt: now,
  })

  for (let i = 0; i < args.steps.length; i++) {
    const step = args.steps[i]
    await ctx.db.insert("signatureCircuitSteps", {
      circuitId,
      order: i,
      assigneeAgentId: step.assigneeAgentId,
      assigneeRoleSnapshot: step.assigneeRole,
      status: i === 0 ? "active" : "pending",
    })
  }

  return circuitId
}

// ============================================================
// Lecture
// ============================================================

export async function getCircuitWithSteps(
  ctx: MutationCtx,
  circuitId: Id<"signatureCircuits">,
) {
  const circuit = await ctx.db.get(circuitId)
  if (!circuit) throw new Error(`Circuit ${circuitId} introuvable.`)
  const steps = await ctx.db
    .query("signatureCircuitSteps")
    .withIndex("by_circuit_order", (q) => q.eq("circuitId", circuitId))
    .collect()
  steps.sort((a, b) => a.order - b.order)
  return { circuit, steps }
}

/** Retourne l'étape actuellement en `active`, ou `null` si terminé. */
export async function getActiveStep(
  ctx: MutationCtx,
  circuitId: Id<"signatureCircuits">,
) {
  const { steps } = await getCircuitWithSteps(ctx, circuitId)
  return steps.find((s) => s.status === "active") ?? null
}

// ============================================================
// Transitions
// ============================================================

export interface DecideStepArgs {
  circuitId: Id<"signatureCircuits">
  agentId: Id<"agents"> // pour vérifier que c'est bien l'assignee
  comment?: string
}

/**
 * Valide l'étape active : la marque `done`, démarre la suivante, et si c'est
 * la dernière, complète le circuit (et appelle le callback de sujet).
 */
export async function approveStep(
  ctx: MutationCtx,
  args: DecideStepArgs,
): Promise<{ circuitCompleted: boolean }> {
  const { circuit, steps } = await getCircuitWithSteps(ctx, args.circuitId)
  if (circuit.status !== "active") {
    throw new Error(`Circuit "${circuit.status}" — pas d'étape à approuver.`)
  }

  const active = steps.find((s) => s.status === "active")
  if (!active) throw new Error("Aucune étape active sur ce circuit.")
  if (active.assigneeAgentId !== args.agentId) {
    throw new Error(
      "Vous n'êtes pas l'assignee de l'étape active de ce circuit.",
    )
  }

  const now = Date.now()
  await ctx.db.patch(active._id, {
    status: "done",
    decidedAt: now,
    comment: args.comment,
  })

  const next = steps.find((s) => s.order === active.order + 1)
  if (next) {
    await ctx.db.patch(next._id, { status: "active" })
    return { circuitCompleted: false }
  }

  // Plus d'étape suivante → circuit complété
  await ctx.db.patch(circuit._id, {
    status: "completed",
    completedAt: now,
  })
  await onCircuitCompleted(ctx, circuit._id)
  return { circuitCompleted: true }
}

/**
 * Refuse l'étape active : marque le step `refused`, le circuit `refused`.
 * Le sujet retourne dans son état précédent (à gérer par le caller).
 */
export async function refuseStep(
  ctx: MutationCtx,
  args: DecideStepArgs,
): Promise<void> {
  const { circuit, steps } = await getCircuitWithSteps(ctx, args.circuitId)
  if (circuit.status !== "active") {
    throw new Error(`Circuit "${circuit.status}" — refus impossible.`)
  }

  const active = steps.find((s) => s.status === "active")
  if (!active) throw new Error("Aucune étape active sur ce circuit.")
  if (active.assigneeAgentId !== args.agentId) {
    throw new Error("Vous n'êtes pas l'assignee de l'étape active.")
  }
  if (!args.comment || args.comment.trim() === "") {
    throw new Error("Un commentaire est requis pour refuser une étape.")
  }

  const now = Date.now()
  await ctx.db.patch(active._id, {
    status: "refused",
    decidedAt: now,
    comment: args.comment,
  })
  await ctx.db.patch(circuit._id, {
    status: "refused",
    completedAt: now,
  })
}

/**
 * Annule un circuit avant son terme (ex : la demande est annulée par le citoyen).
 */
export async function cancelCircuit(
  ctx: MutationCtx,
  circuitId: Id<"signatureCircuits">,
  reason: string,
): Promise<void> {
  const circuit = await ctx.db.get(circuitId)
  if (!circuit) throw new Error("Circuit introuvable.")
  if (
    circuit.status === "completed" ||
    circuit.status === "refused" ||
    circuit.status === "cancelled"
  ) {
    return // idempotent
  }
  await ctx.db.patch(circuit._id, {
    status: "cancelled",
    cancelledAt: Date.now(),
    cancellationReason: reason,
  })
  // Marquer toutes les étapes non finales en `skipped`
  const steps = await ctx.db
    .query("signatureCircuitSteps")
    .withIndex("by_circuit_order", (q) => q.eq("circuitId", circuitId))
    .collect()
  for (const s of steps) {
    if (s.status === "pending" || s.status === "active") {
      await ctx.db.patch(s._id, { status: "skipped" })
    }
  }
}

// ============================================================
// Callback de complétion — dispatch par subjectKind
// ============================================================

/**
 * Appelée par `approveStep` quand le dernier step est validé.
 *
 * NOTE : les actions métier (issuer un document, marquer une correspondance
 * envoyée, activer un organisme) sont volontairement *non* implémentées ici.
 * Elles vivent dans les mutations de domaine. Cette fonction se contente de
 * patcher l'état minimal sur le sujet et de logger un événement.
 *
 * Les hooks complets seront branchés quand on écrira les mutations métier.
 */
async function onCircuitCompleted(
  ctx: MutationCtx,
  circuitId: Id<"signatureCircuits">,
): Promise<void> {
  const circuit = await ctx.db.get(circuitId)
  if (!circuit) return

  switch (circuit.subjectKind) {
    case "document": {
      const docId = circuit.subjectId as Id<"documents">
      const doc = await ctx.db.get(docId)
      if (doc) {
        await ctx.db.patch(docId, {
          status: "signed",
          issuedAt: Date.now(),
        })
      }
      break
    }
    case "correspondence": {
      const crId = circuit.subjectId as Id<"correspondences">
      const cr = await ctx.db.get(crId)
      if (cr) {
        await ctx.db.patch(crId, { status: "sent" })
      }
      break
    }
    case "convention": {
      const cvId = circuit.subjectId as Id<"conventions">
      const cv = await ctx.db.get(cvId)
      if (cv) {
        await ctx.db.patch(cvId, {
          status: "signed",
          fullySignedAt: Date.now(),
        })
      }
      break
    }
  }
}

// ============================================================
// Helpers de construction de circuits-types
// ============================================================

/**
 * Circuit standard pour la signature d'un acte d'état civil :
 *   1. Agent instructeur — préparation
 *   2. Chef de service — visa
 *   3. Officier signataire — signature finale
 */
export function buildDocumentCircuit(args: {
  instructeurId: Id<"agents">
  chefServiceId: Id<"agents">
  officierId: Id<"agents">
}): CircuitStepSpec[] {
  return [
    { assigneeAgentId: args.instructeurId, assigneeRole: "agent_instructeur" },
    { assigneeAgentId: args.chefServiceId, assigneeRole: "chef_service" },
    { assigneeAgentId: args.officierId, assigneeRole: "officier_signataire" },
  ]
}

/**
 * Circuit pour signer une convention d'onboarding (P3) :
 *   1. Plateforme (Digitalium)
 *   2. DG de l'organisme entrant
 */
export function buildConventionCircuit(args: {
  platformAgentId: Id<"agents">
  organismDgAgentId: Id<"agents">
}): CircuitStepSpec[] {
  return [
    { assigneeAgentId: args.platformAgentId, assigneeRole: "platform_admin" },
    { assigneeAgentId: args.organismDgAgentId, assigneeRole: "admin_organisme" },
  ]
}
