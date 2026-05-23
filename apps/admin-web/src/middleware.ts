import { NextResponse, type NextRequest } from "next/server"

const SESSION_COOKIE = "gc_admin_session"

const PUBLIC_PATHS = ["/login"]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Laisser passer les ressources statiques et l'API (déjà filtrées par config.matcher, ceinture/bretelles).
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

  const hasSession = request.cookies.has(SESSION_COOKIE)

  if (!hasSession && !PUBLIC_PATHS.includes(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("from", pathname)
    return NextResponse.redirect(url)
  }

  if (hasSession && pathname === "/login") {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    url.searchParams.delete("from")
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  // Tout sauf assets statiques explicites
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
