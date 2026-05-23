import type { Tone } from "../../ui/src/types"
import type {
  AdminUser,
  ArchiveItem,
  ComplianceRule,
  Correspondence,
  DirectoryAdminEntry,
  DistributionEntry,
  PieceFile,
  QueueItem,
  ServiceCatalogEntry,
  TeamActivity,
  TemplateVariable,
  VerificationStep,
} from "./types"

/* ---------- Profil agent connecté ---------- */

const CURRENT_ADMIN: AdminUser = {
  org: "Direction Gén. de l'État Civil",
  name: "Yolande NGUEMA",
  role: "Agent instructeur",
}

export const getCurrentAdmin = async (): Promise<AdminUser> => CURRENT_ADMIN

/* ---------- KPI dashboard ---------- */

export interface AdminKpi {
  label: string
  value: string
  icon: string
  delta?: string
  deltaTone?: Tone
  hint?: string
}

const KPIS: AdminKpi[] = [
  { label: "En file d'attente", value: "47", icon: "inbox", delta: "+8 aujourd'hui", deltaTone: "warning" },
  { label: "En cours", value: "124", icon: "refresh" },
  { label: "Traitées 7 j", value: "318", icon: "checkCircle", delta: "+12 %", deltaTone: "success" },
  { label: "Délai moyen", value: "1 j 18 h", icon: "clock", delta: "−14 %", deltaTone: "success" },
  { label: "Satisfaction", value: "4,6/5", icon: "star", hint: "184 avis" },
]

export const getAdminDashboardKpis = async (): Promise<AdminKpi[]> => KPIS

/* ---------- Sparkline volumes ---------- */

const VOLUME_LAST_30_DAYS = [
  42, 58, 51, 73, 64, 88, 79, 92, 71, 84, 96, 81, 103, 94, 88, 112, 106, 98, 124, 117, 109,
  134, 128, 119, 142, 138, 126, 151, 146, 148,
]

export const getAdminVolume30Days = async (): Promise<number[]> => VOLUME_LAST_30_DAYS

/* ---------- Répartition par type ---------- */

const DISTRIBUTION: DistributionEntry[] = [
  { title: "Acte de naissance", count: 142, pct: 48, color: "var(--primary-500)" },
  { title: "Acte de mariage", count: 68, pct: 23, color: "var(--success-500)" },
  { title: "Certificat de nationalité", count: 52, pct: 17, color: "var(--warning-500)" },
  { title: "Acte de décès", count: 26, pct: 9, color: "var(--ink-500)" },
  { title: "Autres", count: 10, pct: 3, color: "var(--ink-300)" },
]

export const getAdminDistribution = async (): Promise<DistributionEntry[]> => DISTRIBUTION

/* ---------- File des demandes (assignées) ---------- */

const ASSIGNED_REQUESTS: QueueItem[] = [
  {
    ref: "GC-2026-EC-002841",
    title: "Acte de naissance · copie intégrale",
    citizen: "Marie OBAME",
    nip: "184127600504",
    depositedAt: "il y a 14 h",
    dueAt: "dans 1 j",
    agent: "Y. NGUEMA",
    status: "En instruction",
    tone: "active",
    pieces: "2/2",
  },
  {
    ref: "GC-2026-EC-002836",
    title: "Acte de mariage",
    citizen: "Jean-Pierre MOUNGUENGUI",
    nip: "178050099218",
    depositedAt: "il y a 1 j",
    dueAt: "dans 6 h",
    agent: "Y. NGUEMA",
    status: "En attente registre",
    tone: "warning",
    pieces: "3/3",
    urgent: true,
  },
  {
    ref: "GC-2026-EC-002829",
    title: "Certificat de nationalité",
    citizen: "Aïcha BONGO",
    nip: "191041100712",
    depositedAt: "il y a 2 j",
    dueAt: "demain",
    agent: "L. EYEGHE",
    status: "En instruction",
    tone: "active",
    pieces: "2/3",
  },
  {
    ref: "GC-2026-EC-002814",
    title: "Acte de naissance · extrait",
    citizen: "Paul ONDO",
    nip: "188090677341",
    depositedAt: "il y a 3 j",
    dueAt: "aujourd'hui",
    agent: "Y. NGUEMA",
    status: "À signer",
    tone: "destruct",
    pieces: "2/2",
    urgent: true,
  },
  {
    ref: "GC-2026-EC-002802",
    title: "Acte de décès",
    citizen: "Famille NZOGHE",
    nip: "174030042519",
    depositedAt: "il y a 4 j",
    dueAt: "dans 2 j",
    agent: "Non assigné",
    status: "Pièces demandées",
    tone: "warning",
    pieces: "1/3",
  },
]

