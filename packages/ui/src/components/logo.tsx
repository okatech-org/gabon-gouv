import type { CSSProperties, ReactNode } from "react"

export interface LogoProps {
  size?: number
  variant?: "default" | "light"
  subtitle?: string
  /**
   * Si fourni, le logo entier est rendu comme un lien (`<a href>`).
   * Par défaut `/` — passe `null` pour désactiver explicitement le lien.
   */
  href?: string | null
}

export const Logo = ({
  size = 32,
  variant = "default",
  subtitle = "Guichet unique",
  href = "/",
}: LogoProps) => {
  const isLight = variant === "light"
  const wrapperStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    textDecoration: "none",
    color: "inherit",
  }
  const content: ReactNode = (
    <>
      <span
        style={{
          width: size,
          height: size,
          borderRadius: 6,
          background: isLight ? "white" : "var(--primary-500)",
          color: isLight ? "var(--primary-600)" : "white",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
          <rect x="3" y="3" width="6" height="2" fill="#009e60" />
          <rect x="3" y="6" width="6" height="2" fill="#fcd116" />
          <rect x="3" y="9" width="6" height="2" fill="#3a75c4" />
          <path
            d="M22 12.5a6.5 6.5 0 1 0 0 8.5h-5"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
          />
          <path d="M22 17h-3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </span>
      <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.05 }}>
        <span
          style={{
            fontWeight: 900,
            fontSize: 16,
            color: isLight ? "white" : "var(--ink-900)",
            letterSpacing: "-0.01em",
          }}
        >
          Gabon
          <span style={{ color: isLight ? "rgba(255,255,255,.75)" : "var(--primary-500)" }}>
            Connect
          </span>
        </span>
        <span
          style={{
            fontWeight: 600,
            fontSize: 10.5,
            color: isLight ? "rgba(255,255,255,.75)" : "var(--ink-600)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          {subtitle}
        </span>
      </span>
    </>
  )

  if (href) {
    return (
      <a href={href} style={wrapperStyle} aria-label="Retour à l'accueil">
        {content}
      </a>
    )
  }
  return <div style={wrapperStyle}>{content}</div>
}
