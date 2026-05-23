"use client"

import type { CSSProperties, MouseEventHandler, ReactNode } from "react"
import { Icon } from "./icon"

export const Table = ({ children }: { children: ReactNode }) => (
  <div
    style={{
      width: "100%",
      overflow: "auto",
      border: "1px solid var(--ink-200)",
      borderRadius: 8,
      background: "white",
    }}
  >
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>{children}</table>
  </div>
)

export interface ThProps {
  children?: ReactNode
  sortable?: boolean
  align?: "left" | "center" | "right"
  style?: CSSProperties
}

export const Th = ({ children, sortable, align = "left", style }: ThProps) => (
  <th
    style={{
      textAlign: align,
      padding: "10px 12px",
      fontSize: 11,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      color: "var(--ink-600)",
      borderBottom: "1px solid var(--ink-200)",
      background: "var(--ink-50)",
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      {children}
      {sortable && (
        <Icon name="chevronDown" size={11} style={{ color: "var(--ink-400)" }} />
      )}
    </span>
  </th>
)

export interface TdProps {
  children?: ReactNode
  align?: "left" | "center" | "right"
  style?: CSSProperties
  colSpan?: number
}

export const Td = ({ children, align = "left", style, colSpan }: TdProps) => (
  <td
    colSpan={colSpan}
    style={{
      padding: "12px",
      textAlign: align,
      borderBottom: "1px solid var(--ink-150)",
      color: "var(--ink-800)",
      verticalAlign: "middle",
      ...style,
    }}
  >
    {children}
  </td>
)

export interface TrProps {
  children?: ReactNode
  onClick?: MouseEventHandler<HTMLTableRowElement>
  selected?: boolean
}

export const Tr = ({ children, onClick, selected }: TrProps) => (
  <tr
    onClick={onClick}
    style={{
      cursor: onClick ? "pointer" : "default",
      background: selected ? "var(--primary-50)" : "transparent",
    }}
    onMouseEnter={
      onClick
        ? (e) => {
            ;(e.currentTarget as HTMLTableRowElement).style.background = selected
              ? "var(--primary-100)"
              : "var(--ink-50)"
          }
        : undefined
    }
    onMouseLeave={
      onClick
        ? (e) => {
            ;(e.currentTarget as HTMLTableRowElement).style.background = selected
              ? "var(--primary-50)"
              : "transparent"
          }
        : undefined
    }
  >
    {children}
  </tr>
)
