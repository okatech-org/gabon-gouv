import type {
  OnboardingPerson,
  OnboardingStep,
  OnboardingTargetOrg,
  OrgVolumeRow,
  PlatformActivity,
  PlatformHealth,
  PlatformKpi,
  PlatformOrgRow,
  ProvinceStat,
  TopDemandStat,
} from "./types"

/* ---------- Profil ---------- */

export const getCurrentPlatformUser = async () => ({
  name: "Hervé MOUSSAVOU",
  role: "Admin plateforme",
  org: "Gabon Connect · Console plateforme",
})

/* ---------- KPI ---------- */

const KPIS: PlatformKpi[] = [
  { label: "Organismes actifs", value: "47", icon: "building", hint: "+ 3 ce mois", accent: true },
  { label: "Services publiés", value: "128", icon: "layers", delta: "+11", deltaTone: "success" },
  { label: "Demandes 7 j", value: "14 218", icon: "inbox", delta: "+8 %", deltaTone: "success" },
  {
    label: "Citoyens actifs",
    value: "318 042",
    icon: "users",
    delta: "+12 %",
    deltaTone: "success",
  },
  { label: "Documents émis", value: "9 184", icon: "fileText", hint: "depuis lundi" },
  { label: "Délai moyen", value: "2 j 14 h", icon: "clock", delta: "−9 %", deltaTone: "success" },
]

export const getPlatformKpis = async (): Promise<PlatformKpi[]> => KPIS

const VOLUME = [
  1142, 1284, 1208, 1342, 1196, 1418, 1387, 1502, 1378, 1486, 1572, 1448, 1614, 1538, 1496,
  1742, 1684, 1612, 1842, 1768, 1714, 1928, 1874, 1782, 2046, 2014, 1862, 2184, 2128, 2218,
]

export const getPlatformVolume = async (): Promise<number[]> => VOLUME

const HEALTH: PlatformHealth[] = [
  { title: "API publique", description: "/v1 · 99,998 % · 47 ms", status: "ok" },
  { title: "Identité numérique", description: "RGPP · 99,87 %", status: "ok" },
  { title: "SAE Archives", description: "NF Z42-013 · 100 %", status: "ok" },
  { title: "Messagerie inter-admin", description: "S/MIME · 99,99 %", status: "ok" },
  { title: "Génération PDF", description: "4 nœuds · 124 req/s", status: "ok" },
  { title: "CDN Gabon", description: "Owendo + Mvengue", status: "warning" },
]

export const getPlatformHealth = async (): Promise<PlatformHealth[]> => HEALTH

const ORG_VOLUMES: OrgVolumeRow[] = [
  {
    name: "DG État Civil",
    volume: 3142,
    services: 14,
    delay: "1 j 18 h",
    satisfaction: "4,7",
    capacity: 72,
    status: "OK",
    statusTone: "archived",
  },
  {
    name: "DG Documentation",
    volume: 2418,
    services: 8,
    delay: "5 j 14 h",
    satisfaction: "4,3",
    capacity: 88,
    status: "OK",
    statusTone: "archived",
  },
  {
    name: "DGI",
    volume: 1842,
    services: 9,
    delay: "3 j 8 h",
    satisfaction: "4,1",
    capacity: 64,
    status: "OK",
    statusTone: "archived",
  },
  {
    name: "Min. Justice",
    volume: 1612,
    services: 6,
    delay: "2 j 4 h",
    satisfaction: "4,5",
    capacity: 56,
    status: "OK",
    statusTone: "archived",
  },
  {
    name: "ANPI-Gabon",
    volume: 1284,
    services: 11,
    delay: "2 j 12 h",
    satisfaction: "4,6",
    capacity: 48,
    status: "OK",
    statusTone: "archived",
  },
  {
    name: "CNAMGS",
    volume: 1042,
    services: 7,
    delay: "4 j",
    satisfaction: "4,2",
    capacity: 91,
    status: "Charge",
    statusTone: "warning",
  },
  {
    name: "Mairie de Libreville",
    volume: 924,
    services: 12,
    delay: "2 j 18 h",
    satisfaction: "4,4",
    capacity: 68,
    status: "OK",
    statusTone: "archived",
  },
  {
    name: "CNSS",
    volume: 868,
    services: 8,
    delay: "4 j 14 h",
    satisfaction: "4,0",
    capacity: 74,
    status: "OK",
    statusTone: "archived",
  },
]

export const getPlatformOrgVolumes = async (): Promise<OrgVolumeRow[]> => ORG_VOLUMES

