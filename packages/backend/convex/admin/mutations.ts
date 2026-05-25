import { v } from "convex/values"
import type { MutationCtx } from "../_generated/server"
import { mutation } from "../lib/triggers" // wrapper trigger-aware (ADR-0007)
import { requireAgent } from "../auth"
import type { Doc, Id } from "../_generated/dataModel"
import {
  actorFromAgent,
  assertCan,
  requireAgentRole,
} from "../lib/permissions"
import {
  approveStep,
  buildDocumentCircuit,
  createCircuit,
  refuseStep,
} from "../lib/signatureCircuit"
import { finalizeIssuance } from "../lib/issuance"
import {
  confidentialityLevelValidator,
  verificationStatusValidator,
} from "../lib/enums"

/* ---------- Assigner une demande à un agent ---------- */
export const assignRequest = mutation({
  args: {
    token: v.string(),
    ref: v.string(),
    agentId: v.optional(v.id("agents")), // null/undefined = m'assigner
  },
  handler: async (ctx, { token, ref, agentId }) => {
    const me = await requireAgent(ctx, token)
    const request = await getRequestByRef(ctx, ref)
    if (!request) throw new Error("Demande introuvable.")
    if (request.organismId !== me.organismId) {
      throw new Error("Demande hors de votre organisme.")
    }

    const targetAgentId: Id<"agents"> = agentId ?? me._id
    const targetAgent = await ctx.db.get(targetAgentId)
    if (!targetAgent || targetAgent.organismId !== me.organismId) {
      throw new Error("Agent cible invalide.")
    }

    await ctx.db.patch(request._id, { assignedAgentId: targetAgentId })
    await ctx.db.insert("requestEvents", {
      requestId: request._id,
      kind: "assignment",
      title: "Assignation",
      description: `${targetAgent.name} prend en charge le dossier.`,
      actor: me.name,
      occurredAt: Date.now(),
    })
  },
})

/* ---------- Demander une pièce au citoyen ---------- */
export const requestPiece = mutation({
  args: { token: v.string(), ref: v.string(), label: v.string() },
  handler: async (ctx, { token, ref, label }) => {
    const me = await requireAgent(ctx, token)
    const request = await getRequestByRef(ctx, ref)
    if (!request) throw new Error("Demande introuvable.")

    await ctx.db.insert("pieces", {
      requestId: request._id,
      label,
      status: "missing",
      required: true,
    })

    await ctx.db.patch(request._id, { status: "waiting_pieces" })
    await ctx.db.insert("requestEvents", {
      requestId: request._id,
      kind: "piece_request",
      title: "Pièce demandée",
      description: `Demande de pièce : ${label}.`,
      actor: me.name,
      occurredAt: Date.now(),
    })
  },
})

/* ---------- Transférer un dossier à un autre organisme ---------- */
export const transferRequest = mutation({
  args: { token: v.string(), ref: v.string(), toOrgId: v.id("organisms") },
  handler: async (ctx, { token, ref, toOrgId }) => {
    const me = await requireAgent(ctx, token)
    const request = await getRequestByRef(ctx, ref)
    if (!request) throw new Error("Demande introuvable.")
    const toOrg = await ctx.db.get(toOrgId)
    if (!toOrg) throw new Error("Organisme cible introuvable.")

    await ctx.db.patch(request._id, {
      organismId: toOrgId,
      assignedAgentId: undefined,
    })
    await ctx.db.insert("requestEvents", {
      requestId: request._id,
      kind: "transfer",
      title: "Transfert",
      description: `Dossier transféré à ${toOrg.shortName ?? toOrg.name}.`,
      actor: me.name,
      occurredAt: Date.now(),
    })
  },
})

/* ---------- Mettre à jour la note d'instruction ---------- */
export const updateInternalNote = mutation({
  args: { token: v.string(), ref: v.string(), note: v.string() },
  handler: async (ctx, { token, ref, note }) => {
    await requireAgent(ctx, token)
    const request = await getRequestByRef(ctx, ref)
    if (!request) throw new Error("Demande introuvable.")
    await ctx.db.patch(request._id, { internalNote: note })
  },
})

