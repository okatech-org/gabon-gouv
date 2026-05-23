import type {
  CitizenMessage,
  CitizenProfile,
  CitizenRecommendation,
  CitizenRequest,
  DashboardStats,
  DirectoryOrg,
  ServiceCategory,
  TopService,
} from "./types"

/* ---------- Profil ---------- */

const CURRENT: CitizenProfile = {
  name: "Marie OBAME",
  email: "marie.obame@id.gouv.ga",
  nip: "1 84 12 76 005 042",
  phone: "+241 06 24 18 33",
  address: "BP 8112, Akanda",
  createdAt: "12 octobre 2023",
  birthDate: "14 mars 1992",
}

export const getCurrentCitizen = async (): Promise<CitizenProfile> => CURRENT

/* ---------- Catalogue ---------- */

const CATEGORIES: ServiceCategory[] = [
  { id: "etat-civil", label: "État civil", icon: "user", count: 14, color: "#1a4480" },
  { id: "identite", label: "Identité & voyage", icon: "fingerprint", count: 8, color: "#2378c3" },
  { id: "justice", label: "Justice", icon: "shield", count: 6, color: "#4a5876" },
  { id: "entreprise", label: "Entreprise", icon: "building", count: 11, color: "#0a6e54" },
  { id: "fiscalite", label: "Fiscalité", icon: "dollarSign", count: 9, color: "#b88600" },
  { id: "logement", label: "Logement & foncier", icon: "home", count: 7, color: "#6b7a96" },
  { id: "mobilite", label: "Mobilité", icon: "mapPin", count: 5, color: "#73b3e7" },
  { id: "social", label: "Famille & social", icon: "users", count: 12, color: "#a3315a" },
]

export const getServiceCategories = async (): Promise<ServiceCategory[]> => CATEGORIES

const TOP_SERVICES: TopService[] = [
  {
    id: "acte-naissance",
    cat: "État civil",
    label: "Demander un acte de naissance",
    org: "Direction Gén. de l'État Civil",
    delay: "48 h",
    online: true,
    fee: "Gratuit",
  },
  {
    id: "cni",
    cat: "Identité",
    label: "Demander une CNI ou son renouvellement",
    org: "Direction Gén. de la Documentation",
    delay: "7 j",
    online: true,
    fee: "5 000 FCFA",
  },
  {
    id: "passeport",
    cat: "Identité",
    label: "Demander un passeport biométrique",
    org: "Direction Gén. de la Documentation",
    delay: "10 j",
    online: true,
    fee: "75 000 FCFA",
  },
  {
    id: "casier",
    cat: "Justice",
    label: "Obtenir un extrait de casier judiciaire (B3)",
    org: "Ministère de la Justice",
    delay: "72 h",
    online: true,
    fee: "1 500 FCFA",
  },
  {
    id: "nationalite",
    cat: "État civil",
    label: "Certificat de nationalité gabonaise",
    org: "Ministère de la Justice",
    delay: "15 j",
    online: true,
    fee: "3 000 FCFA",
  },
  {
    id: "rccm",
    cat: "Entreprise",
    label: "Immatriculer une entreprise (RCCM)",
    org: "CDE / ANPI-Gabon",
    delay: "72 h",
    online: true,
    fee: "15 000 FCFA",
  },
]

export const getTopServices = async (): Promise<TopService[]> => TOP_SERVICES

/* ---------- Dashboard ---------- */

const DASHBOARD_STATS: DashboardStats = {
  inProgress: 3,
  documentsReceived: 12,
  averageDelay: "2 j",
  delayDelta: { value: "−14 %", tone: "success" },
  notifications: 4,
  notificationsHint: "3 non lues",
}

export const getCitizenDashboardStats = async (): Promise<DashboardStats> => DASHBOARD_STATS

const REQUESTS: CitizenRequest[] = [
  {
    id: "002841",
    ref: "GC-2026-EC-002841",
    title: "Acte de naissance · copie intégrale",
    org: "DG État Civil",
    depositedAt: "20 mai 2026",
    status: "En instruction",
    tone: "active",
    progress: 60,
  },
  {
    id: "019733",
    ref: "GC-2026-DI-019733",
    title: "Passeport biométrique · renouvellement",
    org: "DG Documentation",
    depositedAt: "14 mai 2026",
    status: "Pièces demandées",
    tone: "warning",
    progress: 35,
  },
  {
    id: "007612",
    ref: "GC-2026-JU-007612",
    title: "Casier judiciaire · extrait B3",
    org: "Min. Justice",
    depositedAt: "8 mai 2026",
    status: "Prêt à télécharger",
    tone: "archived",
    progress: 100,
  },
]