export const getAdminAssignedRequests = async (): Promise<QueueItem[]> => ASSIGNED_REQUESTS

/* ---------- File complète (A2) ---------- */

const FULL_QUEUE: QueueItem[] = [
  {
    ref: "GC-2026-EC-002841",
    title: "Acte de naissance · copie intégrale",
    citizen: "Marie OBAME",
    nip: "184127600504",
    depositedAt: "20/05 14:32",
    dueAt: "dans 1 j",
    agent: "Y. NGUEMA",
    status: "En instruction",
    tone: "active",
    pieces: "2/2",
    selected: true,
  },
  {
    ref: "GC-2026-EC-002836",
    title: "Acte de mariage",
    citizen: "JP. MOUNGUENGUI",
    nip: "178050099218",
    depositedAt: "19/05 11:08",
    dueAt: "dans 6 h",
    agent: "Y. NGUEMA",
    status: "Attente registre",
    tone: "warning",
    pieces: "3/3",
    selected: true,
  },
  {
    ref: "GC-2026-EC-002829",
    title: "Certificat de nationalité",
    citizen: "Aïcha BONGO",
    nip: "191041100712",
    depositedAt: "18/05 16:54",
    dueAt: "demain",
    agent: "L. EYEGHE",
    status: "En instruction",
    tone: "active",
    pieces: "2/3",
  },
  {
    ref: "GC-2026-EC-002814",
    title: "Acte de naissance · extrait",
    citizen: "Paul ONDO",
    nip: "188090677341",
    depositedAt: "17/05 09:11",
    dueAt: "aujourd'hui",
    agent: "Y. NGUEMA",
    status: "À signer",
    tone: "destruct",
    pieces: "2/2",
    selected: true,
  },
  {
    ref: "GC-2026-EC-002802",
    title: "Acte de décès",
    citizen: "F. NZOGHE",
    nip: "174030042519",
    depositedAt: "16/05 14:47",
    dueAt: "dans 2 j",
    agent: "Non assigné",
    status: "Pièces demandées",
    tone: "warning",
    pieces: "1/3",
  },
  {
    ref: "GC-2026-EC-002787",
    title: "Acte de naissance · copie intégrale",
    citizen: "Sandra MILLE",
    nip: "199121200834",
    depositedAt: "15/05 10:22",
    dueAt: "dans 3 j",
    agent: "C. NDONG",
    status: "En instruction",
    tone: "active",
    pieces: "2/2",
  },
  {
    ref: "GC-2026-EC-002774",
    title: "Certificat de nationalité",
    citizen: "Olivier ESSONO",
    nip: "186020100456",
    depositedAt: "14/05 16:33",
    dueAt: "dans 4 j",
    agent: "Y. NGUEMA",
    status: "En instruction",
    tone: "active",
    pieces: "3/3",
  },
  {
    ref: "GC-2026-EC-002768",
    title: "Acte de naissance · extrait",
    citizen: "Patrice MBA",
    nip: "182071100129",
    depositedAt: "14/05 09:05",
    dueAt: "traité",
    agent: "P. MOUSSAVOU",
    status: "Signé",
    tone: "archived",
    pieces: "2/2",
  },
]

export const getAdminQueue = async (): Promise<QueueItem[]> => FULL_QUEUE

/* ---------- Activité équipe ---------- */

const TEAM_ACTIVITY: TeamActivity[] = [
  { who: "P. MOUSSAVOU", action: "a signé", what: "Acte EC-LBV-2026-04812", when: "il y a 12 min" },
  { who: "C. NDONG", action: "a versé", what: "32 actes au SAE", when: "il y a 1 h" },
  { who: "L. EYEGHE", action: "a transféré", what: "Dossier #4812 à DGI", when: "il y a 3 h" },
  { who: "Système", action: "a généré", what: "14 certificats automatiques", when: "il y a 5 h" },
]

export const getAdminTeamActivity = async (): Promise<TeamActivity[]> => TEAM_ACTIVITY

/* ---------- Instruction d'une demande ---------- */

export interface InstructionCitizenInfo {
  name: string
  nip: string
  email: string
  type: string
  copies: string
  birthDate: string
  birthPlace: string
  parents: string
}

