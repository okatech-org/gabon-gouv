import type { ReactNode } from "react"

type ProgressTone = "primary" | "success" | "warning" | "danger"

export interface ProgressProps {
  value: number
  total?: number
  tone?: ProgressTone
  label?: ReactNode
  height?: number
}

const COLORS: Record<ProgressTone, string> = {
  primary: "var(--primary-500)",
  success: "var(--success-500)",
  warning: "var(--warning-500)",
  danger: "var(--danger-500)",
}

export const Progress = ({
  value,
  total = 100,
  tone = "primary",
  label,
  height = 6,
}: ProgressProps) => {
  const pct = Math.min(100, (value / total) * 100)
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
      <div
        style={{
          flex: 1,
          height,
          background: "var(--ink-200)",
          borderRadius: 999,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: COLORS[tone],
            borderRadius: 999,
            transition: "width .3s",
          }}
        />
      </div>
      {label && (
        <span
          style={{
            fontSize: 12,
            color: "var(--ink-700)",
            fontVariantNumeric: "tabular-nums",
            minWidth: 56,
            textAlign: "right",
          }}
        >
          {label}
        </span>
      )}
    </div>
  )
}
