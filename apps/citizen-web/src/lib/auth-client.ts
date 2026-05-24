"use client"
import { createAuthClient } from "better-auth/react"
import { genericOAuthClient } from "better-auth/client/plugins"

/**
 * Client better-auth React (hooks + signIn helpers) — utilisé par les
 * boutons OIDC dans les pages client.
 */
export const authClient = createAuthClient({
  baseURL:
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "http://localhost:4000",
  plugins: [genericOAuthClient()],
})

export const { useSession, signOut } = authClient
