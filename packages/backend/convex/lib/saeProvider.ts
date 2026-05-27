/**
 * Adapter SAE pour Gabon Connect (Bloc 6 — architecture hybride Option C).
 *
 * Voir [docs/archive-sae-spec.md](../../../../docs/archive-sae-spec.md) pour
 * la décision d'architecture et le périmètre.
 *
 * **Principe** : Gabon Connect insère toujours une entrée locale dans la
 * table `archives` (sert d'index + audit cross-app). Un provider pluggable
 * gère en plus le versement éventuel vers un SAE externe (Digitalium SAE,
 * Vitam, etc.) selon la configuration de l'organisme.
 *
 * - **`LocalSaeProvider`** (défaut v1) : no-op au-delà de l'insertion locale.
 *   L'archivage légal (élimination, récolement, intégrité) reste du ressort
 *   du SAE quand il sera branché.
 * - **`DigitaliumSaeProvider`** (skeleton v1) : interface conçue pour pousser
 *   les versements via le connecteur HMAC ADR-0021 de Digitalium SAE. Pas
 *   d'implémentation effective v1 — la mutation `verse` retourne un TODO
 *   documenté en log.
 *
 * Toutes les implémentations partagent le même contrat minimaliste :
 * `verse` (idempotent) et `getStatus`.
 */

import { v } from "convex/values"
import type { Doc, Id } from "../_generated/dataModel"
import type { MutationCtx, QueryCtx } from "../_generated/server"
import { internal } from "../_generated/api"

/* ============================================================
   Validators publics (pour les mutations qui prennent ces shapes)
   ============================================================ */

export const verseArgsValidator = v.object({
  organismId: v.id("organisms"),
  cote: v.string(),
  description: v.string(),
  sha256: v.string(),
  qualifiedTimestamp: v.optional(v.string()),
  duaCode: v.string(),
  duaExpiresAt: v.optional(v.number()),
  finalSort: v.optional(v.string()),
  linkedDocumentId: v.optional(v.id("documents")),
  linkedRequestId: v.optional(v.id("requests")),
  linkedCorrespondenceId: v.optional(v.id("correspondences")),
  sizeBytes: v.optional(v.number()),
})

export interface VerseArgs {
  organismId: Id<"organisms">
  cote: string
  description: string
  sha256: string
  qualifiedTimestamp?: string
  duaCode: string
  duaExpiresAt?: number
  finalSort?: string
  linkedDocumentId?: Id<"documents">
  linkedRequestId?: Id<"requests">
  linkedCorrespondenceId?: Id<"correspondences">
  sizeBytes?: number
}

export interface VerseResult {
  archiveId: Id<"archives">
  cote: string
  externalSaeId?: string
  externalSaeKind?: string
  alreadyExisted: boolean
}

export type ArchiveStatus = "active" | "destroyed" | "pending" | "unknown"

/* ============================================================
   Interface
   ============================================================ */

export interface SaeProvider {
  readonly kind: "local" | "digitalium" | "noop"
  verse(ctx: MutationCtx, args: VerseArgs): Promise<VerseResult>
  getStatus(
    ctx: QueryCtx | MutationCtx,
    args: { cote: string },
  ): Promise<{ status: ArchiveStatus } | null>
}

/* ============================================================
   Factory
   ============================================================ */

/**
 * Renvoie le SaeProvider configuré pour un organisme donné.
 *
 * V1 : lit `organisms.saeConfig.provider`. Si absent → LocalSaeProvider.
 * Si "digitalium" → DigitaliumSaeProvider (skeleton qui log + fallback local).
 *
 * Cette factory est `async` pour permettre, dans le futur, de charger des
 * credentials depuis env ou un secret manager sans bloquer l'interface.
 */
export async function getSaeProvider(
  ctx: QueryCtx | MutationCtx,
  organismId: Id<"organisms">,
): Promise<SaeProvider> {
  const org = await ctx.db.get(organismId)
  const provider = org?.saeConfig?.provider ?? "local"

  if (provider === "digitalium") {
    return new DigitaliumSaeProvider({
      connectorId: org?.saeConfig?.digitaliumConnectorId,
      baseUrl: org?.saeConfig?.digitaliumBaseUrl,
    })
  }
  return new LocalSaeProvider()
}

/* ============================================================
   LocalSaeProvider — implémentation v1 par défaut
   ============================================================ */

export class LocalSaeProvider implements SaeProvider {
  readonly kind = "local" as const

  async verse(ctx: MutationCtx, args: VerseArgs): Promise<VerseResult> {
    // Idempotence : si une archive existe déjà pour ce document ou cette
    // corres, on renvoie la même sans en créer une nouvelle.
    const existing = await findExistingArchive(ctx, args)
    if (existing) {
      return {
        archiveId: existing._id,
        cote: existing.cote,
        externalSaeId: existing.externalSaeId,
        externalSaeKind: existing.externalSaeKind,
        alreadyExisted: true,
      }
    }

    const archiveId = await ctx.db.insert("archives", {
      cote: args.cote,
      description: args.description,
      producerOrganismId: args.organismId,
      versedAt: Date.now(),
      dua: args.duaCode,
      duaExpiresAt: args.duaExpiresAt,
      status: "active",
      finalSort: args.finalSort ?? "À définir",
      sha256: args.sha256,
      qualifiedTimestamp: args.qualifiedTimestamp,
      sizeBytes: args.sizeBytes,
      linkedDocumentId: args.linkedDocumentId,
      linkedRequestId: args.linkedRequestId,
      linkedCorrespondenceId: args.linkedCorrespondenceId,
    })
    return {
      archiveId,
      cote: args.cote,
      alreadyExisted: false,
    }
  }

