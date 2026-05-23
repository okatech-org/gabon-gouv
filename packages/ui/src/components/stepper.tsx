import type { ReactNode } from "react"
import { Icon, type IconName } from "./icon"
import { Badge } from "./badge"

export interface StepperProps {
  steps: ReactNode[]
  current: number
}

export const Stepper = ({ steps, current }: StepperProps) => (
  <ol style={{ display: "flex", listStyle: "none", padding: 0, margin: 0, gap: 0 }}>
    {steps.map((s, i) => {
      const done = i < current
      const active = i === current
      return (
        <li
          key={i}
          style={{ flex: 1, display: "flex", alignItems: "center", gap: 12 }}
        >
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: done
                ? "var(--success-500)"
                : active
                ? "var(--primary-500)"
                : "white",
              border: `1.5px solid ${
                done
                  ? "var(--success-500)"
                  : active
                  ? "var(--primary-500)"
                  : "var(--ink-300)"
              }`,
              color: done || active ? "white" : "var(--ink-500)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {done ? <Icon name="check" size={14} stroke={3} /> : i + 1}
          </span>
          <span
            style={{
              fontSize: 13,
              fontWeight: active || done ? 600 : 500,
              color: active
                ? "var(--primary-600)"
                : done
                ? "var(--ink-700)"
                : "var(--ink-500)",
            }}
          >
            {s}
          </span>
          {i < steps.length - 1 && (
            <span
              style={{
                flex: 1,
                height: 1,
                background: done ? "var(--success-500)" : "var(--ink-200)",
                marginLeft: 12,
              }}
            />
          )}
        </li>
      )
    })}
  </ol>
)

/* ---------- PipelineStep (vertical) ---------- */

export type PipelineStatus = "done" | "active" | "pending" | "error"

export interface PipelineStepProps {
  name: ReactNode
  status: PipelineStatus
  duration?: ReactNode
  log?: ReactNode
  icon?: IconName
}

interface PipelineCfg {
  color: string
  bg: string
  icon: IconName
  label: string
}

const CFG: Record<PipelineStatus, PipelineCfg> = {
  done: { color: "var(--success-500)", bg: "var(--success-50)", icon: "check", label: "Terminé" },
  active: {
    color: "var(--primary-500)",
    bg: "var(--primary-50)",
    icon: "refresh",
    label: "En cours",
  },
  pending: {
    color: "var(--ink-400)",
    bg: "var(--ink-100)",
    icon: "clock",
    label: "En attente",
  },
  error: { color: "var(--danger-500)", bg: "var(--danger-50)", icon: "xCircle", label: "Échec" },
}

export const PipelineStep = ({ name, status, duration, log, icon }: PipelineStepProps) => {
  const cfg = CFG[status]
  const iconName = status === "active" && icon ? icon : cfg.icon
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: cfg.bg,
            color: cfg.color,
            border: `1.5px solid ${cfg.color}`,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            animation: status === "active" ? "spin 1.4s linear infinite" : "none",
          }}
        >
          <Icon name={iconName} size={15} stroke={2.25} />
        </span>
        <span
          style={{
            width: 1.5,
            flex: 1,
            minHeight: 24,
            background: status === "pending" ? "var(--ink-200)" : "var(--ink-300)",
          }}
        />
      </div>
      <div style={{ flex: 1, paddingBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: "var(--ink-900)" }}>{name}</span>
          <Badge
            tone={
              status === "done"
                ? "archived"
                : status === "active"
                ? "active"
                : status === "error"
                ? "danger"
                : "neutral"
            }
            size="sm"
            dot
          >
            {cfg.label}
          </Badge>
          {duration && (
            <span style={{ fontSize: 12, color: "var(--ink-500)" }}>{duration}</span>
          )}
        </div>
        {log && <div style={{ fontSize: 13, color: "var(--ink-600)", marginTop: 4 }}>{log}</div>}
      </div>
    </div>
  )
}
