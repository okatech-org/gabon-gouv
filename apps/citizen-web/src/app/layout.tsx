import type { Metadata } from "next"
import type { ReactNode } from "react"
import "./globals.css"

export const metadata: Metadata = {
  title: "Gabon Connect — Guichet unique administratif",
  description:
    "Toutes vos démarches administratives gabonaises en un seul endroit. Service public, dématérialisé, sécurisé.",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
