/**
 * Émission finale d'un document — étape commune à `signAndIssue` (raccourci)
 * et à la complétion d'un circuit de signature multi-étapes.
 *
 * **Cycle assumé** :
 *   - Le `document` existe déjà (créé par `prepareDocument` ou par
 *     `signAndIssue` juste avant l'appel).
 *   - Si appelé par fin de circuit, son `status` est `signed`. Si raccourci,
 *     `prepared` ou `draft` — peu importe, on patche en `issued`.
 *   - La `request` peut être à `to_sign`, `in_instruction` ou `prepared`.
 *     `finalizeIssuance` la passe à `issued`.
 *
 * **Effets** (atomiques dans la transaction de mutation appelante) :
 *   1. Calcule sha256 + verificationCode + qualifiedTimestamp (stubs v1
 *      annotés — vraie génération PDF + horodatage RFC 3161 au futur).
 *   2. Patch document : `status=issued`, sha256/code/timestamp si absents,
 *      issuedAt.
 *   3. Patch request : `status=issued`, progressPct=100, issuedAt.
 *   4. Insert requestEvents : kind=`signature` puis `delivery`.
 *   5. Insert archive squelette (Bloc 6 complétera DUA, sort final, etc.).
 *      Idempotent — si une archive existe déjà pour ce document, on ne la
 *      ré-insère pas.
 *   6. Insert notification citoyen kind=`document_ready` (envoi réel
 *      via canal email/SMS/push = à câbler plus tard).
 *
 * **À NE PAS faire ici** : la vérification de permission (pour l'instant
 * c'est l'appelant qui contrôle, parce que les contextes diffèrent —
 * `document.issue` pour signAndIssue, `signature.approve` pour la fin de
 * circuit) et l'écriture d'`auditLog` métier (idem).
 */

import type { Id, Doc } from "../_generated/dataModel"
import type { MutationCtx } from "../_generated/server"
import { internal } from "../_generated/api"

export interface FinalizeArgs {
  documentId: Id<"documents">
  actorAgentId: Id<"agents">
}

export interface FinalizeResult {
  actNumber: string
  verificationCode: string
  sha256: string
  pdfStorageKey: string | null
}

export async function finalizeIssuance(
  ctx: MutationCtx,
  args: FinalizeArgs,
): Promise<FinalizeResult> {
  const doc = await ctx.db.get(args.documentId)
  if (!doc) throw new Error("Document introuvable.")

  const request = await ctx.db.get(doc.requestId)
  if (!request) throw new Error("Demande liée introuvable.")

  const service = await ctx.db.get(request.serviceId)
  const citizen = await ctx.db.get(doc.citizenId)

  const now = Date.now()

  // ---------- 1. Champs d'authenticité (stubs v1) ----------
  // sha256 : stub random tant que la génération PDF n'est pas en place.
  // Sera remplacé par le hash réel des bytes PDF en étape 9 du séquencage.
  // On préserve un sha256 déjà fixé si l'appelant l'a posé (cas où le PDF
  // a été généré en amont).
  const sha256 = doc.sha256 && doc.sha256.length === 64
    ? doc.sha256
    : stubRandomSha256()

  // verificationCode : format "GC-XX-NNNN" où XX = préfixe catégorie.
  // Unicité globale via boucle de tirage anti-collision (index by_verification_code).
  const verificationCode =
    doc.verificationCode ??
    (await generateUniqueVerificationCode(ctx, service?.category ?? "GN"))

  // qualifiedTimestamp : stub ISO pour v1. Brancher TSA RFC 3161 plus tard
  // (cf. § 11.4 de docs/request-processing-spec.md).
  const qualifiedTimestamp = doc.qualifiedTimestamp ?? new Date(now).toISOString()

  // ---------- 2. Patch document ----------
  await ctx.db.patch(doc._id, {
    status: "issued",
    issuedAt: now,
    sha256,
    verificationCode,
    qualifiedTimestamp,
  })

  // ---------- 3. Patch request ----------
  await ctx.db.patch(request._id, {
    status: "issued",
    progressPct: 100,
    issuedAt: now,
  })

  // ---------- 4. Timeline events ----------
  const actorAgent = await ctx.db.get(args.actorAgentId)
  const actorName = actorAgent?.name ?? "Agent"
  await ctx.db.insert("requestEvents", {
    requestId: request._id,
    kind: "signature",
    title: "Acte signé et émis",
    description: `${doc.actNumber} — empreinte ${sha256.slice(0, 8)}…`,
    actor: actorName,
    actorAgentId: args.actorAgentId,
    occurredAt: now,
  })
  await ctx.db.insert("requestEvents", {
    requestId: request._id,
    kind: "delivery",
    title: "Document mis à disposition du citoyen",
    description: `Code de vérification : ${verificationCode}.`,
    actor: actorName,
    actorAgentId: args.actorAgentId,
    occurredAt: now + 1, // +1ms pour ordering stable dans l'index
  })

  // ---------- 5. Archive squelette (idempotent) ----------
  await insertArchiveSkeleton(ctx, doc, service, citizen, sha256, qualifiedTimestamp)

  // ---------- 5.bis. Schedule la génération PDF (action Node) ----------
  // Le sha256 et le pdfStorageKey seront remplacés dans la foulée par les
  // valeurs réelles calculées sur les bytes PDF. L'idempotence est gérée
  // côté action (skip si pdfStorageKey existe déjà).
  await ctx.scheduler.runAfter(0, internal.pdf.action.generateDocumentPdf, {
    documentId: doc._id,
  })

  // ---------- 6. Notification citoyen ----------
  await ctx.db.insert("notifications", {
    recipientKind: "citizen",
    recipientId: String(doc.citizenId),
    kind: "document_ready",
    severity: "success",
    title: "Votre acte est prêt",
    body: service
      ? `${formatServiceTitle(service)} — réf. ${request.ref}. Téléchargez-le depuis votre espace.`
      : `Votre demande ${request.ref} est prête. Téléchargez l'acte depuis votre espace.`,
    linkTo: `/mon-espace/demandes/${request.ref}`,
    linkedRequestId: request._id,
    createdAt: now,
  })

  return {
    actNumber: doc.actNumber,
    verificationCode,
    sha256,
    pdfStorageKey: doc.pdfStorageKey ?? null,
  }
}