/* ---------- Signer et émettre un acte (raccourci 1 étape) ----------
 *
 * Réservé aux services à signature simple : `service.defaultSignatureCircuitTemplate`
 * absent OU contenant 0/1 étape. Pour les services multi-étapes, on impose
 * le passage par `prepareDocument` → `approveSignatureStep` × N.
 *
 * Préconditions vérifiées :
 *   1. Permission `document.issue` (officier_signataire ou admin_organisme).
 *   2. Demande dans un statut traitable (pas déjà issued/rejected/cancelled).
 *   3. Toutes les pièces `required` au statut `validated`.
 *   4. Toutes les `verifications` au statut `ok` ou `not_applicable`.
 *   5. Service compatible avec le raccourci (0/1 étape de circuit).
 *
 * L'émission finale (sha256, verificationCode, archive, notif citoyen) est
 * déléguée à `finalizeIssuance` (lib/issuance.ts).
 */
export const signAndIssue = mutation({
  args: { token: v.string(), ref: v.string() },
  handler: async (ctx, { token, ref }) => {
    const me = await requireAgent(ctx, token)
    assertCan(actorFromAgent(me), "document.issue")

    const request = await getRequestByRef(ctx, ref)
    if (!request) throw new Error("Demande introuvable.")
    if (request.organismId !== me.organismId) {
      throw new Error("Demande hors de votre organisme.")
    }
    if (
      request.status === "issued" ||
      request.status === "rejected" ||
      request.status === "cancelled"
    ) {
      throw new Error(`Demande "${request.status}" — émission impossible.`)
    }

    const service = await ctx.db.get(request.serviceId)
    if (!service) throw new Error("Service introuvable.")

    // Précondition : ce service est compatible avec le raccourci
    const stepsCount = service.defaultSignatureCircuitTemplate?.steps.length ?? 0
    if (stepsCount > 1) {
      throw new Error(
        "Ce service a un circuit de signature multi-étapes — passez par prepareDocument.",
      )
    }

    await assertPiecesAndVerificationsReady(ctx, request._id)

    // Création (ou réutilisation) du document `prepared` puis finalisation.
    const documentId = await upsertPreparedDocument(ctx, {
      request,
      service,
      preparerAgentId: me._id,
    })

    return finalizeIssuance(ctx, {
      documentId,
      actorAgentId: me._id,
    })
  },
})

/**
 * Crée un document `prepared` s'il n'en existe pas encore pour la demande,
 * sinon réutilise l'existant. Retourne l'ID dans les deux cas.
 *
 * Utilisé par `signAndIssue` (raccourci) ET par `prepareDocument` quand on
 * veut juste ré-ouvrir une émission après une refonte d'un acte rejeté.
 */
async function upsertPreparedDocument(
  ctx: MutationCtx,
  args: {
    request: Doc<"requests">
    service: Doc<"services">
    preparerAgentId: Id<"agents">
  },
): Promise<Id<"documents">> {
  const existing = await ctx.db
    .query("documents")
    .withIndex("by_request", (q) => q.eq("requestId", args.request._id))
    .filter((q) => q.neq(q.field("status"), "revoked"))
    .first()
  if (existing) return existing._id

  const citizen = await ctx.db.get(args.request.citizenId)
  if (!citizen) throw new Error("Citoyen introuvable.")

  // Snapshot du template actif pour la variante de la demande.
  // Stratégie : variant de la demande → variant par défaut du service →
  // n'importe quelle variant du service qui a un template actif → null.
  const matchingTemplate = await resolveActiveTemplate(ctx, {
    serviceId: args.service._id,
    preferredVariantId: args.request.serviceVariantId,
  })

  const now = Date.now()
  const year = new Date(now).getFullYear()
  const seq = String(Math.floor(Math.random() * 100000)).padStart(5, "0")
  const actNumber = `${prefix(args.service.category)}-LBV-${year}-${seq}`

  const documentId = await ctx.db.insert("documents", {
    actNumber,
    requestId: args.request._id,
    citizenId: args.request.citizenId,
    issuedByAgentId: args.preparerAgentId,
    issuedByAgentNameSnapshot: (await ctx.db.get(args.preparerAgentId))?.name,
    organismId: args.service.organismId,
    title: args.service.variant
      ? `${args.service.title} · ${args.service.variant}`
      : args.service.title,
    templateId: matchingTemplate?._id,
    templateVersion: matchingTemplate?.version,
    status: "prepared",
    // sha256/qualifiedTimestamp/verificationCode seront remplis (ou
    // remplacés) par finalizeIssuance ; on pose des stubs pour respecter
    // la non-optionalité du schema.
    issuedAt: now,
    sha256: "0".repeat(64),
    qualifiedTimestamp: new Date(now).toISOString(),
    qrCode: `GC-${prefix(args.service.category)}-${seq}`,
    payload: {
      name: citizen.name,
      nip: citizen.nip,
      birthDate: citizen.birthDate,
      birthPlace: citizen.birthPlace,
      fatherName: citizen.fatherName,
      motherName: citizen.motherName,
    },
  })
  return documentId
}

