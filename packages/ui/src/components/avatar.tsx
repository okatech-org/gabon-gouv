type AvatarTone = "primary" | "green" | "pink" | "purple" | "amber" | "cyan"

export interface AvatarProps {
  name?: string
  tone?: AvatarTone
  size?: number
}

interface AvatarToneSpec {
  bg: string
  fg: string
}

const TONES: Record<AvatarTone, AvatarToneSpec> = {
  primary: { bg: "var(--primary-50)", fg: "var(--primary-600)" },
  green: { bg: "#d8eed8", fg: "var(--success-600)" },
  pink: { bg: "#fce4eb", fg: "#a3315a" },
  purple: { bg: "#e9e0fa", fg: "#5b3aa3" },
  amber: { bg: "var(--warning-100)", fg: "var(--warning-600)" },
  cyan: { bg: "#d6eef0", fg: "#1f6e75" },
}

export const Avatar = ({ name = "", tone = "primary", size = 28 }: AvatarProps) => {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase()
  const t = TONES[tone]
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: t.bg,
        color: t.fg,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size <= 24 ? 10 : 11,
        fontWeight: 700,
        letterSpacing: "0.02em",
        flexShrink: 0,
      }}
    >
      {initials || "?"}
    </span>
  )
}
