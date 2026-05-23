import type { SidebarItem } from "@workspace/ui"

export const ADMIN_NAV: SidebarItem[] = [
  { id: "home", label: "Tableau de bord", icon: "home", href: "/" },
  { id: "queue", label: "File de demandes", icon: "inbox", count: 47, href: "/demandes" },
  { id: "dossiers", label: "Dossiers citoyens", icon: "folder", href: "/dossiers/184127600504" },
  { id: "documents", label: "Génération", icon: "fileText", href: "/generation/GC-2026-EC-002841" },
  { id: "archives", label: "Archives (SAE)", icon: "archive", href: "/archives" },
  {
    id: "correspondance",
    label: "Correspondance",
    icon: "mail",
    count: 3,
    href: "/correspondance",
  },
  { section: "Organisme" },
  { id: "services", label: "Mes services", icon: "layers", href: "/services" },
  { id: "annuaire", label: "Annuaire", icon: "building", href: "/annuaire" },
  { id: "equipe", label: "Équipe", icon: "users" },
  { id: "parametres", label: "Paramètres", icon: "settings" },
]
