/**
 * Endpoints HTTP publics du backend (Bloc 4).
 *
 * Pour l'instant, un seul endpoint : `/verify/:code` qui vérifie un acte
 * délivré sans authentification (consommé par les QR codes des PDF + outils
 * externes : OCR de QR, scripts de partenaires, etc.).
 *
 * La page Next.js `/verifier/[code]` côté citizen-web n'utilise PAS cet
 * endpoint mais appelle directement la mutation `public.verify.verifyByCode`
 * via le client Convex (économise un hop).
 */

import { httpRouter } from "convex/server"
import { httpAction } from "./_generated/server"
import { api } from "./_generated/api"
import { authComponent, createAuth } from "./citizenAuth"

const http = httpRouter()

// Routes Better Auth (auth citoyen OIDC) — sign-in, callback OAuth, JWKS,
// token Convex, etc. exposées sous `/api/auth/*` du domaine HTTP Convex.
authComponent.registerRoutes(http, createAuth)

/**
 * GET /verify/:code
 *
 * Réponse JSON : `{ outcome: "valid"|"revoked"|"unknown", document?: {...} }`.
 *
 * Hash l'IP du verifieur (X-Forwarded-For en priorité, sinon remoteAddr)
 * via SHA-256 pour audit anti-brute-force sans stockage de PII brute.
 */
http.route({
  pathPrefix: "/verify/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url)
    // path = /verify/CODE → on récupère le segment après /verify/
    const code = url.pathname.replace(/^\/verify\//, "")
    if (!code) {
      return new Response(
        JSON.stringify({ outcome: "unknown", error: "Code manquant." }),
        { status: 400, headers: corsHeaders("application/json") },
      )
    }

    const ipRaw =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null
    const verifierIpHash = ipRaw ? await sha256Hex(ipRaw) : undefined
    const userAgent = request.headers.get("user-agent") ?? undefined

    const result = await ctx.runMutation(api.public.verify.verifyByCode, {
      code,
      verifierIpHash,
      userAgent,
    })

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: corsHeaders("application/json"),
    })
  }),
})

/** Pré-vol CORS pour permettre les appels cross-origin (ex. extension). */
http.route({
  pathPrefix: "/verify/",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    })
  }),
})

export default http

/* ============================================================
   Helpers
   ============================================================ */

function corsHeaders(contentType?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  }
  if (contentType) headers["Content-Type"] = contentType
  return headers
}

/** SHA-256 hex via Web Crypto (disponible dans le runtime V8 Convex). */
async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest("SHA-256", bytes)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}
