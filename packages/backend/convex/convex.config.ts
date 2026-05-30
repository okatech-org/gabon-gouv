import { defineApp } from "convex/server"
import aggregate from "@convex-dev/aggregate/convex.config"
import betterAuth from "@convex-dev/better-auth/convex.config"

/**
 * Composants Convex utilisés par le backend (ADR-0007).
 *
 * Chaque `app.use(aggregate, { name: ... })` instancie un B-tree
 * indépendant pour count / sum / max / range en O(log n).
 *
 * Les définitions de TableAggregate vivent dans `convex/aggregates.ts`.
 * Les triggers qui maintiennent les arbres sont enregistrés dans
 * `convex/lib/triggers.ts` (mutation wrapper).
 */

const app = defineApp()

// Auth citoyen — Better Auth (OIDC identité.ga) persisté dans Convex.
// Tables user/session/account/verification/jwks vivent dans ce composant.
app.use(betterAuth)

// Globaux (pas de namespace) — un seul arbre
app.use(aggregate, { name: "aggCitizensGlobal" })
app.use(aggregate, { name: "aggRequestsGlobal" })
app.use(aggregate, { name: "aggDocumentsGlobal" })
app.use(aggregate, { name: "aggArchivesGlobal" })

// Namespacés par organisme (multi-tenant)
app.use(aggregate, { name: "aggRequestsByOrg" })
app.use(aggregate, { name: "aggDocumentsByOrg" })

// Compteurs (organisme, statut) — pour les KPIs de file d'attente
app.use(aggregate, { name: "aggRequestsByOrgStatus" })
app.use(aggregate, { name: "aggArchivesByOrgStatus" })

// Compteur (organisme, agent assigné) — pour « 12 vous sont assignées »
app.use(aggregate, { name: "aggRequestsByOrgAgent" })

// Compteur par service (et variante) — top démarches, breakdown
app.use(aggregate, { name: "aggRequestsByService" })
app.use(aggregate, { name: "aggRequestsByServiceVariant" })

// Organismes par statut — vue plateforme « 47 actives, 3 onboarding »
app.use(aggregate, { name: "aggOrgsByStatus" })

// Notifications non lues par destinataire — badge unread
app.use(aggregate, { name: "aggNotifsUnread" })

export default app
