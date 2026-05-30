"use client"
import { createAuthClient } from "better-auth/react"
import { genericOAuthClient } from "better-auth/client/plugins"
import { convexClient } from "@convex-dev/better-auth/client/plugins"

/**
 * Client Better Auth React — utilisé par les boutons OIDC (signIn.oauth2) et
 * le sign-out. `baseURL` pointe vers le proxy Next `/api/auth` (même domaine),
 * lui-même relayé vers Convex par `handler` (cf. `lib/auth-server.ts`).
 */
export const authClient = createAuthClient({
  baseURL:
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "https://localhost:4000",
  plugins: [convexClient(), genericOAuthClient()],
})

export const { useSession, signOut, signIn } = authClient
