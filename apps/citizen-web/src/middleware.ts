import { NextResponse, type NextRequest } from "next/server"

/**
 * Middleware citizen-web — protège uniquement `/mon-espace/*`.
 *
 * Les pages publiques (`/`, `/services/*`, `/administrations`, `/login`)
 * restent accessibles sans auth. better-auth pose ses cookies sous `better-auth.session_token`
 * (et variants secure/csrf) — on regarde la simple présence pour le gate
 * middleware, et le vrai contrôle se fait dans `requireCurrentSession()`
 * côté server component.
 */
// On laisse passer si une session existe sous l'une de ces formes :
//   - better-auth (OIDC identité.ga) : cookies préfixés `better-auth`
//   - NIP fallback (sandbox) : cookie `gc_citizen_nip`
const SESSION_COOKIE_NAMES = ["gc_citizen_nip"]
const SESSION_COOKIE_PREFIXES = ["better-auth"]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg")
  ) {
    return NextResponse.next()
  }

  if (!pathname.startsWith("/mon-espace")) {
    return NextResponse.next()
  }

  const cookies = request.cookies.getAll()
  const hasSession =
    cookies.some((c) => SESSION_COOKIE_NAMES.includes(c.name)) ||
    cookies.some((c) =>
      SESSION_COOKIE_PREFIXES.some((p) => c.name.startsWith(p)),
    )

  if (!hasSession) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("from", pathname)
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