/**
 * Cherche un template actif pour un service, en préférant la variante demandée.
 * Renvoie null si aucun template actif n'existe (cas légitime : service en
 * cours de config).
 */
async function resolveActiveTemplate(
  ctx: MutationCtx,
  args: {
    serviceId: Id<"services">
    preferredVariantId?: Id<"serviceVariants">
  },
): Promise<Doc<"documentTemplates"> | null> {
  // 1. Variante explicite de la demande
  if (args.preferredVariantId) {
    const direct = await ctx.db
      .query("documentTemplates")
      .withIndex("by_variant_status", (q) =>
        q.eq("serviceVariantId", args.preferredVariantId!).eq("status", "active"),
      )
      .first()
    if (direct) return direct
  }

  // 2. Toutes les variantes du service → on prend l'active de la variante
  //    par défaut, sinon de la première variante avec un template actif.
  const variants = await ctx.db
    .query("serviceVariants")
    .withIndex("by_service", (q) => q.eq("serviceId", args.serviceId))
    .collect()
  variants.sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.order - b.order)
  for (const variant of variants) {
    const template = await ctx.db
      .query("documentTemplates")
      .withIndex("by_variant_status", (q) =>
        q.eq("serviceVariantId", variant._id).eq("status", "active"),
      )
      .first()
    if (template) return template
  }
  return null
}

/**
 * Vérifie qu'une demande est prête à l'émission :
 *   - toutes les pièces `required` sont `validated`
 *   - toutes les `verifications` sont `ok` ou `not_applicable`
 */
async function assertPiecesAndVerificationsReady(
  ctx: MutationCtx,
  requestId: Id<"requests">,
): Promise<void> {
  const pieces = await ctx.db
    .query("pieces")
    .withIndex("by_request", (q) => q.eq("requestId", requestId))
    .collect()
  const requiredNotValidated = pieces.filter(
    (p) => p.required && p.status !== "validated",
  )
  if (requiredNotValidated.length > 0) {
    throw new Error(
      `${requiredNotValidated.length} pièce(s) obligatoire(s) non validée(s).`,
    )
  }

  const verifications = await ctx.db
    .query("verifications")
    .withIndex("by_request", (q) => q.eq("requestId", requestId))
    .collect()
  const verifsBlocking = verifications.filter(
    (vv) => vv.status !== "ok" && vv.status !== "not_applicable",
  )
  if (verifsBlocking.length > 0) {
    throw new Error(
      `${verifsBlocking.length} vérification(s) non finalisée(s).`,
    )
  }
}

/* ---------- Marquer un courrier comme lu ---------- */
export const markCorrespondenceRead = mutation({
  args: { token: v.string(), ref: v.string() },
  handler: async (ctx, { token, ref }) => {
    const me = await requireAgent(ctx, token)
    const c = await ctx.db
      .query("correspondences")
      .withIndex("by_ref", (q) => q.eq("ref", ref))
      .unique()
    if (!c) throw new Error("Correspondance introuvable.")

    const existing = await ctx.db
      .query("correspondenceReads")
      .withIndex("by_correspondence_agent", (q) =>
        q.eq("correspondenceId", c._id).eq("agentId", me._id),
      )
      .unique()
    if (existing) return
    await ctx.db.insert("correspondenceReads", {
      correspondenceId: c._id,
      agentId: me._id,
      readAt: Date.now(),
    })
  },
})