export const getCitizenRequests = async (): Promise<CitizenRequest[]> => REQUESTS

const RECOMMENDATIONS: CitizenRecommendation[] = [
  {
    id: "cni",
    title: "Renouveler votre CNI",
    description: "Expire dans 8 mois.",
    icon: "fingerprint",
    urgent: true,
  },
  {
    id: "demenagement",
    title: "Déclarer un déménagement",
    description: "Mise à jour de votre adresse.",
    icon: "mapPin",
  },
  {
    id: "enfant",
    title: "Inscrire un enfant à l'état civil",
    description: "Naissance déclarée le 12/04/26.",
    icon: "users",
  },
  {
    id: "residence",
    title: "Demander un certificat de résidence",
    description: "Souvent demandé.",
    icon: "home",
  },
]

export const getCitizenRecommendations = async (): Promise<CitizenRecommendation[]> =>
  RECOMMENDATIONS

const MESSAGES: CitizenMessage[] = [
  {
    id: "msg-1",
    who: "DG Documentation",
    when: "il y a 2 h",
    title: "Pièce manquante — passeport",
    description: "Merci de joindre le justificatif de domicile actualisé.",
    unread: true,
  },
  {
    id: "msg-2",
    who: "Min. Justice",
    when: "hier",
    title: "Votre extrait B3 est prêt",
    description: "Téléchargez-le depuis votre espace.",
    unread: false,
  },
  {
    id: "msg-3",
    who: "Gabon Connect",
    when: "il y a 3 j",
    title: "Maintenance planifiée",
    description: "Le 28 mai entre 2h et 4h du matin.",
    unread: false,
  },
]

export const getCitizenMessages = async (): Promise<CitizenMessage[]> => MESSAGES

/* ---------- Stats publiques (hero homepage) ---------- */

export interface HomeStat {
  value: string
  label: string
}

const HOME_STATS: HomeStat[] = [
  { value: "128", label: "Services disponibles" },
  { value: "47", label: "Administrations" },
  { value: "312 480", label: "Demandes traitées en 2025" },
  { value: "2 j 14 h", label: "Délai moyen de traitement" },
]

export const getHomeStats = async (): Promise<HomeStat[]> => HOME_STATS

/* ---------- Service detail (acte de naissance) ---------- */

export interface ServiceVariant {
  title: string
  description: string
  who: string
  highlight?: boolean
  highlightLabel?: string
}

export interface ServicePiece {
  title: string
  description: string
  required: boolean
  auto: boolean
}

export interface ServiceFAQ {
  question: string
  open?: boolean
}

export interface ServiceDetail {
  category: string
  title: string
  description: string
  org: string
  delay: string
  cost: string
  mode: string
  variants: ServiceVariant[]
  pieces: ServicePiece[]
  faq: ServiceFAQ[]
  related: string[]
}

