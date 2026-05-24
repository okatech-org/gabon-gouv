import type { Tone } from "@workspace/ui"

export interface StatusBadge {
  label: string
  tone: Tone
}

export function citizenStatusBadge(status: string): StatusBadge {
  switch (status) {
    case "submitted":
      return { label: "À traiter", tone: "neutral" }
    case "in_instruction":
      return { label: "En instruction", tone: "active" }
    case "waiting_pieces":
      return { label: "Pièces demandées", tone: "warning" }
    case "issued":
      return { label: "Prêt à télécharger", tone: "archived" }
    case "rejected":
      return { label: "Rejeté", tone: "danger" }
    case "cancelled":
      return { label: "Annulé", tone: "neutral" }
    default:
      return { label: status, tone: "neutral" }
  }
}

export function longDate(ms: number): string {
  return new Date(ms).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}
