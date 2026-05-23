import type { Metadata } from "next"
import type { ReactNode } from "react"
import "./globals.css"

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
