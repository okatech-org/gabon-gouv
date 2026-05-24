import { toNextJsHandler } from "better-auth/next-js"
import { auth } from "@/lib/auth"

/**
 * Handler unique better-auth — gère sign-in, callback OAuth, sign-out,
 * get-session, etc. sous /api/auth/*.
 */
export const { GET, POST } = toNextJsHandler(auth)
