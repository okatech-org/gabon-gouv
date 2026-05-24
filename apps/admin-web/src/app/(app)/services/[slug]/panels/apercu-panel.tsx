"use client"

import { Icon } from "@workspace/ui"

interface Props {
  slug: string
  status: string
  title: string
}

export function ApercuPanel({ slug, status, title }: Props) {
  const citizenAppUrl =
    process.env.NEXT_PUBLIC_CITIZEN_WEB_URL ?? "http://localhost:4000"
  const previewUrl = `${citizenAppUrl}/services/${slug}`

  return (
    <div
      style={{
        padding: "24px 32px",
        maxWidth: 1100,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
        }}
      >
        <div>
          <h2 style={{ fontSize: 18, margin: 0 }}>Aperçu citoyen</h2>
          <p
            style={{
              fontSize: 13,
              color: "var(--ink-600)",
              marginTop: 4,
            }}
          >
            Rendu de la fiche publique telle qu'elle apparaît sur le portail
            citoyen.
          </p>
        </div>
        <a
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--primary-600)",
            border: "1px solid var(--ink-300)",
            borderRadius: 6,
            textDecoration: "none",
            background: "white",
          }}
        >
          <Icon name="externalLink" size={14} aria-hidden="true" />
          Ouvrir dans un nouvel onglet
        </a>
      </div>

      {status === "draft" && (
        <div
          role="status"
          style={{
            padding: 12,
            background: "var(--warning-50)",
            border: "1px solid var(--warning-300)",
            borderRadius: 6,
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "var(--warning-700)",
          }}
        >
          <Icon name="alertTriangle" size={14} aria-hidden="true" />
          Ce service est en brouillon. La fiche citoyen n'est pas publique tant
          qu'il n'est pas publié.
        </div>
      )}

      <div
        style={{
          background: "var(--ink-100)",
          border: "1px solid var(--ink-200)",
          borderRadius: 8,
          padding: 12,
        }}
      >
        <iframe
          src={previewUrl}
          title={`Aperçu citoyen de ${title}`}
          style={{
            width: "100%",
            height: 720,
            border: "1px solid var(--ink-300)",
            borderRadius: 6,
            background: "white",
          }}
        />
      </div>
    </div>
  )
}
