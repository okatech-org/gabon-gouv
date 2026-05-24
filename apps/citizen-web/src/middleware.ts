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

  const hasSession = request.cookies
    .getAll()
    .some((c) => SESSION_COOKIE_PREFIXES.some((p) => c.name.startsWith(p)))

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
