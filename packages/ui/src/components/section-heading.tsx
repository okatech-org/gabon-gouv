import type { CSSProperties, ReactNode } from "react"

export interface SectionHeadingProps {
  title: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  level?: 2 | 3 | 4
  style?: CSSProperties
}

export const SectionHeading = ({
  title,
  subtitle,
  action,
  level = 2,
  style,
}: SectionHeadingProps) => {
  const Tag = `h${level}` as "h2" | "h3" | "h4"
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 16,
        marginBottom: 16,
        ...style,
      }}
    >
      <div style={{ flex: 1 }}>
        <Tag
          style={{
            fontSize: level === 2 ? 18 : 15,
            fontWeight: 700,
            color: "var(--ink-900)",
            letterSpacing: "-0.005em",
          }}
        >
          {title}
        </Tag>
        {subtitle && (
          <p style={{ marginTop: 2, fontSize: 13, color: "var(--ink-600)" }}>{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  )
}
