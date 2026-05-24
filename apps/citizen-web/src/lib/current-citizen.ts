import "server-only"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "./auth"

export interface CitizenSession {
  idnSub: string
  email: string | null
  name: string | null
}

/**
 * Récupère la session better-auth côté server component. Renvoie `null` si
 * pas connecté — la page peut alors afficher la version anonyme (vitrine).
 */
export async function getCurrentSession(): Promise<CitizenSession | null> {
  const session = await auth.api
    .getSession({ headers: await headers() })
    .catch(() => null)
  if (!session || !session.user) return null
  // `sub` IDN est posé sur l'account OAuth ; better-auth duplique l'id dans
  // session.user.id, mais on récupère le sub d'origine via accountId si
  // disponible. Fallback : user.id.
  const idnSub = session.user.id
  return {
    idnSub,
    email: session.user.email ?? null,
    name: session.user.name ?? null,
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
