import type { SidebarItem } from "@workspace/ui"

export interface SidebarBadges {
  queue?: number
  correspondenceUnread?: number
  signaturesPending?: number
}

/**
 * Nav statique du back-office. Les compteurs (queue, correspondance non lue)
 * viennent de l'agrégat Convex via `getSidebarCounts` — passés en argument
 * depuis le layout (server component).
 */
export function buildAdminNav(badges: SidebarBadges = {}): SidebarItem[] {
  return [
    { id: "home", label: "Tableau de bord", icon: "home", href: "/" },
    {
      id: "queue",
      label: "File de demandes",
      icon: "inbox",
      href: "/demandes",
      count: badges.queue,
    },
    {
      id: "dossiers",
      label: "Dossiers citoyens",
      icon: "folder",
      href: "/dossiers/184127600504",
    },
    {
      id: "signatures",
      label: "Mes signatures",
      icon: "edit",
      href: "/signatures",
      count: badges.signaturesPending,
    },
    {
      id: "documents",
      label: "Génération",
      icon: "fileText",
      href: "/generation/GC-2026-EC-002841",
    },
    { id: "archives", label: "Archives (SAE)", icon: "archive", href: "/archives" },
    {
      id: "correspondance",
      label: "Correspondance",
      icon: "mail",
      href: "/correspondance",
      count: badges.correspondenceUnread,
    },
    { section: "Organisme" },
    { id: "services", label: "Mes services", icon: "layers", href: "/services" },
    { id: "annuaire", label: "Annuaire", icon: "building", href: "/annuaire" },
    { id: "equipe", label: "Équipe", icon: "users", href: "/equipe" },
    { id: "parametres", label: "Paramètres", icon: "settings", href: "/parametres" },
  ]
}

// Compat : nav par défaut sans compteurs (utile pour stories, tests)
export const ADMIN_NAV: SidebarItem[] = buildAdminNav()
