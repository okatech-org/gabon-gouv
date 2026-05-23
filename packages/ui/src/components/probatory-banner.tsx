import { Icon } from "./icon"

export interface ProbatoryBannerProps {
  hash: string
  timestamp: string
  signature?: string
  compact?: boolean
}

export const ProbatoryBanner = ({
  hash,
  timestamp,
  signature,
  compact,
}: ProbatoryBannerProps) => (
  <div
    style={{
      background: "linear-gradient(180deg, var(--primary-50) 0%, white 100%)",
      border: "1px solid var(--primary-200)",
      borderRadius: 8,
      padding: compact ? 12 : 16,
      display: "flex",
      gap: 12,
      alignItems: "flex-start",
    }}
  >
    <span
      style={{
        width: 32,
        height: 32,
        borderRadius: 6,
        background: "var(--primary-500)",
        color: "white",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Icon name="shieldCheck" size={18} />
    </span>
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--primary-700)" }}>
        Document scellé électroniquement · valeur probante NF Z42-013
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: "4px 12px",
          fontSize: 12,
          color: "var(--ink-700)",
        }}
      >
        <span style={{ color: "var(--ink-500)" }}>Empreinte SHA-256</span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--ink-800)",
            wordBreak: "break-all",
          }}
        >
          {hash}
        </span>
        <span style={{ color: "var(--ink-500)" }}>Horodaté</span>
        <span style={{ fontWeight: 500 }}>{timestamp}</span>
        {signature && (
          <>
            <span style={{ color: "var(--ink-500)" }}>Signé par</span>
            <span style={{ fontWeight: 500 }}>{signature}</span>
          </>
        )}
      </div>
      {!compact && (
        <a href="#verify" style={{ fontSize: 12, fontWeight: 600, marginTop: 4 }}>
          Comment vérifier l&apos;intégrité ?
        </a>
      )}
    </div>
  </div>
)