/* ---------- Répondre à un courrier ---------- */
export const replyCorrespondence = mutation({
  args: { token: v.string(), ref: v.string(), body: v.string(), signed: v.boolean() },
  handler: async (ctx, { token, ref, body, signed }) => {
    const me = await requireAgent(ctx, token)
    const c = await ctx.db
      .query("correspondences")
      .withIndex("by_ref", (q) => q.eq("ref", ref))
      .unique()
    if (!c) throw new Error("Correspondance introuvable.")
    await ctx.db.insert("correspondenceMessages", {
      correspondenceId: c._id,
      fromAgentId: me._id,
      body,
      signed,
      sentAt: Date.now(),
    })
  },
})

/* ---------- Valider une pièce ---------- */
export const validatePiece = mutation({
  args: { token: v.string(), pieceId: v.id("pieces") },
  handler: async (ctx, { token, pieceId }) => {
    const me = await requireAgent(ctx, token)
    assertCan(actorFromAgent(me), "piece.validate")

    const piece = await ctx.db.get(pieceId)
    if (!piece) throw new Error("Pièce introuvable.")
    if (!piece.requestId) {
      throw new Error("Pièce non rattachée à une demande.")
    }
    const requestId = piece.requestId
    const request = await ctx.db.get(requestId)
    if (!request || request.organismId !== me.organismId) {
      throw new Error("Pièce hors de votre périmètre.")
    }

    const now = Date.now()
    await ctx.db.patch(piece._id, {
      status: "validated",
      validatedAt: now,
      validatedByAgentId: me._id,
    })
    await ctx.db.insert("requestEvents", {
      requestId,
      kind: "piece_received",
      title: "Pièce validée",
      description: `${piece.label} validée par l'agent.`,
      actor: me.name,
      actorAgentId: me._id,
      occurredAt: now,
    })

    // Si la demande était bloquée sur les pièces et que tout est validé → in_instruction
    if (request.status === "waiting_pieces") {
      const remaining = await ctx.db
        .query("pieces")
        .withIndex("by_request_status", (q) =>
          q.eq("requestId", requestId).eq("status", "missing"),
        )
        .first()
      if (!remaining) {
        await ctx.db.patch(request._id, { status: "in_instruction" })
      }
    }
  },
})

/* ---------- Rejeter une pièce ---------- */
export const rejectPiece = mutation({
  args: {
    token: v.string(),
    pieceId: v.id("pieces"),
    reason: v.string(),
  },
  handler: async (ctx, { token, pieceId, reason }) => {
    const me = await requireAgent(ctx, token)
    assertCan(actorFromAgent(me), "piece.reject")
    if (!reason.trim()) throw new Error("Un motif est requis pour rejeter.")

    const piece = await ctx.db.get(pieceId)
    if (!piece) throw new Error("Pièce introuvable.")
    if (!piece.requestId) {
      throw new Error("Pièce non rattachée à une demande.")
    }
    const requestId = piece.requestId
    const request = await ctx.db.get(requestId)
    if (!request || request.organismId !== me.organismId) {
      throw new Error("Pièce hors de votre périmètre.")
    }

    await ctx.db.patch(piece._id, {
      status: "rejected",
      rejectionReason: reason,
    })
    await ctx.db.patch(request._id, { status: "waiting_pieces" })
    await ctx.db.insert("requestEvents", {
      requestId,
      kind: "piece_rejected",
      title: "Pièce rejetée",
      description: `${piece.label} : ${reason}`,
      actor: me.name,
      actorAgentId: me._id,
      occurredAt: Date.now(),
    })
  },
})

