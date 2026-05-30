import "server-only"
import { ConvexHttpClient } from "convex/browser"
import { getToken } from "./auth-server"
import type { CitizenSession } from "./current-citizen"

const url = process.env.NEXT_PUBLIC_CONVEX_URL

if (!url) {
  console.warn(
    "[citizen-web] NEXT_PUBLIC_CONVEX_URL est manquant. Lance `bunx convex dev` " +
      "depuis packages/backend pour obtenir l'URL, puis copie-la dans .env.local.",
  )
}

/**
 * Client Convex anonyme — pour les pages publiques (catalogue, vérification…)
 * qui n'appellent que des fonctions sans `requireCitizen`.
 */
export const convex = new ConvexHttpClient(url ?? "https://invalid.local")

/**
 * Client Convex authentifié pour le citoyen courant : attache le JWT Convex
 * émis par Better Auth (composant `@convex-dev/better-auth`). Les fonctions
 * backend dérivent l'identité côté serveur — aucun identifiant n'est passé en
 * argument (cf. CLAUDE.md règle 2). Le paramètre `session` est conservé pour la
 * compatibilité des appelants mais n'est plus utilisé pour l'autorisation.
 */
export async function getCitizenConvex(
  _session?: CitizenSession,
): Promise<ConvexHttpClient> {
  const client = new ConvexHttpClient(url ?? "https://invalid.local")
  const token = await getToken()
  if (token) client.setAuth(token)
  return client
}
