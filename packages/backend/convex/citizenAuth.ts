import {
  createClient,
  type AuthFunctions,
  type GenericCtx,
} from "@convex-dev/better-auth"
import { convex } from "@convex-dev/better-auth/plugins"
import { betterAuth } from "better-auth"
import { genericOAuth, type GenericOAuthConfig } from "better-auth/plugins"
import { idn } from "@idn-ga/better-auth"
import { components, internal } from "./_generated/api"
import type { DataModel } from "./_generated/dataModel"
import { query } from "./_generated/server"
import authConfig from "./auth.config"

/**
 * Auth citoyen — Better Auth (OIDC identité.ga) exécuté DANS Convex via le
 * composant `@convex-dev/better-auth`. Remplace l'ancien montage (better-auth
 * dans Next.js + pont JWT maison). Les tables user/session/account/verification
 * sont persistées dans le composant → l'état OIDC (PKCE `state`/`code_verifier`)
 * survit aux multi-instances Cloud Run, ce qui réparait le `state_mismatch`
 * silencieux au callback.
 *
 * Mapping identité : Better Auth crée un `user` (id aléatoire) + un `account`
 * (`providerId:"idn"`, `accountId` = `sub` OIDC = idnSub). Le trigger
 * `account.onCreate` recopie cet idnSub dans le champ natif `user.userId`, que
 * `requireCitizen` lit ensuite pour retrouver le citoyen via `by_idn_sub`.
 */

// URL publique de l'app citizen-web (posée en variable d'env Convex).
const siteUrl = process.env.SITE_URL ?? "https://localhost:4000"

const authFunctions: AuthFunctions = internal.citizenAuth

export const authComponent = createClient<DataModel>(components.betterAuth, {
  authFunctions,
  triggers: {
    account: {
      onCreate: async (ctx, account) => {
        if (account.providerId === "idn") {
          await authComponent.setUserId(
            ctx,
            account.userId,
            account.accountId,
          )
        }
      },
    },
  },
})

export const { onCreate, onUpdate, onDelete } = authComponent.triggersApi()

export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth({
    baseURL: siteUrl,
    trustedOrigins: [siteUrl],
    database: authComponent.adapter(ctx),
    plugins: [
      // Plugin Convex requis pour la compatibilité (émission JWT + JWKS).
      // On expose l'idnSub (stocké dans `user.userId`) comme claim du JWT
      // Convex, pour que `requireCitizen` le lise via `getUserIdentity()`
      // sans avoir à requêter le composant.
      convex({
        authConfig,
        jwt: {
          definePayload: ({ user }) =>
            user.userId ? { idnSub: user.userId as string } : {},
        },
      }),
      // OIDC Identité Numérique Gabonaise — niveau LoA 2 (eidas2) minimum.
      genericOAuth({
        config: [
          idn({
            clientId: process.env.IDN_CLIENT_ID ?? "missing-IDN_CLIENT_ID",
            clientSecret:
              process.env.IDN_CLIENT_SECRET ?? "missing-IDN_CLIENT_SECRET",
            acrValues: ["eidas2"],
            scopes: ["openid", "profile", "email"],
            ...(process.env.IDN_ISSUER
              ? { issuer: process.env.IDN_ISSUER }
              : {}),
            ...(process.env.IDN_DISCOVERY_URL
              ? { discoveryUrl: process.env.IDN_DISCOVERY_URL }
              : {}),
          }) as unknown as GenericOAuthConfig,
        ],
      }),
    ],
  })

/**
 * Profil citoyen courant (utilisateur Better Auth), consommé par les server
 * components citizen-web via `fetchAuthQuery`. `userId` porte l'idnSub.
 * Renvoie `null` si la requête n'est pas authentifiée.
 */
export const getMe = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx)
    if (!user) return null
    return {
      idnSub: user.userId ?? null,
      email: user.email ?? null,
      name: user.name ?? null,
    }
  },
})
