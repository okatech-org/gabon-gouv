import "server-only"
import { redirect } from "next/navigation"
import { api } from "@workspace/backend/generated"
import { convex } from "./convex"
import { getSessionToken } from "./session"

export interface CurrentPlatformUser {
  _id: string
  name: string
  email: string
  nip: string
  role: string
  organism: { _id: string; name: string; shortName?: string; category: string } | null
}

/**
 * Récupère l'agent connecté + valide qu'il est `platform_admin`. Sinon
 * redirige vers /login (les non-admins n'ont pas leur place dans la
 * console plateforme). À utiliser depuis le shell layout et toute page.
 */
export async function requirePlatformUser(): Promise<{
  token: string
  user: CurrentPlatformUser
}> {
  const token = await getSessionToken()
  if (!token) redirect("/login")

  let user: CurrentPlatformUser | null
  try {
    user = (await convex.query(api.auth.currentAgent, { token })) as
      | CurrentPlatformUser
      | null
  } catch (error) {
    console.error("[platform-web] currentAgent error", error)
    redirect("/login")
  }

  if (!user) redirect("/login")
  if (user.role !== "platform_admin") {
    // Agent non-plateforme : on coupe la session côté cookie pour éviter
    // une boucle de redirection, puis on renvoie vers /login.
    redirect("/login?reason=not-platform-admin")
  }
  return { token, user }
}
