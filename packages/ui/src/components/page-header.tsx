import { Fragment, type ReactNode } from "react"
import { Icon } from "./icon"

export interface PageHeaderProps {
  breadcrumbs?: ReactNode[]
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  meta?: ReactNode
}

export const PageHeader = ({
  breadcrumbs,
  title,
  subtitle,
  actions,
  meta,
}: PageHeaderProps) => (
  <div
    style={{
      padding: "24px 32px 16px",
      borderBottom: "1px solid var(--ink-200)",
      background: "white",
    }}
  >
    {breadcrumbs && (
      <nav
        aria-label="Fil d'Ariane"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 13,
          color: "var(--ink-600)",
          marginBottom: 8,
        }}
      >
        {breadcrumbs.map((c, i) => (
          <Fragment key={i}>
            {i > 0 && (
              <Icon name="chevronRight" size={12} style={{ color: "var(--ink-400)" }} />
            )}
            <span
              style={{
                color: i === breadcrumbs.length - 1 ? "var(--ink-900)" : "var(--ink-600)",
                fontWeight: i === breadcrumbs.length - 1 ? 600 : 500,
              }}
            >
              {c}
            </span>
          </Fragment>
        ))}
      </nav>
    )}
    <div style={{ display: "flex", alignItems: "flex-start", gap: 24 }}>
      <div style={{ flex: 1 }}>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: "var(--ink-900)",
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p style={{ marginTop: 4, color: "var(--ink-600)", fontSize: 14 }}>{subtitle}</p>
        )}
        {meta && (
          <div style={{ display: "flex", gap: 24, marginTop: 12, alignItems: "center" }}>
            {meta}
          </div>
        )}
      </div>
      {actions && <div style={{ display: "flex", gap: 8 }}>{actions}</div>}
    </div>
  </div>
)
