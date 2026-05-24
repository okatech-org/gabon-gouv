"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Icon } from "@workspace/ui"

const TABS = [
  { id: "vue-d-ensemble", label: "Vue d'ensemble", icon: "info" },
  { id: "variantes", label: "Variantes", icon: "layers" },
  { id: "pieces", label: "Pièces requises", icon: "paperclip" },
  { id: "templates", label: "Templates documents", icon: "fileText" },
  { id: "apercu", label: "Aperçu citoyen", icon: "eye" },
  { id: "stats", label: "Statistiques", icon: "barChart" },
  { id: "signature", label: "Circuit de signature", icon: "shieldCheck" },
  { id: "archivage", label: "Archivage SAE", icon: "archive" },
] as const

export function ServiceTabsNav({ slug }: { slug: string }) {
  const pathname = usePathname()
  // L'URL ressemble à /services/<slug>/<tab>. On extrait <tab>.
  const segments = pathname.split("/").filter(Boolean) // ["services", slug, ?tab]
  const activeTab = segments[2] ?? "vue-d-ensemble"

  return (
    <nav
      aria-label="Sections de configuration du service"
      style={{
        marginTop: 16,
        padding: "0 32px",
        borderBottom: "1px solid var(--ink-200)",
        overflowX: "auto",
      }}
    >
      <ul
        style={{
          display: "flex",
          gap: 4,
          margin: 0,
          padding: 0,
          listStyle: "none",
        }}
      >
        {TABS.map((tab) => {
          const active = tab.id === activeTab
          return (
            <li key={tab.id}>
              <Link
                href={`/services/${slug}/${tab.id}`}
                aria-current={active ? "page" : undefined}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "12px 14px",
                  fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  color: active
                    ? "var(--primary-600)"
                    : "var(--ink-700)",
                  textDecoration: "none",
                  borderBottom: active
                    ? "2px solid var(--primary-500)"
                    : "2px solid transparent",
                  whiteSpace: "nowrap",
                  marginBottom: -1,
                }}
              >
                <Icon name={tab.icon} size={14} aria-hidden="true" />
                {tab.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
