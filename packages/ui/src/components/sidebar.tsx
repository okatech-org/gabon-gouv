"use client"

import type { CSSProperties, ReactNode } from "react"
import { Icon, type IconName } from "./icon"
import { Badge } from "./badge"
import type { SidebarItem } from "../types"

export interface SidebarProps {
  items: SidebarItem[]
  current?: string
  onSelect?: (id: string) => void
  footer?: ReactNode
}

export const Sidebar = ({ items, current, onSelect, footer }: SidebarProps) => (
  <nav
    style={{
      width: 232,
      background: "white",
      borderRight: "1px solid var(--ink-200)",
      padding: "16px 12px",
      display: "flex",
      flexDirection: "column",
    }}
  >
    <ul
      style={{
        listStyle: "none",
        padding: 0,
        margin: 0,
        display: "flex",
        flexDirection: "column",
        gap: 2,
        flex: 1,
      }}
    >
      {items.map((it, idx) =>
        "section" in it ? (
          <li
            key={`section-${idx}`}
            style={{
              padding: "12px 12px 6px",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: "var(--ink-500)",
              textTransform: "uppercase",
            }}
          >
            {it.section}
          </li>
        ) : (
          <SidebarRow
            key={it.id}
            id={it.id}
            label={it.label}
            icon={it.icon as IconName}
            count={it.count}
            href={it.href}
            active={current === it.id}
            onSelect={onSelect}
          />
        ),
      )}
    </ul>
    {footer}
  </nav>
)

interface SidebarRowProps {
  id: string
  label: string
  icon: IconName
  count?: number
  href?: string
  active: boolean
  onSelect?: (id: string) => void
}

const SidebarRow = ({ id, label, icon, count, href, active, onSelect }: SidebarRowProps) => {
  const style: CSSProperties = {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 12px",
    borderRadius: 6,
    background: active ? "var(--primary-50)" : "transparent",
    color: active ? "var(--primary-600)" : "var(--ink-700)",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
    fontSize: 14,
    fontWeight: active ? 600 : 500,
    textDecoration: "none",
    boxSizing: "border-box",
  }

  const inner = (
    <>
      <Icon name={icon} size={16} />
      <span style={{ flex: 1 }}>{label}</span>
      {count !== undefined && (
        <Badge tone={active ? "primary" : "neutral"} size="sm">
          {count}
        </Badge>
      )}
    </>
  )

  if (href) {
    return (
      <li>
        <a href={href} style={style}>
          {inner}
        </a>
      </li>
    )
  }

  return (
    <li>
      <button type="button" onClick={() => onSelect?.(id)} style={style}>
        {inner}
      </button>
    </li>
  )
}
