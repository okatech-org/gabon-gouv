import "server-only"
import { redirect } from "next/navigation"
import { api } from "@workspace/backend/generated"
import { fetchAuthQuery } from "./auth-server"

export interface CitizenSession {
  idnSub: string
  source: "idn"
  email: string | null
  name: string | null
}

/**
 * Récupère la session citoyen courante côté server component, via Better Auth
 * (OIDC identité.ga) exécuté dans Convex. La query `citizenAuth.getMe` renvoie
 * le profil de l'utilisateur authentifié (ou `null` si non connecté).
 *
 * `idnSub` provient du champ `user.userId` Better Auth (= `sub` OIDC).
 */
export async function getCurrentSession(): Promise<CitizenSession | null> {
  const me = await fetchAuthQuery(api.citizenAuth.getMe).catch(() => null)
  if (!me || !me.idnSub) return null
  return {
    idnSub: me.idnSub,
    source: "idn",
    email: me.email ?? null,
    name: me.name ?? null,
  }
}

/**
 * Guard pour les pages /mon-espace/* — redirige vers /login si pas connecté.
 */
export async function requireCurrentSession(): Promise<CitizenSession> {
  const s = await getCurrentSession()
  if (!s) redirect("/login")
  return s
}