/* ---------- Mettre à jour le statut d'une vérification automatique ---------- */
export const setVerificationStatus = mutation({
  args: {
    token: v.string(),
    verificationId: v.id("verifications"),
    status: verificationStatusValidator,
    evidence: v.optional(v.string()),
  },
  handler: async (ctx, { token, verificationId, status, evidence }) => {
    const me = await requireAgent(ctx, token)
    assertCan(actorFromAgent(me), "verification.update")

    const verification = await ctx.db.get(verificationId)
    if (!verification) throw new Error("Vérification introuvable.")
    const request = await ctx.db.get(verification.requestId)
    if (!request || request.organismId !== me.organismId) {
      throw new Error("Vérification hors de votre périmètre.")
    }

    const now = Date.now()
    await ctx.db.patch(verificationId, {
      status,
      evidence: evidence?.trim() || verification.evidence,
      performedAt: now,
      performedByAgentId: me._id,
    })

    await ctx.db.insert("requestEvents", {
      requestId: request._id,
      kind: "verification",
      title: `Vérification : ${verification.title}`,
      description:
        status === "ok"
          ? `Validée${evidence ? ` (${evidence})` : ""}.`
          : status === "ko"
            ? `Échec${evidence ? ` : ${evidence}` : ""}.`
            : status === "not_applicable"
              ? "Marquée non applicable."
              : "En cours.",
      actor: me.name,
      actorAgentId: me._id,
      occurredAt: now,
    })
  },
})

/* ---------- Rejeter une demande ---------- */
export const rejectRequest = mutation({
  args: { token: v.string(), ref: v.string(), reason: v.string() },
  handler: async (ctx, { token, ref, reason }) => {
    const me = await requireAgent(ctx, token)
    assertCan(actorFromAgent(me), "request.reject")
    if (!reason.trim()) throw new Error("Un motif de rejet est requis.")

    const request = await getRequestByRef(ctx, ref)
    if (!request) throw new Error("Demande introuvable.")
    if (request.organismId !== me.organismId) {
      throw new Error("Demande hors de votre organisme.")
    }
    if (request.status === "issued") {
      throw new Error("Acte déjà émis, utilisez la révocation.")
    }

    const now = Date.now()
    await ctx.db.patch(request._id, {
      status: "rejected",
      rejectedAt: now,
      rejectionReason: reason,
      progressPct: 0,
    })
    await ctx.db.insert("requestEvents", {
      requestId: request._id,
      kind: "status_change",
      title: "Demande rejetée",
      description: reason,
      actor: me.name,
      actorAgentId: me._id,
      occurredAt: now,
    })
  },
})

/* ---------- Envoyer un courrier inter-admin ---------- */
export const sendCorrespondence = mutation({
  args: {
    token: v.string(),
    toOrgId: v.id("organisms"),
    subject: v.string(),
    body: v.string(),
    urgent: v.boolean(),
    confidentiality: confidentialityLevelValidator,
    archivePolicy: v.string(),
    linkedRequestRef: v.optional(v.string()),
    linkedCitizenId: v.optional(v.id("citizens")),
    signed: v.boolean(),
  },
  handler: async (
    ctx,
    {
      token,
      toOrgId,
      subject,
      body,
      urgent,
      confidentiality,
      archivePolicy,
      linkedRequestRef,
      linkedCitizenId,
      signed,
    },
  ) => {
    const me = await requireAgent(ctx, token)
    assertCan(actorFromAgent(me), "correspondence.send")

    const toOrg = await ctx.db.get(toOrgId)
    if (!toOrg) throw new Error("Organisme destinataire introuvable.")

    const linkedRequest = linkedRequestRef
      ? await getRequestByRef(ctx, linkedRequestRef)
      : null

    const now = Date.now()
    const year = new Date(now).getFullYear()
    const seq = String(Math.floor(Math.random() * 10000)).padStart(4, "0")
    const ref = `CR-${year}-${seq}`

    const correspondenceId = await ctx.db.insert("correspondences", {
      ref,
      fromOrganismId: me.organismId,
      toOrganismId: toOrgId,
      subject,
      body,
      urgent,
      confidentiality,
      archivePolicy,
      status: "sent",
      sentAt: now,
      linkedRequestId: linkedRequest?._id,
      linkedCitizenId: linkedCitizenId ?? linkedRequest?.citizenId,
    })

    await ctx.db.insert("correspondenceMessages", {
      correspondenceId,
      fromAgentId: me._id,
      body,
      signed,
      sentAt: now,
    })

    return { ref, correspondenceId }
  },
})