/* ============================================================
   Helpers internes
   ============================================================ */

/**
 * Crée un sha256 stub (64 chars hex). À remplacer par crypto.subtle.digest
 * des bytes du PDF dès que la génération PDF est branchée (étape 9 du
 * séquencage Bloc 3).
 */
function stubRandomSha256(): string {
  let out = ""
  for (let i = 0; i < 64; i++) {
    out += Math.floor(Math.random() * 16).toString(16)
  }
  return out
}

/**
 * Génère un verificationCode unique au format "GC-XX-NNNN".
 * Vérifie l'absence de collision via l'index `by_verification_code`.
 * Boucle bornée à 12 tentatives (probabilité de 12 collisions consécutives
 * sur 10000 codes ≈ négligeable même à 90% de saturation).
 */
async function generateUniqueVerificationCode(
  ctx: MutationCtx,
  category: string,
): Promise<string> {
  const prefix = categoryPrefix(category)
  for (let attempt = 0; attempt < 12; attempt++) {
    const seq = String(Math.floor(Math.random() * 10000)).padStart(4, "0")
    const code = `GC-${prefix}-${seq}`
    const existing = await ctx.db
      .query("documents")
      .withIndex("by_verification_code", (q) => q.eq("verificationCode", code))
      .first()
    if (!existing) return code
  }
  throw new Error(
    "Impossible de générer un code de vérification unique après 12 tentatives.",
  )
}

function categoryPrefix(category: string): string {
  const c = category.toLowerCase()
  if (c.startsWith("état civil") || c.startsWith("etat civil")) return "EC"
  if (c.startsWith("justice")) return "JU"
  if (c.startsWith("identité") || c.startsWith("identite")) return "DI"
  return "GN"
}

function formatServiceTitle(service: Doc<"services">): string {
  return service.variant ? `${service.title} · ${service.variant}` : service.title
}

/**
 * Insère un squelette d'archive (status=active) pour le document émis.
 * Idempotent : si une archive lie déjà ce document, on ne la ré-insère pas.
 * La DUA, le sort final et la mise en bordereau d'élimination sont du Bloc 6.
 */
async function insertArchiveSkeleton(
  ctx: MutationCtx,
  doc: Doc<"documents">,
  service: Doc<"services"> | null,
  citizen: Doc<"citizens"> | null,
  sha256: string,
  qualifiedTimestamp: string,
): Promise<void> {
  // Idempotence : on filtre les archives actives produites par cet organisme
  // et qui pointent vers ce document.
  const existing = await ctx.db
    .query("archives")
    .withIndex("by_organism_status", (q) =>
      q.eq("producerOrganismId", doc.organismId).eq("status", "active"),
    )
    .filter((q) => q.eq(q.field("linkedDocumentId"), doc._id))
    .first()
  if (existing) return

  const now = Date.now()
  const year = new Date(now).getFullYear()
  const seq = doc.actNumber.split("-").pop() ?? "00000"
  const prefix = doc.actNumber.split("-")[0] ?? "GN"
  const cote = `GA/${prefix}/${year}/${seq}`

  const descTitle = service ? formatServiceTitle(service) : doc.title
  const descCitizen = citizen?.name ?? doc.payload?.name ?? "—"

  await ctx.db.insert("archives", {
    cote,
    description: `${descTitle} · ${descCitizen}`,
    producerOrganismId: doc.organismId,
    versedAt: now,
    // DUA et sort final = Bloc 6. Placeholder pour ne pas casser l'UI archives.
    dua: "À définir",
    status: "active",
    finalSort: "À définir",
    sha256,
    qualifiedTimestamp,
    linkedDocumentId: doc._id,
    linkedRequestId: doc.requestId,
  })
}
