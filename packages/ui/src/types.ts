import type { CSSProperties, ReactNode } from "react"

export type Tone =
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "archived"
  | "active"
  | "semi"
  | "inactive"
  | "destruct"

export type Size = "sm" | "md" | "lg"

export interface SidebarItemLink {
  id: string
  label: string
  icon: string
  count?: number
  href?: string
}

export interface SidebarItemSection {
  section: string
}

export type SidebarItem = SidebarItemLink | SidebarItemSection

export interface StylableProps {
  style?: CSSProperties
  className?: string
  children?: ReactNode
}