/* ---------- Préparer un acte + ouvrir le circuit de signature ----------
 *
 * Crée le document `prepared` (ou réutilise un existant non-révoqué) et
 * ouvre un circuit de signature multi-étapes.
 *
 * **Résolution des assignees** :
 *   - Si `service.defaultSignatureCircuitTemplate` est défini, on résout
 *     dynamiquement les assignees par rôle (premier agent actif de l'organisme
 *     ayant le rôle requis pour chaque étape).
 *   - Sinon, on tombe sur un circuit standard 3-étapes
 *     (instructeur=me → chef_service → officier_signataire) avec les
 *     `chefServiceId` / `officierId` passés explicitement par l'appelant.
 *
 * Préconditions : mêmes que `signAndIssue` (pièces + vérifs prêtes).
 */
export const prepareDocument = mutation({
  args: {
    token: v.string(),
    ref: v.string(),
    // Optionnels : fallback si le service n'a pas de defaultSignatureCircuitTemplate.
    chefServiceId: v.optional(v.id("agents")),
    officierId: v.optional(v.id("agents")),
  },
  handler: async (ctx, { token, ref, chefServiceId, officierId }) => {
    const me = await requireAgent(ctx, token)
    assertCan(actorFromAgent(me), "document.prepare")

    const request = await getRequestByRef(ctx, ref)
    if (!request) throw new Error("Demande introuvable.")
    if (request.organismId !== me.organismId) {
      throw new Error("Demande hors de votre organisme.")
    }
    if (
      request.status === "issued" ||
      request.status === "rejected" ||
      request.status === "cancelled" ||
      request.status === "to_sign"
    ) {
      throw new Error(
        `Demande "${request.status}" — préparation impossible.`,
      )
    }

    const service = await ctx.db.get(request.serviceId)
    if (!service) throw new Error("Service introuvable.")

    await assertPiecesAndVerificationsReady(ctx, request._id)

    // Résolution des steps : template du service > arguments explicites
    const steps = await resolveCircuitSteps(ctx, {
      service,
      organismId: me.organismId,
      preparerAgentId: me._id,
      fallbackChefServiceId: chefServiceId,
      fallbackOfficierId: officierId,
    })

    const documentId = await upsertPreparedDocument(ctx, {
      request,
      service,
      preparerAgentId: me._id,
    })

    const circuitId = await createCircuit(ctx, {
      subjectKind: "document",
      subjectId: documentId,
      steps,
    })
    await ctx.db.patch(documentId, { signatureCircuitId: circuitId })
    await ctx.db.patch(request._id, { status: "to_sign", progressPct: 75 })

    const doc = await ctx.db.get(documentId)
    await ctx.db.insert("requestEvents", {
      requestId: request._id,
      kind: "status_change",
      title: "Acte préparé, circuit ouvert",
      description: `${doc?.actNumber ?? ""} en attente de visa (${steps.length} étape${steps.length > 1 ? "s" : ""}).`,
      actor: me.name,
      actorAgentId: me._id,
      occurredAt: Date.now(),
    })

    // Notification au premier assignee (autre que l'instructeur lui-même)
    if (steps.length > 1 && steps[1]) {
      await ctx.db.insert("notifications", {
        recipientKind: "agent",
        recipientId: String(steps[1].assigneeAgentId),
        kind: "signature_requested",
        severity: "info",
        title: "Visa demandé",
        body: `${doc?.actNumber ?? ""} attend votre approbation.`,
        linkTo: `/signatures`,
        linkedRequestId: request._id,
        createdAt: Date.now(),
      })
    }

    return { documentId, circuitId, actNumber: doc?.actNumber }
  },
})

/**
 * Résout les agents assignés à chaque étape d'un circuit pour un service donné.
 *
 * Stratégie :
 *   - Le préparateur (`preparerAgentId`) est toujours assigné à l'étape 0
 *     (qui passera en `done` immédiatement par convention — il a préparé).
 *   - Si le service a un `defaultSignatureCircuitTemplate` : pour chaque step
 *     (au-delà de l'instructeur), on cherche un agent actif de l'organisme
 *     ayant le `roleRequired`.
 *   - Sinon (fallback legacy) : circuit standard 3-étapes avec les fallback*
 *     passés explicitement.
 */
