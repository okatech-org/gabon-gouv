import { getAuthConfigProvider } from "@convex-dev/better-auth/auth-config"
import type { AuthConfig } from "convex/server"

/**
 * Configuration d'authentification JWT de Convex (auth citoyen).
 *
 * Sans ce fichier, `ctx.auth.getUserIdentity()` renvoie toujours `null`.
 *
 * Depuis la migration vers Better Auth dans Convex (`convex/citizenAuth.ts`),
 * c'est le composant `@convex-dev/better-auth` qui émet les JWT citoyen et
 * publie son JWKS sur le domaine HTTP de Convex (`*.convex.site`).
 * `getAuthConfigProvider()` dérive automatiquement :
 *   - `issuer`        = `process.env.CONVEX_SITE_URL` (posé par Convex)
 *   - `applicationID` = "convex" (claim `aud`)
 *   - `jwks`          = `{CONVEX_SITE_URL}/api/auth/convex/jwks`
 *
 * Note : l'auth des agents (admin/platform) n'utilise PAS `getUserIdentity()`
 * (bearer-token maison via `convex/auth.ts` → `requireAgent`), elle n'est donc
 * pas affectée par ce provider.
 */
export default {
  providers: [getAuthConfigProvider()],
} satisfies AuthConfig
