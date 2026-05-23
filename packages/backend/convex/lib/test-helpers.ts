/**
 * Helpers réutilisables pour les tests convex-test.
 *
 * Le composant @convex-dev/aggregate doit être enregistré explicitement
 * sur chaque instance de test (un appel par instance d'arbre dans
 * convex.config.ts).
 */
import { register as registerAggregate } from "@convex-dev/aggregate/test"
import type { TestConvex } from "convex-test"
import type { GenericSchema, SchemaDefinition } from "convex/server"

const AGGREGATE_NAMES = [
  "aggCitizensGlobal",
  "aggRequestsGlobal",
  "aggDocumentsGlobal",
  "aggArchivesGlobal",
  "aggRequestsByOrg",
  "aggDocumentsByOrg",
  "aggRequestsByOrgStatus",
  "aggArchivesByOrgStatus",
  "aggRequestsByOrgAgent",
  "aggRequestsByService",
  "aggRequestsByServiceVariant",
  "aggOrgsByStatus",
  "aggNotifsUnread",
] as const

/**
 * Enregistre tous les composants d'agrégat sur une instance convex-test.
 * À appeler immédiatement après `convexTest(schema, modules)`.
 */
export function registerAggregates(
  t: TestConvex<SchemaDefinition<GenericSchema, boolean>>,
): void {
  for (const name of AGGREGATE_NAMES) {
    registerAggregate(t, name)
  }
}