  async getStatus(
    ctx: QueryCtx | MutationCtx,
    args: { cote: string },
  ): Promise<{ status: ArchiveStatus } | null> {
    const archive = await ctx.db
      .query("archives")
      .withIndex("by_cote", (q) => q.eq("cote", args.cote))
      .first()
    if (!archive) return null
    return { status: mapArchiveStatus(archive.status) }
  }
}

/** Mappe un statut local d'archive vers le statut logique du provider. */
function mapArchiveStatus(local: string): ArchiveStatus {
  switch (local) {
    case "destroyed":
      return "destroyed"
    case "scheduled_destruction":
      return "pending"
    case "active":
    case "semi_active":
    case "inactive":
    case "archived_final":
      return "active"
    default:
      return "unknown"
  }
}

/* ============================================================
   DigitaliumSaeProvider — skeleton v1 (pas de push effectif)
   ============================================================ */

export interface DigitaliumConfig {
  connectorId?: string
  baseUrl?: string
}

/**
 * Skeleton de provider pour Digitalium SAE national.
 *
 * **V1 : ne pousse RIEN au SAE distant.** Insère localement comme
 * LocalSaeProvider et log un warning. Le code expose l'**interface
 * d'intégration future** : connecteur HMAC POST
 * `{baseUrl}/api/connectors/{connectorId}/events`, headers X-Event-Id +
 * X-Digitalium-Signature (sha256=...), conformité ADR-0021.
 *
 * Quand le SAE national sera réellement déployé :
 *   1. Implémenter `dispatchToDigitalium` (fetch + HMAC + retry borné)
 *   2. Activer le call dans `verse` après l'insertion locale
 *   3. Capturer l'`externalSaeId` retourné par le SAE et le persister
 */
export class DigitaliumSaeProvider implements SaeProvider {
  readonly kind = "digitalium" as const

  constructor(private config: DigitaliumConfig) {}

  async verse(ctx: MutationCtx, args: VerseArgs): Promise<VerseResult> {
    // Idempotence locale (même logique que LocalSaeProvider)
    const existing = await findExistingArchive(ctx, args)
    if (existing) {
      return {
        archiveId: existing._id,
        cote: existing.cote,
        externalSaeId: existing.externalSaeId,
        externalSaeKind: existing.externalSaeKind,
        alreadyExisted: true,
      }
    }

    // V1 : insert local avec marqueur "en attente de push SAE"
    const archiveId = await ctx.db.insert("archives", {
      cote: args.cote,
      description: args.description,
      producerOrganismId: args.organismId,
      versedAt: Date.now(),
      dua: args.duaCode,
      duaExpiresAt: args.duaExpiresAt,
      status: "active",
      finalSort: args.finalSort ?? "À définir",
      sha256: args.sha256,
      qualifiedTimestamp: args.qualifiedTimestamp,
      sizeBytes: args.sizeBytes,
      linkedDocumentId: args.linkedDocumentId,
      linkedRequestId: args.linkedRequestId,
      linkedCorrespondenceId: args.linkedCorrespondenceId,
      externalSaeKind: "digitalium",
      externalStatus: "pending_dispatch",
      externalStatusUpdatedAt: Date.now(),
    })

    // Phase Trous D — dispatch effectif vers Digitalium SAE via action Node.
    // Non bloquant : on schedule pour ne pas tenir la transaction ouverte
    // pendant le fetch HTTP. Le scheduler garantit le run après la commit.
    await ctx.scheduler.runAfter(
      0,
      internal.sae.dispatch.toDigitalium,
      { archiveId },
    )
    void this.config

    return {
      archiveId,
      cote: args.cote,
      externalSaeKind: "digitalium",
      alreadyExisted: false,
    }
  }

  async getStatus(
    ctx: QueryCtx | MutationCtx,
    args: { cote: string },
  ): Promise<{ status: ArchiveStatus } | null> {
    // V1 : on lit le statut local. Quand le SAE sera branché, on pourra
    // appeler son endpoint `/api/archives/{cote}/status` (HMAC signé) pour
    // avoir le statut authoritative.
    const archive = await ctx.db
      .query("archives")
      .withIndex("by_cote", (q) => q.eq("cote", args.cote))
      .first()
    if (!archive) return null
    return { status: mapArchiveStatus(archive.status) }
  }
}

/* ============================================================
   Helpers internes
   ============================================================ */

/**
 * Cherche une archive existante par lien fort (document/request/correspondence)
 * pour assurer l'idempotence de `verse`.
 *
 * Stratégie : on essaye d'abord par documentId, puis correspondenceId, puis
 * requestId. Si aucun match → on insère une nouvelle archive.
 */
async function findExistingArchive(
  ctx: MutationCtx,
  args: VerseArgs,
): Promise<Doc<"archives"> | null> {
  if (args.linkedDocumentId) {
    const found = await ctx.db
      .query("archives")
      .withIndex("by_organism_status", (q) =>
        q.eq("producerOrganismId", args.organismId).eq("status", "active"),
      )
      .filter((q) => q.eq(q.field("linkedDocumentId"), args.linkedDocumentId))
      .first()
    if (found) return found
  }
  if (args.linkedCorrespondenceId) {
    const found = await ctx.db
      .query("archives")
      .withIndex("by_organism_status", (q) =>
        q.eq("producerOrganismId", args.organismId).eq("status", "active"),
      )
      .filter((q) =>
        q.eq(q.field("linkedCorrespondenceId"), args.linkedCorrespondenceId),
      )
      .first()
    if (found) return found
  }
  // Fallback : recherche par cote (unicité fonctionnelle)
  const byCote = await ctx.db
    .query("archives")
    .withIndex("by_cote", (q) => q.eq("cote", args.cote))
    .first()
  return byCote
}
