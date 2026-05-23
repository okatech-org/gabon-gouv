"use client"

import type { CSSProperties, ReactNode } from "react"
import { Icon, type IconName } from "./icon"

type AlertTone = "info" | "success" | "warning" | "danger"

export interface AlertProps {
  tone?: AlertTone
  title?: ReactNode
  children?: ReactNode
  icon?: IconName
  onClose?: () => void
  style?: CSSProperties
}

interface AlertToneSpec {
  bg: string
  border: string
  fg: string
  icon: IconName
}

const TONES: Record<AlertTone, AlertToneSpec> = {
  info: {
    bg: "var(--info-50)",
    border: "var(--primary-300)",
    fg: "var(--primary-700)",
    icon: "info",
  },
  success: {
    bg: "var(--success-50)",
    border: "#9bcfa6",
    fg: "var(--success-600)",
    icon: "checkCircle",
  },
  warning: {
    bg: "var(--warning-50)",
    border: "#f0c269",
    fg: "var(--warning-600)",
    icon: "alertTriangle",
  },
  danger: {
    bg: "var(--danger-50)",
    border: "#e89a9a",
    fg: "var(--danger-600)",
    icon: "alertCircle",
  },
}

export const Alert = ({ tone = "info", title, children, icon, onClose, style }: AlertProps) => {
  const t = TONES[tone]
  return (
    <div
      role="alert"
      style={{
        display: "flex",
        gap: 12,
        padding: "12px 16px",
        background: t.bg,
        border: `1px solid ${t.border}`,
        borderLeft: `4px solid ${t.border}`,
        borderRadius: 6,
        color: t.fg,
        ...style,
      }}
    >
      <span style={{ flexShrink: 0, marginTop: 2 }}>
        <Icon name={icon ?? t.icon} size={18} />
      </span>
      <div style={{ flex: 1, color: "var(--ink-800)" }}>
        {title && (
          <div style={{ fontWeight: 700, color: t.fg, marginBottom: 2 }}>{title}</div>
        )}
        <div style={{ fontSize: 14, lineHeight: 1.5 }}>{children}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Fermer"
          style={{
            background: "transparent",
            border: "none",
            color: t.fg,
            cursor: "pointer",
            padding: 0,
          }}
        >
          <Icon name="x" size={16} />
        </button>
      )}
    </div>
  )
}
