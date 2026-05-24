import type { SidebarItem } from "@workspace/ui"

export interface CitizenNavCounts {
  requestsInProgress?: number
  documentsReceived?: number
  unreadMessages?: number
}

export const buildCitizenNav = ({
  requestsInProgress,
  documentsReceived,
  unreadMessages,
}: CitizenNavCounts = {}): SidebarItem[] => [
  { id: "home", label: "Accueil", icon: "home", href: "/mon-espace" },
  {
    id: "demarches",
    label: "Mes demandes",
    icon: "inbox",
    count: requestsInProgress,
    href: "/mon-espace/demarches/GC-2026-EC-002841",
  },
  {
    id: "documents",
    label: "Mes documents",
    icon: "fileText",
    count: documentsReceived,
    href: "/mon-espace/documents/EC-LBV-2026-04812",
  },
  { id: "dossier", label: "Mon dossier", icon: "folder", href: "/mon-espace/dossier" },
  {
    id: "messages",
    label: "Messages",
    icon: "mail",
    count: unreadMessages,
    href: "/mon-espace/messages",
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
