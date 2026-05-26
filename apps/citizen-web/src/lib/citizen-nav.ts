import type { SidebarItem } from "@workspace/ui"

export interface CitizenNavCounts {
  requestsInProgress?: number
  documentsReceived?: number
  unreadMessages?: number
  unreadCorrespondences?: number
}

export const buildCitizenNav = ({
  requestsInProgress,
  documentsReceived,
  unreadMessages,
  unreadCorrespondences,
}: CitizenNavCounts = {}): SidebarItem[] => [
  { id: "home", label: "Accueil", icon: "home", href: "/mon-espace" },
  {
    id: "demarches",
    label: "Mes demandes",
    icon: "inbox",
    count: requestsInProgress,
    href: "/mon-espace/demarches",
  },
  {
    id: "documents",
    label: "Mes documents",
    icon: "fileText",
    count: documentsReceived,
    href: "/mon-espace/documents",
  },
  { id: "dossier", label: "Mon dossier", icon: "folder", href: "/mon-espace/dossier" },
  {
    id: "messages",
    label: "Messages",
    icon: "mail",
    count: unreadMessages,
    href: "/mon-espace/messages",
  },
  {
    id: "courriers",
    label: "Courriers officiels",
    icon: "fileText",
    count: unreadCorrespondences,
    href: "/mon-espace/courriers",
  },
  { section: "Compte" },
  { id: "profil", label: "Mes informations", icon: "user", href: "/mon-espace/profil" },
  {
    id: "identite",
    label: "Identité numérique",
    icon: "fingerprint",
    href: "/mon-espace/identite",
  },
  {
    id: "parametres",
    label: "Paramètres",
    icon: "settings",
    href: "/mon-espace/parametres",
  },
]