const PLATFORM_ACTIVITY: PlatformActivity[] = [
  {
    who: "DG État Civil",
    action: "a publié",
    what: "Légalisation de signature",
    when: "il y a 18 min",
    icon: "layers",
  },
  {
    who: "ANPI-Gabon",
    action: "a modifié",
    what: "Workflow RCCM v3.1",
    when: "il y a 1 h",
    icon: "edit",
  },
  {
    who: "Y. MAGANGA (admin)",
    action: "a accordé l'accès à",
    what: "DG Tourisme",
    when: "il y a 3 h",
    icon: "userCheck",
  },
  {
    who: "Système",
    action: "a scellé",
    what: "14 218 demandes",
    when: "il y a 4 h",
    icon: "shieldCheck",
  },
  {
    who: "DG Impôts",
    action: "a connecté",
    what: "API e-Bilan",
    when: "hier",
    icon: "externalLink",
  },
  {
    who: "Min. Justice",
    action: "a archivé",
    what: "412 dossiers (B3)",
    when: "hier",
    icon: "archive",
  },
]

export const getPlatformActivity = async (): Promise<PlatformActivity[]> => PLATFORM_ACTIVITY

/* ---------- Organisations (P2) ---------- */

const ORGS: PlatformOrgRow[] = [
  {
    name: "Direction Gén. de l'État Civil",
    category: "Direction générale",
    province: "Estuaire",
    status: "Active",
    statusTone: "archived",
    connection: "API + SSO",
    services: 14,
    volume: "12 184",
    signedAt: "03/2024",
  },
  {
    name: "Direction Gén. de la Documentation",
    category: "Direction générale",
    province: "Estuaire",
    status: "Active",
    statusTone: "archived",
    connection: "API + SSO",
    services: 8,
    volume: "9 842",
    signedAt: "03/2024",
  },
  {
    name: "Ministère de la Justice",
    category: "Ministère",
    province: "Estuaire",
    status: "Active",
    statusTone: "archived",
    connection: "API + SSO",
    services: 6,
    volume: "6 218",
    signedAt: "04/2024",
  },
  {
    name: "ANPI-Gabon",
    category: "Établissement public",
    province: "Estuaire",
    status: "Active",
    statusTone: "archived",
    connection: "API + SSO",
    services: 11,
    volume: "5 144",
    signedAt: "05/2024",
  },
  {
    name: "Direction Gén. des Impôts",
    category: "Direction générale",
    province: "Estuaire",
    status: "Active",
    statusTone: "archived",
    connection: "API + SSO",
    services: 9,
    volume: "7 412",
    signedAt: "04/2024",
  },
  {
    name: "CNAMGS",
    category: "Établissement public",
    province: "Estuaire",
    status: "Active",
    statusTone: "archived",
    connection: "API + SSO",
    services: 7,
    volume: "4 218",
    signedAt: "06/2024",
  },
  {
    name: "Mairie de Libreville",
    category: "Collectivité",
    province: "Estuaire",
    status: "Active",
    statusTone: "archived",
    connection: "Portail",
    services: 12,
    volume: "3 712",
    signedAt: "01/2025",
  },
  {
    name: "ARSEE · Régulation Énergie",
    category: "Autorité",
    province: "Estuaire",
    status: "Onboarding",
    statusTone: "warning",
    connection: "—",
    services: 0,
    volume: "—",
    signedAt: "En cours",
  },
  {
    name: "Conseil constitutionnel",
    category: "Institution",
    province: "Estuaire",
    status: "Onboarding",
    statusTone: "warning",
    connection: "—",
    services: 0,
    volume: "—",
    signedAt: "En cours",
  },
  {
    name: "DG Tourisme",
    category: "Direction générale",
    province: "Estuaire",
    status: "Onboarding",
    statusTone: "warning",
    connection: "—",
    services: 0,
    volume: "—",
    signedAt: "En cours",
  },
  {
    name: "Mairie de Tchibanga",
    category: "Collectivité",
    province: "Nyanga",
    status: "Suspendue",
    statusTone: "danger",
    connection: "Portail",
    services: 8,
    volume: "—",
    signedAt: "02/2025",
  },
]

export const getPlatformOrgs = async (): Promise<PlatformOrgRow[]> => ORGS

/* ---------- Onboarding (P3) ---------- */

const ONBOARDING_STEPS: OnboardingStep[] = [
  { title: "Identification de l'organisme", status: "done" },
  { title: "Désignation des référents", status: "done" },
  { title: "Habilitations & rôles", status: "done" },
  { title: "Signature de la convention", status: "active" },
  { title: "Catalogue des services", status: "pending" },
  { title: "Tests d'intégration API", status: "pending" },
  { title: "Mise en production", status: "pending" },
]

