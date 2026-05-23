import type { SidebarItem } from "@workspace/ui"

export interface SidebarBadges {
  orgs?: number
  services?: number
  onboarding?: number
}

/**
 * Nav statique de la console plateforme. Les compteurs (orgs, services,
 * onboarding) viennent des agrégats Convex via `getSidebarCounts`, passés
 * en argument depuis le shell layout (server component).
 */
export function buildPlatformNav(badges: SidebarBadges = {}): SidebarItem[] {
  return [
    { id: "home", label: "Supervision", icon: "activity", href: "/" },
    {
      id: "orgs",
      label: "Organisations",
      icon: "building",
      count: badges.orgs,
      href: "/organisations",
    },
    {
      id: "svc",
      label: "Catalogue services",
      icon: "layers",
      count: badges.services,
    },
    { id: "cit", label: "Citoyens", icon: "users" },
    { id: "stats", label: "Statistiques", icon: "barChart", href: "/statistiques" },
    { section: "Plateforme" },
    { id: "infra", label: "Infrastructure", icon: "server" },
    { id: "sec", label: "Sécurité & audit", icon: "shield" },
    {
      id: "onboard",
      label: "Onboarding",
      icon: "userCheck",
      href: "/onboarding",
      count: badges.onboarding,
    },
    { id: "params", label: "Paramètres", icon: "settings" },
  ]
}

// Compat : nav par défaut sans compteurs (stories, tests)
export const PLATFORM_NAV: SidebarItem[] = buildPlatformNav()
