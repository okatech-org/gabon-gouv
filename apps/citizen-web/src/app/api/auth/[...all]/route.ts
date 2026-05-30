import { handler } from "@/lib/auth-server"

/**
 * Proxy Better Auth — relaie `/api/auth/*` vers le domaine HTTP Convex où
 * tourne le composant `@convex-dev/better-auth` (sign-in, callback OAuth,
 * sign-out, JWKS, token Convex…). Le `redirect_uri` OIDC reste donc sur le
 * domaine de l'app (`{BETTER_AUTH_URL}/api/auth/oauth2/callback/idn`).
 */
export const { GET, POST } = handler