export interface InstructionDetail {
  ref: string
  title: string
  subtitle: string
  citizen: InstructionCitizenInfo
  verifications: VerificationStep[]
  sourceAct: {
    register: string
    page: string
    order: string
    mentions: string
    text: string
  }
  pieces: PieceFile[]
  internalNote: string
  pipeline: {
    title: string
    status: "done" | "active" | "pending" | "error"
    duration?: string
  }[]
}

const INSTRUCTION: InstructionDetail = {
  ref: "GC-2026-EC-002841",
  title: "Acte de naissance · Marie Estelle OBAME",
  subtitle: "Déposée il y a 14h · échéance dans 1 jour · copie intégrale",
  citizen: {
    name: "Marie Estelle OBAME",
    nip: "184 12 76 005 042",
    email: "marie.obame@id.gouv.ga",
    type: "Copie intégrale",
    copies: "2",
    birthDate: "14 mars 1992",
    birthPlace: "Libreville, Estuaire",
    parents: "OBAME Jean-Pierre / MBOUMBA Antoinette",
  },
  verifications: [
    {
      title: "Identité numérique du citoyen",
      status: "ok",
      description: "NIP validé par le RGPP · 14 mars 1992 confirmé.",
    },
    {
      title: "Cohérence des informations",
      status: "ok",
      description: "Pas d'incohérence détectée entre la déclaration et les pièces.",
    },
    {
      title: "Détection de doublon",
      status: "ok",
      description: "Aucune demande similaire dans les 30 derniers jours.",
    },
    {
      title: "Lecture OCR des pièces",
      status: "ok",
      description: "CNI lue avec 99,4 % de confiance.",
    },
    {
      title: "Conformité antifraude",
      status: "ok",
      description: "Aucun indicateur de risque déclenché.",
    },
    {
      title: "Recherche au registre de Libreville",
      status: "pending",
      description: "En cours · acte 04812 à confirmer manuellement.",
    },
  ],
  sourceAct: {
    register: "EC-LBV-1992-N",
    page: "218",
    order: "04812",
    mentions: "Néant",
    text:
      "« L'an mil neuf cent quatre-vingt douze, le quatorze mars à trois heures vingt-deux minutes, est née à Libreville (province de l'Estuaire), OBAME Marie Estelle, de sexe féminin, fille de OBAME Jean-Pierre, instituteur, et de MBOUMBA Antoinette, sage-femme, son épouse, demeurant ensemble à Libreville… »",
  },
  pieces: [
    { filename: "CNI_obame.pdf", size: "1,2 Mo", ocrConfidence: 99.4 },
    { filename: "livret_famille.pdf", size: "2,8 Mo", ocrConfidence: 98 },
  ],
  internalNote:
    "Registre LBV confirmé visuellement le 21/05. Pas de mentions marginales. Demande standard, traitement nominal.",
  pipeline: [
    { title: "Réception & contrôle", status: "done", duration: "12 s" },
    { title: "Pré-instruction agent", status: "done", duration: "4 h" },
    { title: "Recherche registre", status: "active" },
    { title: "Visa officier", status: "pending" },
    { title: "Signature & émission", status: "pending" },
    { title: "Archivage probant", status: "pending" },
  ],
}

export const getInstruction = async (ref: string): Promise<InstructionDetail> => {
  void ref
  return INSTRUCTION
}

/* ---------- Dossier citoyen 360° ---------- */

export interface CitizenFolderEntry {
  date: string
  org: string
  title: string
  status: string
  statusTone: Tone
  icon: string
}

export interface CitizenFolderHabilitation {
  org: string
  scope: string
  tone: Tone
}

export interface CitizenFolderStats {
  requests: string
  documentsReceived: string
  openCases: string
  seniority: string
}

export interface CitizenFolder {
  citizen: {
    name: string
    nip: string
    email: string
    phone: string
    address: string
    createdAt: string
    age: string
    birthDate: string
  }
  habilitations: CitizenFolderHabilitation[]
  stats: CitizenFolderStats
  timeline: CitizenFolderEntry[]
}

