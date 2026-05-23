"use client"

import type { ReactNode } from "react"

export interface TabSpec {
  id: string
  label: ReactNode
}

export interface TabsProps {
  tabs: TabSpec[]
  current?: string
  onChange?: (id: string) => void
  variant?: "pill" | "line"
}

export const Tabs = ({ tabs, current, onChange, variant = "pill" }: TabsProps) => {
  if (variant === "pill") {
    return (
      <div
        style={{
          display: "inline-flex",
          padding: 3,
          background: "var(--ink-100)",
          borderRadius: 8,
          gap: 2,
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => onChange?.(t.id)}
            style={{
              padding: "6px 16px",
              minHeight: 32,
              borderRadius: 6,
              background: current === t.id ? "white" : "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              color: current === t.id ? "var(--ink-900)" : "var(--ink-600)",
              boxShadow: current === t.id ? "0 1px 2px rgba(0,0,0,.06)" : "none",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
    )
  }
  return (
    <div role="tablist" style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--ink-200)" }}>
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={current === t.id}
          onClick={() => onChange?.(t.id)}
          style={{
            padding: "12px 16px",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 600,
            color: current === t.id ? "var(--primary-600)" : "var(--ink-600)",
            borderBottom: `2px solid ${
              current === t.id ? "var(--primary-500)" : "transparent"
            }`,
            marginBottom: -1,
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
