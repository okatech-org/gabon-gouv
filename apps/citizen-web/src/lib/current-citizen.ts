import "server-only"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "./auth"
import { getNipSessionSub } from "./nip-session"

export interface CitizenSession {
  idnSub: string
  source: "idn" | "nip" // tracking pour le footer / les logs
  email: string | null
  name: string | null
}

/**
 * Récupère la session courante côté server component. Deux sources possibles :
 *   1. Better-auth (OIDC identité.ga) — voie principale.
 *   2. Cookie NIP fallback (`gc_citizen_nip`) — voie de secours sandbox.
 *
 * Renvoie `null` si aucune des deux ne matche.
 */
export async function getCurrentSession(): Promise<CitizenSession | null> {
  // 1. Better-auth (IDN)
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null)
  if (session?.user) {
    return {
      idnSub: session.user.id,
      source: "idn",
      email: session.user.email ?? null,
      name: session.user.name ?? null,
    }
  }

  // 2. Fallback NIP
  const nipSub = await getNipSessionSub()
  if (nipSub) {
    return {
      idnSub: nipSub,
      source: "nip",
      email: null,
      name: null,
    }
  }

  return null
}

/**
 * Guard pour les pages /mon-espace/* — redirige vers /login si pas connecté.
 */
export async function requireCurrentSession(): Promise<CitizenSession> {
  const s = await getCurrentSession()
  if (!s) redirect("/login")
  return s
}
