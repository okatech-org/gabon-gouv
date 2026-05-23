import type { ReactNode } from "react"
import { Icon, type IconName } from "./icon"
import { Badge } from "./badge"
import type { Tone } from "../types"

export interface StatCardProps {
  label: ReactNode
  value: ReactNode
  delta?: ReactNode
  deltaTone?: Tone
  icon?: IconName
  hint?: ReactNode
  accent?: boolean
}

export const StatCard = ({
  label,
  value,
  delta,
  deltaTone,
  icon,
  hint,
  accent = false,
}: StatCardProps) => (
  <div
    style={{
      background: accent ? "var(--primary-500)" : "white",
      color: accent ? "white" : "inherit",
      border: accent ? "none" : "1px solid var(--ink-200)",
      borderRadius: 8,
      padding: 20,
      display: "flex",
      flexDirection: "column",
      gap: 6,
    }}
  >
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: accent ? "rgba(255,255,255,.85)" : "var(--ink-600)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </span>
      {icon && (
        <Icon
          name={icon}
          size={16}
          style={{ color: accent ? "rgba(255,255,255,.85)" : "var(--ink-500)" }}
        />
      )}
    </div>
    <div
      style={{
        fontSize: 30,
        fontWeight: 700,
        letterSpacing: "-0.02em",
        color: accent ? "white" : "var(--ink-900)",
        lineHeight: 1.1,
      }}
    >
      {value}
    </div>
    {(delta || hint) && (
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
        {delta && (
          <Badge tone={deltaTone ?? "success"} size="sm" dot>
            {delta}
          </Badge>
        )}
        {hint && (
          <span style={{ color: accent ? "rgba(255,255,255,.8)" : "var(--ink-500)" }}>
            {hint}
          </span>
        )}
      </div>
    )}
  </div>
)
