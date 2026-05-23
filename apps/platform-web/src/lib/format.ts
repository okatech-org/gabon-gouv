import type { Tone } from "@workspace/ui"

export interface StatusBadge {
  label: string
  tone: Tone
}

export function organismStatusBadge(status: string): StatusBadge {
  switch (status) {
    case "active":
      return { label: "Active", tone: "archived" }
    case "onboarding":
      return { label: "Onboarding", tone: "warning" }
    case "suspended":
      return { label: "Suspendue", tone: "danger" }
    default:
      return { label: status, tone: "neutral" }
  }
}

export function relativeTime(ms: number, ref = Date.now()): string {
  const diff = ms - ref
  const absMin = Math.abs(diff) / 60_000
  if (absMin < 1) return diff < 0 ? "à l'instant" : "dans un instant"
  const absHour = absMin / 60
  const absDay = absHour / 24
  const past = diff < 0
  if (absHour < 1) {
    const m = Math.round(absMin)
    return past ? `il y a ${m} min` : `dans ${m} min`
  }
  if (absDay < 1) {
    const h = Math.round(absHour)
    return past ? `il y a ${h} h` : `dans ${h} h`
  }
  const d = Math.round(absDay)
  if (d === 1) return past ? "hier" : "demain"
  return past ? `il y a ${d} j` : `dans ${d} j`
}

export function longDate(ms: number): string {
  return new Date(ms).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}
