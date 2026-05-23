import type { Metadata } from "next"
import type { ReactNode } from "react"
import "./globals.css"

export const metadata: Metadata = {
  title: "Gabon Connect — Console Plateforme",
  description:
    "Console super-admin Digitalium : supervision multi-organismes, onboarding, statistiques d'usage de Gabon Connect.",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
