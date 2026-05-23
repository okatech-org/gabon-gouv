import type { Tone } from "../../ui/src/types"

/* ---------- Domaine partagé ---------- */

export interface Organism {
  id: string
  name: string
  shortName?: string
  category: string
  icon: string
  color: string
  services: number
  province?: string
  delay?: string
}

/* ---------- Citoyen ---------- */

export interface CitizenProfile {
  name: string
  email: string
  nip: string
  phone?: string
  address?: string
  createdAt?: string
  birthDate?: string
}

export interface ServiceCategory {
  id: string
  label: string
  icon: string
  count: number
  color: string
}

export interface TopService {
  id: string
  cat: string
  label: string
  org: string
  delay: string
  online: boolean
  fee: string
}

export interface CitizenRequest {
  id: string
  ref: string
  title: string
  org: string
  depositedAt: string
  status: string
  tone: Tone
  progress: number
}

export interface CitizenRecommendation {
  id: string
  title: string
  description: string
  icon: string
  urgent?: boolean
}

export interface CitizenMessage {
  id: string
  who: string
  when: string
  title: string
  description: string
  unread: boolean
}

export interface DashboardStats {
  inProgress: number
  documentsReceived: number
  averageDelay: string
  delayDelta?: { value: string; tone: Tone }
  notifications: number
  notificationsHint?: string
}

export interface DirectoryOrg {
  name: string
  category: string
  servicesCount: number
  theme: string
  icon: string
  delay: string
  tone: string
}

/* ---------- Admin ---------- */

export interface AdminUser {
  org: string
  name: string
  role: string
}

export interface QueueItem {
  ref: string
  title: string
  citizen: string
  nip: string
  depositedAt: string
  dueAt: string
  agent: string
  status: string
  tone: Tone
  pieces: string
  selected?: boolean
  urgent?: boolean
}

export interface DistributionEntry {
  title: string
  count: number
  pct: number
  color: string
}

export interface TeamActivity {
  who: string
  action: string
  what: string
  when: string
}

export interface VerificationStep {
  title: string
  status: "ok" | "pending" | "ko"
  description: string
}

export interface PieceFile {
  filename: string
  size: string
  ocrConfidence?: number
}

export interface TemplateVariable {
  key: string
  value: string
  source: string
}

export interface Correspondence {
  ref: string
  from: string
  subject: string
  when: string
  unread: boolean
  attachments: number
  urgent?: boolean
}

export interface ArchiveItem {
  cote: string
  description: string
  producer: string
  versedAt: string
  dua: string
  status: string
  statusTone: Tone
  finalSort: string
  hash: string
}

export interface ComplianceRule {
  title: string
  description: string
  ok: boolean
}

export interface DirectoryAdminEntry {
  name: string
  category: string
  tutelage: string
  servicesCount: number
  referent: string
  connection: string
}

export interface ServiceCatalogEntry {
  title: string
  category: string
  status: string
  statusTone: Tone
  requests30d: number
  delay: string
  satisfaction: string
  fee: string
  updatedAt: string
}

/* ---------- Platform ---------- */

export interface PlatformKpi {
  label: string
  value: string
  delta?: string
  deltaTone?: Tone
  hint?: string
  icon: string
  accent?: boolean
}

export interface PlatformHealth {
  title: string
  description: string
  status: "ok" | "warning" | "ko"
}

export interface PlatformOrgRow {
  name: string
  category: string
  province: string
  status: string
  statusTone: Tone
  connection: string
  services: number
  volume: string
  signedAt: string
}

export interface OnboardingStep {
  title: string
  status: "done" | "active" | "pending"
}

export interface OnboardingTargetOrg {
  denomination: string
  legalForm: string
  acronym: string
  tutelage: string
  decree: string
  headquarters: string
  taxId: string
  phone: string
}

export interface OnboardingPerson {
  name: string
  function: string
  email: string
  role: string
  auth: string
}

export interface OrgVolumeRow {
  name: string
  volume: number
  services: number
  delay: string
  satisfaction: string
  capacity: number
  status: string
  statusTone: Tone
}

export interface TopDemandStat {
  title: string
  value: number
  pct: number
}

export interface ProvinceStat {
  province: string
  value: number
  pct: number
}

export interface PlatformActivity {
  who: string
  action: string
  what: string
  when: string
  icon: string
}
