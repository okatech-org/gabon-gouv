import type { SidebarItem } from "@workspace/ui"

export const PLATFORM_NAV: SidebarItem[] = [
  { id: "home", label: "Supervision", icon: "activity", href: "/" },
  { id: "orgs", label: "Organisations", icon: "building", count: 47, href: "/organisations" },
  { id: "svc", label: "Catalogue services", icon: "layers", count: 128 },
  { id: "cit", label: "Citoyens", icon: "users" },
  { id: "stats", label: "Statistiques", icon: "barChart", href: "/statistiques" },
  { section: "Plateforme" },
  { id: "infra", label: "Infrastructure", icon: "server" },
  { id: "sec", label: "Sécurité & audit", icon: "shield" },
  { id: "onboard", label: "Onboarding", icon: "userCheck", href: "/onboarding" },
  { id: "params", label: "Paramètres", icon: "settings" },
]
