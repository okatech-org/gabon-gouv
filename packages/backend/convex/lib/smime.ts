/**
 * Signature S/MIME des messages de correspondance — stub v1.
 *
 * **Statut** : implémentation factice qui satisfait l'interface attendue par
 * la couche métier sans nécessiter d'infrastructure PKI.
 *
 * **Pourquoi un stub** : un vrai S/MIME nécessite :
 *   1. Une autorité de certification (CA racine + intermédiaires)
 *   2. Génération + distribution de certificats par organisme et/ou agent
 *   3. Mécanisme de révocation (CRL, OCSP)
 *   4. Renouvellement périodique
 *   5. Vérification de la chaîne de confiance à chaque réception
 *
 * Tout ça représente un projet à part entière (3-6 mois minimum) qui sera
 * fait conjointement avec l'identité numérique nationale gabonaise (IDN).
 *
 * **Stub actuel** : signature = SHA-256(body + agentId + sentAt + secret) où
 * `secret` est une variable d'environnement Convex (`SMIME_STUB_SECRET`).
 * Permet à l'UI d'afficher le badge "Signé S/MIME" et de vérifier l'intégrité
 * basique du message. Quand la vraie PKI sera là, on remplace le contenu de
 * `signMessage` et `verifySignature` ; l'API reste identique.
 *
 * **Algorithm string** : `"stub-sha256-v1"` — permet de distinguer les
 * signatures stub des signatures réelles futures (qui seront ex. `"rsa-sha256"`,
 * `"ecdsa-p256-sha256"`).
 */

import type { Id } from "../_generated/dataModel"

export const SMIME_STUB_ALGORITHM = "stub-sha256-v1"

export interface SignedMessage {
  signatureFingerprint: string
  signatureAlgorithm: string
  signedAt: number
}

export interface SignMessageArgs {
  body: string
  agentId: Id<"agents">
  sentAt: number
}

/**
 * Signe un message — version stub.
 *
 * Utilise la Web Crypto API (`crypto.subtle.digest`) disponible dans le
 * runtime V8 de Convex (et les actions Node). Asynchrone par nature.
 * Passer à un vrai S/MIME se fera en remplaçant le contenu sans changer
 * l'API publique.
 */
export async function signMessage(
  args: SignMessageArgs,
): Promise<SignedMessage> {
  const secret = getStubSecret()
  const payload = `${args.body}::${args.agentId}::${args.sentAt}::${secret}`
  const fingerprint = await sha256Hex(payload)
  return {
    signatureFingerprint: fingerprint,
    signatureAlgorithm: SMIME_STUB_ALGORITHM,
    signedAt: args.sentAt,
  }
}

/**
 * Vérifie une signature stub. Retourne `true` si la fingerprint matche
 * exactement le hash recalculé sur les mêmes inputs.
 *
 * Pour le vrai S/MIME : vérification de la chaîne de confiance jusqu'à la
 * CA racine + non-révocation du certificat.
 */
export async function verifySignature(args: {
  body: string
  agentId: Id<"agents">
  sentAt: number
  fingerprint: string
}): Promise<boolean> {
  if (!args.fingerprint || args.fingerprint.length !== 64) return false
  const expected = await signMessage({
    body: args.body,
    agentId: args.agentId,
    sentAt: args.sentAt,
  })
  return constantTimeEqual(expected.signatureFingerprint, args.fingerprint)
}

/** SHA-256 via Web Crypto API → hex string lower-case 64 chars. */
async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest("SHA-256", bytes)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

/* ============================================================
   Helpers internes
   ============================================================ */

function getStubSecret(): string {
  // En production Convex : SMIME_STUB_SECRET dans les env vars du déploiement.
  // Hors prod : fallback déterministe pour permettre les tests sans config.
  if (typeof process !== "undefined" && process.env?.SMIME_STUB_SECRET) {
    return process.env.SMIME_STUB_SECRET
  }
  return "stub-secret-dev-only-DO-NOT-USE-IN-PROD"
}

/**
 * Comparaison à temps constant pour éviter les attaques par timing
 * (même si le stub n'a pas de valeur de sécurité, on adopte le pattern
 * dès maintenant pour que le code soit transposable au vrai S/MIME).
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}
