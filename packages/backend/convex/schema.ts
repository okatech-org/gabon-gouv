import { defineSchema } from "convex/server"
import { archivesTables } from "./schema/archives"
import { assistantTables } from "./schema/assistant"
import { auditTables } from "./schema/audit"
import { authTables } from "./schema/auth"
import { citizensTables } from "./schema/citizens"
import { correspondenceTables } from "./schema/correspondence"
import { documentsTables } from "./schema/documents"
import { notificationsTables } from "./schema/notifications"
import { organismsTables } from "./schema/organisms"
import { requestsTables } from "./schema/requests"
import { servicesTables } from "./schema/services"

/**
 * Schema Gabon Connect — agrégateur (ADR-0004).
 *
 * Les définitions de tables vivent dans `convex/schema/<domaine>.ts`.
 * Les énumérations utilisées par les validators sont dans `convex/lib/enums.ts` (ADR-0003).
 *
 * Domaines :
 *   - organisms : organismes, agents, onboarding, conventions, provinces
 *   - citizens : citoyens, relations, items sauvegardés, recommandations
 *   - services : catalogue, variantes, pièces requises, templates de docs
 *   - requests : brouillons, demandes, pièces, vérifs, événements, messages
 *   - documents : actes émis, vérifications publiques, registre civil
 *   - correspondence : courriers inter-admin + circuits de signature polymorphes
 *   - archives : SAE NF Z42-013 + bordereaux d'élimination
 *   - notifications : table unifiée (citoyens / agents / plateforme)
 *   - audit : journal scellé + feed d'activité UI + santé infra
 *   - auth : sessions + habilitations dossiers
 *   - assistant : conversations IA contextuelles
 */
export default defineSchema({
  ...organismsTables,
  ...citizensTables,
  ...servicesTables,
  ...requestsTables,
  ...documentsTables,
  ...correspondenceTables,
  ...archivesTables,
  ...notificationsTables,
  ...auditTables,
  ...authTables,
  ...assistantTables,
})