const CITIZEN_FOLDER: CitizenFolder = {
  citizen: {
    name: "Marie Estelle OBAME",
    nip: "184 12 76 005 042",
    email: "marie.obame@id.gouv.ga",
    phone: "+241 06 24 18 33",
    address: "BP 8112, Akanda",
    createdAt: "12 octobre 2023",
    age: "Née le 14 mars 1992 · 34 ans",
    birthDate: "14 mars 1992",
  },
  habilitations: [
    { org: "DG État Civil", scope: "Lecture/Écriture", tone: "primary" },
    { org: "DG Documentation", scope: "Lecture", tone: "neutral" },
    { org: "Min. Justice", scope: "Lecture (B3)", tone: "neutral" },
    { org: "CNAMGS", scope: "Lecture (rev.)", tone: "neutral" },
  ],
  stats: {
    requests: "14",
    documentsReceived: "32",
    openCases: "3",
    seniority: "2 ans 7 m",
  },
  timeline: [
    {
      date: "20 mai 2026",
      org: "DG État Civil",
      title: "Demande acte de naissance · GC-EC-002841",
      status: "En cours",
      statusTone: "active",
      icon: "fileText",
    },
    {
      date: "14 mai 2026",
      org: "DG Documentation",
      title: "Demande renouvellement passeport · GC-DI-019733",
      status: "Pièces demandées",
      statusTone: "warning",
      icon: "fingerprint",
    },
    {
      date: "8 mai 2026",
      org: "Min. Justice",
      title: "Extrait casier B3 · GC-JU-007612",
      status: "Délivré",
      statusTone: "archived",
      icon: "shield",
    },
    {
      date: "12 mars 2026",
      org: "CNAMGS",
      title: "Affiliation salariée actualisée",
      status: "Validée",
      statusTone: "archived",
      icon: "shieldCheck",
    },
    {
      date: "02 février 2026",
      org: "DGI",
      title: "Déclaration IRPP 2025",
      status: "Acceptée",
      statusTone: "archived",
      icon: "dollarSign",
    },
    {
      date: "14 octobre 2025",
      org: "Mairie de Libreville",
      title: "Certificat de résidence",
      status: "Délivré",
      statusTone: "archived",
      icon: "home",
    },
  ],
}

export const getCitizenFolder = async (nip: string): Promise<CitizenFolder> => {
  void nip
  return CITIZEN_FOLDER
}

/* ---------- Génération de document (A5) ---------- */

const TEMPLATE_VARIABLES: TemplateVariable[] = [
  { key: "nom", value: "OBAME", source: "Demande" },
  { key: "prenoms", value: "Marie Estelle", source: "Demande" },
  { key: "date_naissance", value: "14 mars 1992", source: "Registre" },
  { key: "heure_naissance", value: "03 h 22", source: "Registre" },
  { key: "lieu_naissance", value: "Libreville, Estuaire", source: "Registre" },
  { key: "pere", value: "OBAME Jean-Pierre, instituteur", source: "Registre" },
  { key: "mere", value: "MBOUMBA Antoinette, sage-femme", source: "Registre" },
  { key: "mentions", value: "Néant", source: "Registre" },
  { key: "numero_acte", value: "EC-LBV-1992-04812", source: "Registre" },
]

export const getTemplateVariables = async (): Promise<TemplateVariable[]> =>
  TEMPLATE_VARIABLES

/* ---------- Correspondance (A6) ---------- */

const CORRESPONDENCES: Correspondence[] = [
  {
    ref: "CR-2026-1842",
    from: "DG Documentation",
    subject: "Demande d'authentification d'acte",
    when: "il y a 12 min",
    unread: true,
    attachments: 1,
    urgent: true,
  },
  {
    ref: "CR-2026-1839",
    from: "Min. Justice",
    subject: "Vérification de filiation — extrait",
    when: "il y a 2 h",
    unread: true,
    attachments: 2,
  },
  {
    ref: "CR-2026-1834",
    from: "CNAMGS",
    subject: "Mise à jour identité bénéficiaire",
    when: "il y a 4 h",
    unread: true,
    attachments: 0,
  },
  {
    ref: "CR-2026-1828",
    from: "Mairie de Libreville",
    subject: "Transfert dossier transcription",
    when: "hier",
    unread: false,
    attachments: 3,
  },
  {
    ref: "CR-2026-1819",
    from: "DGI",
    subject: "Confirmation d'identité fiscale",
    when: "hier",
    unread: false,
    attachments: 0,
  },
  {
    ref: "CR-2026-1814",
    from: "ANPI-Gabon",
    subject: "Vérification mandataire RCCM",
    when: "il y a 2 j",
    unread: false,
    attachments: 1,
  },
  {
    ref: "CR-2026-1801",
    from: "DG Documentation",
    subject: "Réponse · acte EC-LBV-2025-12044",
    when: "il y a 3 j",
    unread: false,
    attachments: 0,
  },
]