async function resolveCircuitSteps(
  ctx: MutationCtx,
  args: {
    service: Doc<"services">
    organismId: Id<"organisms">
    preparerAgentId: Id<"agents">
    fallbackChefServiceId?: Id<"agents">
    fallbackOfficierId?: Id<"agents">
  },
) {
  const template = args.service.defaultSignatureCircuitTemplate

  if (template && template.steps.length > 0) {
    // Templates : résoudre dynamiquement les agents par rôle dans l'organisme
    const sortedSteps = [...template.steps].sort((a, b) => a.order - b.order)
    const resolved = []
    for (const step of sortedSteps) {
      const candidate = await ctx.db
        .query("agents")
        .withIndex("by_organism_role", (q) =>
          q.eq("organismId", args.organismId).eq("role", step.roleRequired),
        )
        .first()
      if (!candidate) {
        throw new Error(
          `Aucun agent avec le rôle "${step.roleRequired}" dans cet organisme — circuit impossible.`,
        )
      }
      resolved.push({
        assigneeAgentId: candidate._id,
        assigneeRole: step.roleRequired,
      })
    }
    return resolved
  }

  // Fallback legacy : circuit 3-étapes instructeur → chef → officier
  if (!args.fallbackChefServiceId || !args.fallbackOfficierId) {
    throw new Error(
      "Service sans circuit par défaut : chefServiceId et officierId sont requis.",
    )
  }
  return buildDocumentCircuit({
    instructeurId: args.preparerAgentId,
    chefServiceId: args.fallbackChefServiceId,
    officierId: args.fallbackOfficierId,
  })
}

/* ---------- Approuver l'étape active d'un circuit ----------
 *
 * Permission statique : `signature.approve` (rôles susceptibles d'être
 * assignés à un step). Vérification dynamique additionnelle dans `approveStep`
 * (l'agent doit être l'assignee du step `active`).
 *
 * Si c'est la dernière étape, `lib/signatureCircuit.onCircuitCompleted`
 * délègue à `lib/issuance.finalizeIssuance` qui patche la demande en `issued`,
 * écrit l'archive squelette et notifie le citoyen.
 */
export const approveSignatureStep = mutation({
  args: {
    token: v.string(),
    circuitId: v.id("signatureCircuits"),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, { token, circuitId, comment }) => {
    const me = await requireAgent(ctx, token)
    assertCan(actorFromAgent(me), "signature.approve")
    return approveStep(ctx, { circuitId, agentId: me._id, comment })
  },
})

/* ---------- Refuser l'étape active d'un circuit ----------
 *
 * Pour les circuits de documents : on **rebascule la demande à
 * `in_instruction`** (décision § 11.3 de docs/request-processing-spec.md)
 * pour que l'instructeur puisse corriger et re-préparer. La demande N'est
 * PAS automatiquement marquée `rejected` — c'est un acte séparé via
 * `rejectRequest` si l'instructeur abandonne.
 *
 * On notifie aussi le préparateur initial (issuedByAgentId) pour qu'il sache.
 */
export const refuseSignatureStep = mutation({
  args: {
    token: v.string(),
    circuitId: v.id("signatureCircuits"),
    comment: v.string(),
  },
  handler: async (ctx, { token, circuitId, comment }) => {
    const me = await requireAgent(ctx, token)
    assertCan(actorFromAgent(me), "signature.refuse")
    await refuseStep(ctx, { circuitId, agentId: me._id, comment })

    // Pour les circuits de documents : rebascule de la demande en instruction
    const circuit = await ctx.db.get(circuitId)
    if (!circuit || circuit.subjectKind !== "document") return

    const docId = circuit.subjectId as Id<"documents">
    const doc = await ctx.db.get(docId)
    if (!doc) return
    const request = await ctx.db.get(doc.requestId)
    if (!request) return

    await ctx.db.patch(request._id, {
      status: "in_instruction",
      progressPct: 50,
    })
    await ctx.db.insert("requestEvents", {
      requestId: request._id,
      kind: "status_change",
      title: "Visa refusé — retour instruction",
      description: comment,
      actor: me.name,
      actorAgentId: me._id,
      occurredAt: Date.now(),
    })

    // Notification au préparateur (instructeur initial) — sauf s'il est moi
    if (doc.issuedByAgentId !== me._id) {
      await ctx.db.insert("notifications", {
        recipientKind: "agent",
        recipientId: String(doc.issuedByAgentId),
        kind: "request_status_change",
        severity: "warning",
        title: "Acte refusé par signataire",
        body: `${doc.actNumber} a été refusé : ${comment.slice(0, 120)}${comment.length > 120 ? "…" : ""}`,
        linkTo: `/demandes/${request.ref}`,
        linkedRequestId: request._id,
        createdAt: Date.now(),
      })
    }
  },
})

