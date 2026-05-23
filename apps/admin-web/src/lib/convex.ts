import "server-only"
import { ConvexHttpClient } from "convex/browser"

const url = process.env.NEXT_PUBLIC_CONVEX_URL

if (!url) {
  // En dev, message clair plutôt qu'un crash obscur sur fetchQuery.
  console.warn(
    "[admin-web] NEXT_PUBLIC_CONVEX_URL est manquant. Lance `bunx convex dev` " +
      "depuis packages/backend pour obtenir l'URL, puis copie-la dans .env.local.",
  )
}

export const convex = new ConvexHttpClient(url ?? "https://invalid.local")