export const getOnboardingSteps = async (): Promise<OnboardingStep[]> => ONBOARDING_STEPS

const ONBOARDING_TARGET_ORG: OnboardingTargetOrg = {
  denomination:
    "Autorité de Régulation du Secteur de l'Eau potable et de l'Énergie électrique",
  legalForm: "Autorité administrative indépendante",
  acronym: "ARSEE",
  tutelage: "Présidence de la République",
  decree: "n° 2009-1245 du 15 décembre 2009",
  headquarters: "Immeuble Pétro Gabon · Libreville · Estuaire",
  taxId: "739-A-7818-44",
  phone: "+241 01 73 27 90",
}

export const getOnboardingTargetOrg = async (): Promise<OnboardingTargetOrg> =>
  ONBOARDING_TARGET_ORG

const ONBOARDING_REFERENTS: OnboardingPerson[] = [
  {
    name: "M. Théophile NTOUTOUME",
    function: "Directeur général",
    email: "t.ntoutoume@arsee.ga",
    role: "Admin organisme",
    auth: "NIP + carte agent",
  },
  {
    name: "Mme Léa MENGUE",
    function: "Chef du service juridique",
    email: "l.mengue@arsee.ga",
    role: "Agent superviseur",
    auth: "NIP + carte agent",
  },
  {
    name: "M. Eric ASSEKO",
    function: "DSI",
    email: "e.asseko@arsee.ga",
    role: "Admin technique (API)",
    auth: "NIP + clé API",
  },
]

export const getOnboardingReferents = async (): Promise<OnboardingPerson[]> => ONBOARDING_REFERENTS

/* ---------- Stats (P4) ---------- */

const IMPACT_KPIS: PlatformKpi[] = [
  {
    label: "Citoyens inscrits",
    value: "318 042",
    icon: "users",
    delta: "+47 %",
    deltaTone: "success",
    hint: "vs 2025",
    accent: true,
  },
  {
    label: "Démarches dématérialisées",
    value: "72 %",
    icon: "trendingUp",
    delta: "+18 pts",
    deltaTone: "success",
    hint: "objectif PND : 80 %",
  },
  {
    label: "Économies d'usagers",
    value: "184 M FCFA",
    icon: "dollarSign",
    hint: "transport + temps",
  },
  { label: "CO₂ évité", value: "412 t", icon: "zap", hint: "déplacements évités" },
]

export const getImpactKpis = async (): Promise<PlatformKpi[]> => IMPACT_KPIS

const YEAR_VOLUME = [
  8420, 9180, 10240, 11820, 12640, 13180, 14420, 15640, 16240, 17820, 19180, 21420,
]

export const getYearVolume = async (): Promise<number[]> => YEAR_VOLUME

const TOP_DEMANDS: TopDemandStat[] = [
  { title: "Acte de naissance", value: 48214, pct: 100 },
  { title: "CNI / renouvellement", value: 38122, pct: 79 },
  { title: "Passeport biométrique", value: 32184, pct: 67 },
  { title: "Casier judiciaire B3", value: 28412, pct: 59 },
  { title: "Déclaration fiscale IRPP", value: 22184, pct: 46 },
  { title: "Certificat de nationalité", value: 18420, pct: 38 },
  { title: "Affiliation CNAMGS", value: 14218, pct: 30 },
  { title: "Immatriculation RCCM", value: 9142, pct: 19 },
]

export const getTopDemands = async (): Promise<TopDemandStat[]> => TOP_DEMANDS

const PROVINCES: ProvinceStat[] = [
  { province: "Estuaire", value: 142, pct: 100 },
  { province: "Haut-Ogooué", value: 38, pct: 27 },
  { province: "Moyen-Ogooué", value: 22, pct: 15 },
  { province: "Ngounié", value: 26, pct: 18 },
  { province: "Nyanga", value: 14, pct: 10 },
  { province: "Ogooué-Ivindo", value: 12, pct: 8 },
  { province: "Ogooué-Lolo", value: 14, pct: 10 },
  { province: "Ogooué-Maritime", value: 42, pct: 30 },
  { province: "Woleu-Ntem", value: 28, pct: 20 },
]

export const getProvinces = async (): Promise<ProvinceStat[]> => PROVINCES

export const getSatisfactionDistribution = async (): Promise<number[]> => [62, 24, 8, 4, 2]