const SERVICE_BIRTH_CERTIFICATE: ServiceDetail = {
  category: "État civil",
  title: "Demander un acte de naissance",
  description:
    "L'acte de naissance est un document d'état civil délivré par votre commune de naissance. Vous pouvez en demander une copie intégrale, un extrait avec filiation ou un extrait sans filiation.",
  org: "Direction Gén. de l'État Civil",
  delay: "48 heures",
  cost: "Gratuit",
  mode: "100% en ligne",
  variants: [
    {
      title: "Copie intégrale",
      description:
        "Reproduit l'intégralité de l'acte avec toutes les mentions marginales.",
      who: "L'intéressé majeur, ses ascendants/descendants.",
      highlight: true,
      highlightLabel: "Le plus demandé",
    },
    {
      title: "Extrait avec filiation",
      description: "Mentionne les noms des parents.",
      who: "Démarches mariage, succession, nationalité.",
    },
    {
      title: "Extrait sans filiation",
      description: "Sans mention des parents.",
      who: "Toute personne (à partir de l'acte original).",
    },
  ],
  pieces: [
    {
      title: "Pièce d'identité du demandeur",
      description: "CNI, passeport ou permis de conduire en cours de validité.",
      required: true,
      auto: true,
    },
    {
      title: "Justificatif du lien de filiation",
      description: "Livret de famille ou acte de naissance des parents.",
      required: false,
      auto: false,
    },
    {
      title: "Mandat signé",
      description: "Si vous effectuez la demande pour un tiers.",
      required: false,
      auto: false,
    },
  ],
  faq: [
    { question: "Mon acte n'est pas trouvé, que faire ?", open: true },
    { question: "Combien de copies puis-je commander ?" },
    { question: "L'acte numérique a-t-il la même valeur que le papier ?" },
    { question: "Comment vérifier l'authenticité d'un acte ?" },
  ],
  related: [
    "Livret de famille",
    "Certificat de nationalité",
    "Acte de mariage",
    "Acte de décès",
  ],
}

export const getServiceDetail = async (slug: string): Promise<ServiceDetail> => {
  // Une seule fiche détaillée pour la maquette ; les autres slugs renvoient la même.
  void slug
  return SERVICE_BIRTH_CERTIFICATE
}

/* ---------- Suivi de demande ---------- */

export interface TrackingEvent {
  title: string
  date: string
  status: "done" | "active" | "pending"
  log: string
  who?: string
}

export interface TrackingExchange {
  from: string
  when: string
  description: string
  me: boolean
}

export interface TrackingDetail {
  ref: string
  title: string
  subtitle: string
  status: string
  statusTone: import("../../ui/src/types").Tone
  progress: number
  estimatedDelay: string
  agent: string
  events: TrackingEvent[]
  exchanges: TrackingExchange[]
  files: string[]
}

const TRACKING: TrackingDetail = {
  ref: "GC-2026-EC-002841",
  title: "Acte de naissance · copie intégrale",
  subtitle: "Demande déposée le 20 mai 2026 · DG État Civil",
  status: "En instruction",
  statusTone: "active",
  progress: 60,
  estimatedDelay: "~ 1 j",
  agent: "Y. NGUEMA",
  events: [
    {
      title: "Demande déposée",
      date: "20 mai 2026 · 14:32",
      status: "done",
      log: "Vos pièces ont été validées automatiquement.",
      who: "Vous",
    },
    {
      title: "Récépissé scellé émis",
      date: "20 mai 2026 · 14:32",
      status: "done",
      log: "Empreinte SHA-256 · 8a3c…d09f",
      who: "Système",
    },
    {
      title: "Pré-instruction agent",
      date: "21 mai 2026 · 09:15",
      status: "done",
      log: "Dossier transmis à l'agent Mme NGUEMA.",
      who: "DG État Civil",
    },
    {
      title: "Vérification au registre",
      date: "En cours · ~24 h restantes",
      status: "active",
      log: "Recherche de l'acte source dans le registre de Libreville.",
      who: "Agent en charge",
    },
    {
      title: "Signature de l'acte",
      date: "À venir",
      status: "pending",
      log: "Par l'officier d'état civil.",
    },
    {
      title: "Notification + téléchargement",
      date: "À venir",
      status: "pending",
      log: "Vous serez notifié par e-mail.",
    },
  ],
  exchanges: [
    {
      from: "DG État Civil · Mme Yolande NGUEMA",
      when: "21 mai · 14:08",
      description:
        "Bonjour Marie, je prends en charge votre dossier. La vérification du registre prendra environ 24h, je reviens vers vous dès demain.",
      me: false,
    },
    {
      from: "Vous",
      when: "20 mai · 14:35",
      description:
        "Bonjour, merci beaucoup. Aurai-je besoin de me déplacer en mairie ?",
      me: true,
    },
  ],
  files: ["Récépissé scellé.pdf", "CNI_obame.pdf", "livret_famille.pdf"],
}

export const getTrackingDetail = async (ref: string): Promise<TrackingDetail> => {
  void ref
  return TRACKING
}

/* ---------- Document reçu ---------- */

export interface DocumentMetaItem {
  label: string
  value: string
}

