import type { Metadata } from "next"
import type { ReactNode } from "react"
import "./globals.css"

// Toutes les pages sont rendues à la requête (SSR fetch-on-render vers Convex),
// jamais prérendues au build — cf. CLAUDE.md « rendu serveur, pas réactif ».
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Gabon Connect — Administrations",
  description:
    "Console back-office des administrations gabonaises : file d'instruction, génération d'actes, correspondance et archives à valeur probante.",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
