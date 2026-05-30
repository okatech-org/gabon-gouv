import "server-only"
import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs"

/**
 * Utilitaires serveur Better Auth ↔ Convex pour l'espace citoyen.
 *
 * L'auth tourne désormais DANS Convex (composant `@convex-dev/better-auth`).
 * Ces helpers permettent au front Next.js (SSR, server components) de :
 *   - `handler`          : proxifier `/api/auth/*` vers le domaine HTTP Convex
 *   - `getToken`         : récupérer le JWT Convex de la session courante (à
 *                          poser sur le `ConvexHttpClient` via `setAuth`)
 *   - `fetchAuthQuery`   : exécuter une query Convex authentifiée côté serveur
 *
 * `convexSiteUrl` = domaine HTTP de Convex (`*.convex.site`), distinct de
 * `convexUrl` (`*.convex.cloud`). Si `NEXT_PUBLIC_CONVEX_SITE_URL` n'est pas
 * définie, on la dérive automatiquement de `NEXT_PUBLIC_CONVEX_URL` (mapping
 * standard `.convex.cloud` → `.convex.site`), pour éviter d'imposer une
 * variable d'env supplémentaire au build/déploiement.
 */
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? ""
const convexSiteUrl =
  process.env.NEXT_PUBLIC_CONVEX_SITE_URL ||
  convexUrl.replace(/\.convex\.cloud(\/?$)/, ".convex.site$1")

export const {
  handler,
  getToken,
  isAuthenticated,
  fetchAuthQuery,
  fetchAuthMutation,
  fetchAuthAction,
} = convexBetterAuthNextJs({
  convexUrl,
  convexSiteUrl,
})