export interface DocumentDetail {
  title: string
  citizenName: string
  deliveredAt: string
  org: string
  actNumber: string
  commune: string
  year: string
  signatory: string
  signedAt: string
  meta: DocumentMetaItem[]
  hash: string
  timestamp: string
  signature: string
  verificationCode: string
}

const DOCUMENT_BIRTH: DocumentDetail = {
  title: "Acte de naissance · Marie Estelle OBAME",
  citizenName: "OBAME Marie Estelle",
  deliveredAt: "28 mai 2026",
  org: "DG État Civil",
  actNumber: "EC-LBV-2026-04812",
  commune: "Libreville",
  year: "1992",
  signatory: "P. MOUSSAVOU",
  signedAt: "Libreville, le 28 mai 2026",
  meta: [
    { label: "Nom", value: "OBAME" },
    { label: "Prénoms", value: "Marie Estelle" },
    { label: "Sexe", value: "Féminin" },
    { label: "Né(e) le", value: "14 mars 1992 à 03 h 22" },
    { label: "À", value: "Libreville, province de l'Estuaire" },
    { label: "Fils/Fille de", value: "OBAME Jean-Pierre, instituteur" },
    { label: "Et de", value: "MBOUMBA Antoinette, sage-femme" },
    { label: "Mentions marginales", value: "— Néant —" },
  ],
  hash: "8a3c5e7b9f1d4c2a6e8b3d7f5a9c1e2d4b6f8a0c5e7d9b3f1a4c6e8d2b5f9a7c",
  timestamp: "28 mai 2026 · 16:47:22 UTC+1",
  signature: "P. MOUSSAVOU · Officier d'état civil · DG État Civil",
  verificationCode: "GC-EC-4812",
}

export const getDocument = async (ref: string): Promise<DocumentDetail> => {
  void ref
  return DOCUMENT_BIRTH
}

/* ---------- Annuaire des administrations (vue citoyen) ---------- */

const DIRECTORY: DirectoryOrg[] = [
  {
    name: "Direction Générale de l'État Civil",
    category: "Direction générale",
    servicesCount: 14,
    theme: "État civil",
    icon: "user",
    delay: "48 h",
    tone: "#1a4480",
  },
  {
    name: "Direction Gén. de la Documentation",
    category: "Direction générale",
    servicesCount: 8,
    theme: "Identité & voyage",
    icon: "fingerprint",
    delay: "7 j",
    tone: "#2378c3",
  },
  {
    name: "Ministère de la Justice",
    category: "Ministère",
    servicesCount: 6,
    theme: "Justice",
    icon: "shield",
    delay: "72 h",
    tone: "#4a5876",
  },
  {
    name: "ANPI-Gabon · Centre des entreprises",
    category: "Établissement public",
    servicesCount: 11,
    theme: "Entreprise",
    icon: "building",
    delay: "72 h",
    tone: "#0a6e54",
  },
  {
    name: "Direction Générale des Impôts",
    category: "Direction générale",
    servicesCount: 9,
    theme: "Fiscalité",
    icon: "dollarSign",
    delay: "5 j",
    tone: "#b88600",
  },
  {
    name: "CNAMGS",
    category: "Établissement public",
    servicesCount: 7,
    theme: "Santé & social",
    icon: "shieldCheck",
    delay: "4 j",
    tone: "#a3315a",
  },
  {
    name: "Mairie de Libreville",
    category: "Collectivité",
    servicesCount: 12,
    theme: "Vie locale",
    icon: "home",
    delay: "3 j",
    tone: "#6b7a96",
  },
  {
    name: "CNSS",
    category: "Établissement public",
    servicesCount: 8,
    theme: "Travail & retraite",
    icon: "users",
    delay: "5 j",
    tone: "#1f6e75",
  },
  {
    name: "DG Archives Nationales",
    category: "Direction générale",
    servicesCount: 4,
    theme: "Patrimoine",
    icon: "archive",
    delay: "7 j",
    tone: "#5b3aa3",
  },
]

export const getDirectoryOrgs = async (): Promise<DirectoryOrg[]> => DIRECTORY

export const DIRECTORY_FILTERS = [
  "Tous (47)",
  "Ministères (18)",
  "Directions générales (14)",
  "Établissements publics (9)",
  "Collectivités (6)",
] as const