export const getCorrespondences = async (): Promise<Correspondence[]> => CORRESPONDENCES

/* ---------- Archives SAE (A7) ---------- */

const ARCHIVES: ArchiveItem[] = [
  {
    cote: "GA/EC/2026/04812",
    description: "Acte de naissance · OBAME Marie Estelle",
    producer: "DG État Civil",
    versedAt: "28/05/2026",
    dua: "Indéf.",
    status: "Actif",
    statusTone: "active",
    finalSort: "Conservation définitive",
    hash: "8a3c5e…d09f",
  },
  {
    cote: "GA/EC/2026/04783",
    description: "Acte de mariage · MOUNGUENGUI / OYANE",
    producer: "DG État Civil",
    versedAt: "24/05/2026",
    dua: "Indéf.",
    status: "Actif",
    statusTone: "active",
    finalSort: "Conservation définitive",
    hash: "b2f1c7…91d8",
  },
  {
    cote: "GA/EC/2026/04772",
    description: "Acte de décès · NZOGHE Paul",
    producer: "DG État Civil",
    versedAt: "22/05/2026",
    dua: "75 ans",
    status: "Semi-actif",
    statusTone: "semi",
    finalSort: "Conservation définitive",
    hash: "4d8e2b…7f3c",
  },
  {
    cote: "GA/JU/2026/01184",
    description: "Casier judiciaire · OBAME Marie · B3",
    producer: "Min. Justice",
    versedAt: "21/05/2026",
    dua: "3 mois",
    status: "Actif",
    statusTone: "active",
    finalSort: "Élimination 21/08/26",
    hash: "c5b9a1…6e2f",
  },
  {
    cote: "GA/DI/2026/19733",
    description: "Dossier passeport · OBAME Marie · 1ère demande",
    producer: "DG Documentation",
    versedAt: "20/05/2026",
    dua: "10 ans",
    status: "Actif",
    statusTone: "active",
    finalSort: "Élimination 2036",
    hash: "e7d4f3…b1a8",
  },
  {
    cote: "GA/EC/2022/14829",
    description: "Registre N de Libreville · trimestre 2022",
    producer: "Mairie Libreville",
    versedAt: "14/02/2023",
    dua: "Indéf.",
    status: "Archivé",
    statusTone: "archived",
    finalSort: "Conservation définitive",
    hash: "1a9b6c…d4e2",
  },
  {
    cote: "GA/EC/2019/02145",
    description: "Dossier d'adoption · KOMBILA J.",
    producer: "DG État Civil",
    versedAt: "08/11/2019",
    dua: "120 ans",
    status: "Semi-actif",
    statusTone: "semi",
    finalSort: "Conservation définitive",
    hash: "f6e1d2…8b3a",
  },
]

export const getArchives = async (): Promise<ArchiveItem[]> => ARCHIVES

const COMPLIANCE: ComplianceRule[] = [
  {
    title: "Horodatage qualifié (RFC 3161)",
    description: "Tous les versements horodatés.",
    ok: true,
  },
  {
    title: "Empreintes SHA-256",
    description: "Recalculées toutes les 24h.",
    ok: true,
  },
  {
    title: "Journal d'événements scellé",
    description: "186 472 lignes · scellement quotidien.",
    ok: true,
  },
  {
    title: "Réplication géographique",
    description: "Owendo (primaire) + Mvengue (secours).",
    ok: true,
  },
  {
    title: "Audit annuel BSI",
    description: "Prochaine échéance : nov. 2026.",
    ok: true,
  },
]

export const getCompliance = async (): Promise<ComplianceRule[]> => COMPLIANCE

export interface EliminationLot {
  title: string
  count: number
  sort: string
}

const ELIMINATION_LOTS: EliminationLot[] = [
  { title: "Casiers judiciaires expirés (T1 2026)", count: 142, sort: "Destruction physique" },
  { title: "Demandes passeport non abouties", count: 84, sort: "Destruction logique" },
  { title: "Brouillons d'actes annulés", count: 124, sort: "Destruction logique" },
  { title: "Notifications expirées > 90 j", count: 62, sort: "Destruction logique" },
]

export const getEliminationLots = async (): Promise<EliminationLot[]> => ELIMINATION_LOTS

/* ---------- Catalogue services (A8) ---------- */