/* ---------- Verser au SAE (manuel — automatique sinon via signAndIssue) ---------- */
export const verseToSAE = mutation({
  args: { token: v.string(), documentId: v.id("documents") },
  handler: async (ctx, { token, documentId }) => {
    const me = await requireAgent(ctx, token)
    requireAgentRole(
      actorFromAgent(me),
      "officier_signataire",
      "admin_organisme",
    )

    const doc = await ctx.db.get(documentId)
    if (!doc) throw new Error("Document introuvable.")
    if (doc.organismId !== me.organismId) {
      throw new Error("Document hors de votre organisme.")
    }

    // Idempotent : si déjà versé, on retourne la cote existante.
    const existing = await ctx.db
      .query("archives")
      .withIndex("by_organism_status", (q) =>
        q.eq("producerOrganismId", me.organismId).eq("status", "active"),
      )
      .filter((q) => q.eq(q.field("linkedDocumentId"), documentId))
      .first()
    if (existing) return { cote: existing.cote, archiveId: existing._id, already: true }

    const now = Date.now()
    const year = new Date(now).getFullYear()
    const seq = doc.actNumber.split("-").pop() ?? "00000"
    const cote = `GA/${doc.actNumber.split("-")[0]}/${year}/${seq}`

    const archiveId = await ctx.db.insert("archives", {
      cote,
      description: `${doc.title} · ${doc.payload?.name ?? doc.actNumber}`,
      producerOrganismId: me.organismId,
      versedAt: now,
      dua: "Indéf.",
      status: "active",
      finalSort: "Conservation définitive",
      finalDisposition: "conservation_definitive",
      sha256: doc.sha256,
      qualifiedTimestamp: doc.qualifiedTimestamp,
      linkedDocumentId: doc._id,
      linkedRequestId: doc.requestId,
    })

    return { cote, archiveId, already: false }
  },
})

/* ---------- Écrire au citoyen sur une demande (C5 ↔ A3 thread) ---------- */
export const sendMessageToCitizen = mutation({
  args: { token: v.string(), ref: v.string(), body: v.string() },
  handler: async (ctx, { token, ref, body }) => {
    const me = await requireAgent(ctx, token)
    const trimmed = body.trim()
    if (!trimmed) throw new Error("Le message ne peut pas être vide.")

    const request = await getRequestByRef(ctx, ref)
    if (!request) throw new Error("Demande introuvable.")
    if (request.organismId !== me.organismId) {
      throw new Error("Demande hors de votre organisme.")
    }

    const now = Date.now()
    await ctx.db.insert("requestMessages", {
      requestId: request._id,
      fromKind: "agent",
      fromAgentId: me._id,
      body: trimmed,
      sentAt: now,
    })
    await ctx.db.insert("requestEvents", {
      requestId: request._id,
      kind: "message",
      title: "Message envoyé au citoyen",
      description: trimmed.length > 80 ? trimmed.slice(0, 77) + "…" : trimmed,
      actor: me.name,
      actorAgentId: me._id,
      occurredAt: now,
    })
  },
})

/* ---------- Helpers ---------- */
async function getRequestByRef(ctx: MutationCtx, ref: string) {
  return ctx.db
    .query("requests")
    .withIndex("by_ref", (q) => q.eq("ref", ref))
    .unique()
}

function prefix(category: string) {
  const c = category.toLowerCase()
  if (c.startsWith("état civil") || c.startsWith("etat civil")) return "EC"
  if (c.startsWith("justice")) return "JU"
  if (c.startsWith("identité") || c.startsWith("identite")) return "DI"
  return "GN"
}

