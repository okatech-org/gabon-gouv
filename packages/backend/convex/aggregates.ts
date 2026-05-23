/**
 * Agrégats Convex — count / sum / range en O(log n) (ADR-0007).
 *
 * Chaque `TableAggregate` est un B-tree maintenu par triggers (cf
 * `lib/triggers.ts`). Pattern : https://stack.convex.dev/efficient-count-sum-max-with-the-aggregate-component
 *
 * Règle :
 *   - aggregates "globaux" → un seul arbre, pas de namespace
 *   - aggregates "par X" → namespace = X (pour paralléliser les écritures)
 *   - aggregates conditionnels (notifs non lues) → trigger custom qui consulte
 *     un prédicat avant de relayer l'écriture
 *
 * IMPORTANT : ne pas oublier de brancher chaque aggregate via un trigger
 * dans `lib/triggers.ts`. Sinon les arbres ne sont pas mis à jour.
 *
 * NB : les arbres ne contiennent les données qu'à partir de leur installation.
 * Pour rejouer un historique, écrire un `aggregatesBackfill.ts` au besoin.
 */

import { TableAggregate } from "@convex-dev/aggregate"
import { components } from "./_generated/api"
import type { DataModel, Doc } from "./_generated/dataModel"

// ============================================================
// 1. Globaux
// ============================================================

export const aggCitizensGlobal = new TableAggregate<{
  Key: number
  DataModel: DataModel
  TableName: "citizens"
}>(components.aggCitizensGlobal, {
  sortKey: (d) => d.createdAt,
})

export const aggRequestsGlobal = new TableAggregate<{
  Key: number
  DataModel: DataModel
  TableName: "requests"
}>(components.aggRequestsGlobal, {
  sortKey: (d) => d.depositedAt,
})

export const aggDocumentsGlobal = new TableAggregate<{
  Key: number
  DataModel: DataModel
  TableName: "documents"
}>(components.aggDocumentsGlobal, {
  sortKey: (d) => d.issuedAt,
})

export const aggArchivesGlobal = new TableAggregate<{
  Key: number
  DataModel: DataModel
  TableName: "archives"
}>(components.aggArchivesGlobal, {
  sortKey: (d) => d.versedAt,
  sumValue: (d) => d.sizeBytes ?? 0,
})

// ============================================================
// 2. Par organisme (multi-tenant)
// ============================================================

export const aggRequestsByOrg = new TableAggregate<{
  Namespace: Doc<"requests">["organismId"]
  Key: number
  DataModel: DataModel
  TableName: "requests"
}>(components.aggRequestsByOrg, {
  namespace: (d) => d.organismId,
  sortKey: (d) => d.depositedAt,
})

export const aggDocumentsByOrg = new TableAggregate<{
  Namespace: Doc<"documents">["organismId"]
  Key: number
  DataModel: DataModel
  TableName: "documents"
}>(components.aggDocumentsByOrg, {
  namespace: (d) => d.organismId,
  sortKey: (d) => d.issuedAt,
})

// ============================================================
// 3. (organisme, statut) — encodé comme string concaténée
// ============================================================

const orgStatusNs = (orgId: string, status: string) => `${orgId}:${status}`

export const aggRequestsByOrgStatus = new TableAggregate<{
  Namespace: string
  Key: number
  DataModel: DataModel
  TableName: "requests"
}>(components.aggRequestsByOrgStatus, {
  namespace: (d) => orgStatusNs(d.organismId, d.status),
  sortKey: (d) => d.depositedAt,
})

export const aggArchivesByOrgStatus = new TableAggregate<{
  Namespace: string
  Key: number
  DataModel: DataModel
  TableName: "archives"
}>(components.aggArchivesByOrgStatus, {
  namespace: (d) => orgStatusNs(d.producerOrganismId, d.status),
  sortKey: (d) => d.versedAt,
})

// ============================================================
// 4. (organisme, agent assigné) — pour « N vous sont assignées »
// ============================================================

const orgAgentNs = (orgId: string, agentId: string | undefined) =>
  `${orgId}:${agentId ?? "_unassigned"}`

export const aggRequestsByOrgAgent = new TableAggregate<{
  Namespace: string
  Key: number
  DataModel: DataModel
  TableName: "requests"
}>(components.aggRequestsByOrgAgent, {
  namespace: (d) => orgAgentNs(d.organismId, d.assignedAgentId),
  sortKey: (d) => d.depositedAt,
})

// ============================================================
// 5. Par service / variante — top démarches
// ============================================================

export const aggRequestsByService = new TableAggregate<{
  Namespace: Doc<"requests">["serviceId"]
  Key: number
  DataModel: DataModel
  TableName: "requests"
}>(components.aggRequestsByService, {
  namespace: (d) => d.serviceId,
  sortKey: (d) => d.depositedAt,
})

export const aggRequestsByServiceVariant = new TableAggregate<{
  Namespace: string
  Key: number
  DataModel: DataModel
  TableName: "requests"
}>(components.aggRequestsByServiceVariant, {
  namespace: (d) => d.serviceVariantId ?? "_no_variant",
  sortKey: (d) => d.depositedAt,
})

// ============================================================
// 6. Organismes par statut — page plateforme P2
// ============================================================

export const aggOrgsByStatus = new TableAggregate<{
  Namespace: Doc<"organisms">["status"]
  Key: number
  DataModel: DataModel
  TableName: "organisms"
}>(components.aggOrgsByStatus, {
  namespace: (d) => d.status,
  sortKey: (d) => d._creationTime,
})

// ============================================================
// 7. Notifications non lues par destinataire
// ============================================================
// Conditionnel : on ne compte que les `readAt === undefined`.
// Le trigger custom dans `lib/triggers.ts` gère cette logique.

const notifRecipientNs = (kind: string, id: string) => `${kind}:${id}`

export const aggNotifsUnread = new TableAggregate<{
  Namespace: string
  Key: number
  DataModel: DataModel
  TableName: "notifications"
}>(components.aggNotifsUnread, {
  namespace: (d) => notifRecipientNs(d.recipientKind, d.recipientId),
  sortKey: (d) => d.createdAt,
})

// ============================================================
// Helpers d'accès (clés composées) — exposés aux queries
// ============================================================

export const aggKeys = {
  orgStatus: orgStatusNs,
  orgAgent: orgAgentNs,
  notifRecipient: notifRecipientNs,
}
