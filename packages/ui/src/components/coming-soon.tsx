import type { ReactNode } from "react"
import { Icon, type IconName } from "./icon"

export interface ComingSoonProps {
  icon?: IconName
  title?: ReactNode
  description?: ReactNode
  hint?: ReactNode
}

export const ComingSoon = ({
  icon = "sparkle",
  title = "Bientôt disponible",
  description = "Cette page est en cours de construction. Elle sera disponible dans une prochaine version de Gabon Connect.",
  hint,
}: ComingSoonProps) => (
  <div
    style={{
      flex: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "48px 32px",
    }}
  >
    <div
      style={{
        maxWidth: 520,
        textAlign: "center",
        background: "white",
        border: "1px solid var(--ink-200)",
        borderRadius: 12,
        padding: "48px 40px",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "var(--primary-50)",
          color: "var(--primary-600)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
        }}
      >
        <Icon name={icon} size={26} />
      </div>
      <h1
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: "var(--ink-900)",
          letterSpacing: "-0.01em",
          marginBottom: 10,
        }}
      >
        {title}
      </h1>
      <p
        style={{
          fontSize: 14.5,
          lineHeight: 1.55,
          color: "var(--ink-600)",
          margin: 0,
        }}
      >
        {description}
      </p>
      {hint && (
        <div
          style={{
            marginTop: 20,
            paddingTop: 16,
            borderTop: "1px solid var(--ink-150)",
            fontSize: 13,
            color: "var(--ink-700)",
          }}
        >
          {hint}
        </div>
      )}
    </div>
  </div>
)
