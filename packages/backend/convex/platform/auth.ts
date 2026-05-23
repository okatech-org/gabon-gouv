import type { MutationCtx, QueryCtx } from "../_generated/server"
import { requireAgent } from "../auth"
import { actorFromAgent, assertCan, type Actor } from "../lib/permissions"

/**
 * Guard d'entrée pour toutes les queries/mutations du domaine `platform/`.
 * Chaîne `requireAgent` (auth) + `assertCan("platform.read_supervision")`.
 * Vit ici plutôt que dans `lib/permissions.ts` pour éviter une dépendance
 * circulaire avec `auth.ts` (qui importe permissions).
 */
export async function requirePlatformAdmin(
  ctx: QueryCtx | MutationCtx,
  token: string | undefined,
): Promise<{ agent: Awaited<ReturnType<typeof requireAgent>>; actor: Actor }> {
  const agent = await requireAgent(ctx, token)
  const actor = actorFromAgent(agent)
  assertCan(actor, "platform.read_supervision")
  return { agent, actor }
}
