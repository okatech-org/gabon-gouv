"use client"

import type { CSSProperties, MouseEventHandler, ReactNode } from "react"

export interface CardProps {
  children?: ReactNode
  style?: CSSProperties
  padded?: boolean
  hover?: boolean
  onClick?: MouseEventHandler<HTMLDivElement>
}

export const Card = ({ children, style, padded = true, hover = false, onClick }: CardProps) => (
  <div
    onClick={onClick}
    style={{
      background: "white",
      border: "1px solid var(--ink-200)",
      borderRadius: 8,
      padding: padded ? 24 : 0,
      boxShadow: "0 1px 2px rgba(14,26,43,.04)",
      cursor: hover || onClick ? "pointer" : "default",
      transition: "border-color .12s, box-shadow .12s",
      ...style,
    }}
  >
    {children}
  </div>
)
