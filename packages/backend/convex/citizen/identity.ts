import { query } from "../_generated/server"
import { requireCitizen } from "./auth"

/**
 * Page « Identité numérique » — read-only.
 * Affiche le statut de vérification IDN, le LoA estimé, la date de
 * dernière vérification, et le `sub` IDN courant (= identifiant
 * d'authentification fédérée).
 */
export const getMyIdentity = query({
  args: {},
  handler: async (ctx) => {
    const { citizen } = await requireCitizen(ctx)
    const isDemoNip = citizen.idnSub?.startsWith("nip:") ?? false
    const isSandboxSeed = citizen.idnSub?.startsWith("idn-sandbox-") ?? false

    let source: "idn" | "nip_demo" | "sandbox_seed"
    if (isDemoNip) source = "nip_demo"
    else if (isSandboxSeed) source = "sandbox_seed"
    else source = "idn"

    return {
      idnSub: citizen.idnSub ?? null,
      verified: citizen.identityVerified,
      verifiedAt: citizen.identityVerifiedAt
        ? formatDateLong(citizen.identityVerifiedAt)
        : null,
      verifiedAtMs: citizen.identityVerifiedAt ?? null,
      source,
      // LoA estimé : on n'a pas le claim ACR persisté pour l'instant.
      // À enrichir dès que better-auth posera `idnLoA` sur la session.
      estimatedLoa: citizen.identityVerified ? 2 : 1,
      portalUrl: "https://identite.ga",
    }
  },
})

function formatDateLong(ms: number): string {
  return new Date(ms).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}
