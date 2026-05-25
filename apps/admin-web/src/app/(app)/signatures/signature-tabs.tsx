"use client"

/**
 * Tabs URL-driven pour /signatures. Switch entre "À approuver" et
 * "Mes décisions récentes". Source de vérité : ?scope dans l'URL.
 */

import Link from "next/link"
import { Badge } from "@workspace/ui"

interface Props {
  currentScope: "pending" | "recent"
  pendingCount: number
}

export function SignatureTabs({ currentScope, pendingCount }: Props) {
  return (
    <nav
      aria-label="Filtre des signatures"
      style={{
        borderBottom: "1px solid var(--ink-200)",
        display: "flex",
        gap: 4,
      }}
    >
      <TabLink
        href="/signatures"
        active={currentScope === "pending"}
        label="À approuver"
        badge={pendingCount}
      />
      <TabLink
        href="/signatures?scope=recent"
        active={currentScope === "recent"}
        label="Décisions récentes"
      />
    </nav>
  )
}

function TabLink({
  href,
  active,
  label,
  badge,
}: {
  href: string
  active: boolean
  label: string
  badge?: number
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "12px 14px",
        fontSize: 13,
        fontWeight: active ? 700 : 500,
        color: active ? "var(--primary-600)" : "var(--ink-700)",
        textDecoration: "none",
        borderBottom: active
          ? "2px solid var(--primary-500)"
          : "2px solid transparent",
        marginBottom: -1,
      }}
    >
      {label}
      {typeof badge === "number" && badge > 0 && (
        <Badge tone="primary" size="sm">
          {badge}
        </Badge>
      )}
    </Link>
  )
}
