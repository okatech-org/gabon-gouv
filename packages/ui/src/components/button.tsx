"use client"

import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react"
import { Icon, type IconName } from "./icon"

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger" | "success" | "link"
type Size = "sm" | "md" | "lg"

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: IconName
  iconRight?: IconName
  children?: ReactNode
}

const BASE: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  fontFamily: "inherit",
  fontWeight: 600,
  fontSize: 14,
  padding: "8px 16px",
  minHeight: 36,
  borderRadius: 6,
  border: "1px solid transparent",
  cursor: "pointer",
  whiteSpace: "nowrap",
  transition: "background .12s, border-color .12s, color .12s",
  letterSpacing: "0.01em",
}

const VARIANTS: Record<Variant, CSSProperties> = {
  primary: {
    background: "var(--primary-500)",
    color: "white",
    border: "1px solid var(--primary-500)",
  },
  secondary: {
    background: "white",
    color: "var(--primary-500)",
    border: "1px solid var(--primary-500)",
  },
  ghost: { background: "transparent", color: "var(--ink-700)", border: "1px solid transparent" },
  outline: { background: "white", color: "var(--ink-800)", border: "1px solid var(--ink-300)" },
  danger: {
    background: "var(--danger-500)",
    color: "white",
    border: "1px solid var(--danger-500)",
  },
  success: {
    background: "var(--success-500)",
    color: "white",
    border: "1px solid var(--success-500)",
  },
  link: {
    background: "transparent",
    color: "var(--primary-500)",
    border: "1px solid transparent",
    padding: 0,
    minHeight: "auto",
  },
}

const SIZES: Record<Size, CSSProperties> = {
  sm: { padding: "6px 12px", minHeight: 32, fontSize: 13 },
  md: {},
  lg: { padding: "12px 24px", minHeight: 48, fontSize: 16 },
}

export const Button = ({
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  children,
  style,
  ...rest
}: ButtonProps) => (
  <button {...rest} style={{ ...BASE, ...VARIANTS[variant], ...SIZES[size], ...style }}>
    {icon && <Icon name={icon} size={size === "lg" ? 18 : 15} />}
    {children}
    {iconRight && <Icon name={iconRight} size={size === "lg" ? 18 : 15} />}
  </button>
)
