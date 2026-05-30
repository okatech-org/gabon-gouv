import "server-only"
import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs"

/**
 * Utilitaires serveur Better Auth ↔ Convex pour l'espace citoyen.
 *
 * L'auth tourne désormais DANS Convex (composant `@convex-dev/better-auth`).
 * Ces helpers permettent au front Next.js (SSR, server components) de :
 *   - `handler`  : proxifier `/api/auth/*` vers le domaine HTTP Convex
 *   - `getToken` : récupérer le JWT Convex de la session courante (à poser sur
 *                  le `ConvexHttpClient` via `setAuth`)
 *   - `fetchAuthQuery` : exécuter une query Convex authentifiée côté serveur
 *
 * `NEXT_PUBLIC_CONVEX_SITE_URL` = domaine HTTP de Convex (`*.convex.site`),
 * distinct de `NEXT_PUBLIC_CONVEX_URL` (`*.convex.cloud`).
 */
export const {
  handler,
  getToken,
  isAuthenticated,
  fetchAuthQuery,
  fetchAuthMutation,
  fetchAuthAction,
} = convexBetterAuthNextJs({
  convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL!,
  convexSiteUrl: process.env.NEXT_PUBLIC_CONVEX_SITE_URL!,
})