const SERVICES: ServiceCatalogEntry[] = [
  {
    title: "Acte de naissance · copie intégrale",
    category: "État civil",
    status: "Publié",
    statusTone: "archived",
    requests30d: 184,
    delay: "1 j 14 h",
    satisfaction: "4,7",
    fee: "Gratuit",
    updatedAt: "il y a 12 j",
  },
  {
    title: "Acte de naissance · extrait",
    category: "État civil",
    status: "Publié",
    statusTone: "archived",
    requests30d: 142,
    delay: "1 j 12 h",
    satisfaction: "4,7",
    fee: "Gratuit",
    updatedAt: "il y a 12 j",
  },
  {
    title: "Acte de mariage",
    category: "État civil",
    status: "Publié",
    statusTone: "archived",
    requests30d: 68,
    delay: "2 j",
    satisfaction: "4,6",
    fee: "Gratuit",
    updatedAt: "il y a 28 j",
  },
  {
    title: "Certificat de nationalité",
    category: "État civil",
    status: "Publié",
    statusTone: "archived",
    requests30d: 52,
    delay: "6 j",
    satisfaction: "4,2",
    fee: "3 000 FCFA",
    updatedAt: "il y a 2 mois",
  },
  {
    title: "Acte de décès",
    category: "État civil",
    status: "Publié",
    statusTone: "archived",
    requests30d: 26,
    delay: "1 j 8 h",
    satisfaction: "4,5",
    fee: "Gratuit",
    updatedAt: "il y a 18 j",
  },
  {
    title: "Légalisation de signature",
    category: "État civil",
    status: "Publié",
    statusTone: "archived",
    requests30d: 14,
    delay: "6 h",
    satisfaction: "4,8",
    fee: "500 FCFA",
    updatedAt: "il y a 3 j",
  },
  {
    title: "Transcription d'acte étranger",
    category: "État civil",
    status: "Brouillon",
    statusTone: "neutral",
    requests30d: 0,
    delay: "—",
    satisfaction: "—",
    fee: "5 000 FCFA",
    updatedAt: "il y a 6 j",
  },
  {
    title: "Rectification d'acte",
    category: "État civil",
    status: "Brouillon",
    statusTone: "neutral",
    requests30d: 0,
    delay: "—",
    satisfaction: "—",
    fee: "2 500 FCFA",
    updatedAt: "il y a 14 j",
  },
]

export const getAdminServices = async (): Promise<ServiceCatalogEntry[]> => SERVICES

/* ---------- Annuaire (A9) ---------- */

const DIRECTORY: DirectoryAdminEntry[] = [
  {
    name: "Direction Gén. de la Documentation",
    category: "Direction générale",
    tutelage: "Min. Intérieur",
    servicesCount: 8,
    referent: "Capt. F. MBOUMBA",
    connection: "API + SSO",
  },
  {
    name: "Ministère de la Justice",
    category: "Ministère",
    tutelage: "Présidence",
    servicesCount: 6,
    referent: "M. R. NDOMBET",
    connection: "API + SSO",
  },
  {
    name: "ANPI-Gabon",
    category: "Établissement public",
    tutelage: "Min. Économie",
    servicesCount: 11,
    referent: "Mme L. EYANG",
    connection: "API + SSO",
  },
  {
    name: "Direction Gén. des Impôts",
    category: "Direction générale",
    tutelage: "Min. Économie",
    servicesCount: 9,
    referent: "M. P. NGUEMA",
    connection: "API + SSO",
  },
  {
    name: "CNAMGS",
    category: "Établissement public",
    tutelage: "Min. Santé",
    servicesCount: 7,
    referent: "Dr A. BIYOGHE",
    connection: "API + SSO",
  },
  {
    name: "Mairie de Libreville",
    category: "Collectivité",
    tutelage: "Autonome",
    servicesCount: 12,
    referent: "Mme C. MABIKA",
    connection: "Portail",
  },
  {
    name: "CNSS",
    category: "Établissement public",
    tutelage: "Min. Travail",
    servicesCount: 8,
    referent: "M. T. ELLA",
    connection: "API + SSO",
  },
  {
    name: "DG Archives Nationales",
    category: "Direction générale",
    tutelage: "Min. Culture",
    servicesCount: 4,
    referent: "Mme A. OKEMBA",
    connection: "API + SSO",
  },
  {
    name: "Police Nationale",
    category: "Direction générale",
    tutelage: "Min. Intérieur",
    servicesCount: 3,
    referent: "Col. M. BEKALE",
    connection: "API + SSO",
  },
]

export const getAdminDirectory = async (): Promise<DirectoryAdminEntry[]> => DIRECTORY
