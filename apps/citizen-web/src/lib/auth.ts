import "server-only"
import { betterAuth } from "better-auth"
import { genericOAuth } from "better-auth/plugins"
import { idn } from "@idn-ga/better-auth"

/**
 * Configuration better-auth + plugin Identité Numérique Gabonaise.
 *
 * Variables d'env nécessaires (cf. README citizen-web) :
 *   - BETTER_AUTH_SECRET : secret signature sessions (32 chars+)
 *   - BETTER_AUTH_URL    : URL publique de l'app (ex http://localhost:4000)
 *   - IDN_CLIENT_ID      : client_id émis par identité.ga (sandbox / prod)
 *   - IDN_CLIENT_SECRET  : client_secret correspondant
 *
 * Niveau LoA 2 minimum (eidas2) — couvre les démarches sensibles type
 * démarches consulaires et e-commerce sensible. Pour les démarches régaliennes
 * (impôts, état civil), monter à eidas3.
 */
// Cast indispensable : `idn()` typé Record<string,unknown> côté plugin,
// alors que `genericOAuth` attend une union typée. Le runtime est correct,
// c'est juste pour passer le check TS.
import type { GenericOAuthConfig } from "better-auth/plugins"

export const auth = betterAuth({
  secret:
    process.env.BETTER_AUTH_SECRET ??
    "dev-only-secret-replace-in-prod-32-chars-minimum-xx",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:4000",
  plugins: [
    genericOAuth({
      config: [
        idn({
          clientId: process.env.IDN_CLIENT_ID ?? "missing-IDN_CLIENT_ID",
          clientSecret:
            process.env.IDN_CLIENT_SECRET ?? "missing-IDN_CLIENT_SECRET",
          acrValues: ["eidas2"],
          scopes: ["openid", "profile", "email"],
        }) as unknown as GenericOAuthConfig,
      ],
    }),
  ],
})

export type Auth = typeof auth
