import type { Tone } from "@workspace/ui"

/* Labels et tons pour les statuts de demandes. */
export interface StatusBadge {
  label: string
  tone: Tone
}

export function statusBadge(status: string): StatusBadge {
  switch (status) {
    case "submitted":
      return { label: "À traiter", tone: "neutral" }
    case "in_instruction":
      return { label: "En instruction", tone: "active" }
    case "waiting_pieces":
      return { label: "Pièces demandées", tone: "warning" }
    case "waiting_registry":
      return { label: "En attente registre", tone: "warning" }
    case "to_sign":
      return { label: "À signer", tone: "destruct" }
    case "issued":
      return { label: "Signé", tone: "archived" }
    case "rejected":
      return { label: "Rejeté", tone: "danger" }
    case "cancelled":
      return { label: "Annulé", tone: "neutral" }
    default:
      return { label: status, tone: "neutral" }
  }
}

/* "il y a 14 h", "il y a 2 j", "demain"… simple, sans dépendance Intl moderne. */
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

/* Date courte "20/05 14:32". */
export function shortDateTime(ms: number) {
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function isUrgentDue(dueAt: number | undefined, now = Date.now()): boolean {
  if (!dueAt) return false
  return dueAt - now < 12 * 60 * 60 * 1000
}

export function formatNip(nip: string): string {
  if (nip.length === 12) {
    return `${nip.slice(0, 3)} ${nip.slice(3, 5)} ${nip.slice(5, 7)} ${nip.slice(7, 10)} ${nip.slice(10)}`
  }
  return nip
}

/* Libellé FR pour les rôles agents (snake_case Convex → label affiché). */
export function agentRoleLabel(role: string): string {
  switch (role) {
    case "agent_instructeur":
      return "Agent instructeur"
    case "chef_service":
      return "Chef de service"
    case "officier_signataire":
      return "Officier signataire"
    case "admin_organisme":
      return "Admin organisme"
    case "admin_technique":
      return "Admin technique"
    default:
      return role
  }
}

/* Date longue FR "23 mai 2026". */
export function longDate(ms: number): string {
  return new Date(ms).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}
