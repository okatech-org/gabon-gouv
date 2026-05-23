import "server-only"
import { api } from "@workspace/backend/generated"
import { convex } from "./convex"
import { getSessionToken } from "./session"

export interface CurrentAgent {
  _id: string
  name: string
  email: string
  nip: string
  role: string
  organism: { _id: string; name: string; shortName?: string; category: string } | null
}

/**
 * Récupère l'agent connecté côté server component. Renvoie `null` si la
 * session est invalide / absente — la page peut alors rediriger vers /login.
 */
export async function getCurrentAgent(): Promise<{ token: string; agent: CurrentAgent } | null> {
  const token = await getSessionToken()
  if (!token) return null
  try {
    const agent = (await convex.query(api.auth.currentAgent, { token })) as
      | CurrentAgent
      | null
    if (!agent) return null
    return { token, agent }
  } catch (error) {
    console.error("[admin-web] currentAgent error", error)
    return null
  }
}
