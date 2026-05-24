import "server-only"
import { cookies } from "next/headers"

/**
 * Cookie de fallback NIP — voie de secours quand le flow OIDC identité.ga
 * n'est pas exploitable (sandbox limité, prod pas encore live, etc.).
 *
 * Stocke l'`idnSub` du citoyen directement (httpOnly), pour que les queries
 * Convex continuent à lookup par `by_idn_sub` sans modifs.
 */
export const NIP_COOKIE = "gc_citizen_nip"

export async function getNipSessionSub(): Promise<string | null> {
  const store = await cookies()
  return store.get(NIP_COOKIE)?.value ?? null
}

export async function setNipSession(idnSub: string, expiresAt: number) {
  const store = await cookies()
  store.set(NIP_COOKIE, idnSub, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" || true, // dev en HTTPS aussi
    path: "/",
    expires: new Date(expiresAt),
  })
}

export async function clearNipSession() {
  const store = await cookies()
  store.delete(NIP_COOKIE)
}
