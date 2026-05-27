import Link from "next/link"
import {
  Button,
  Icon,
  Logo,
  PageHeader,
  RepublicBar,
  TextInput,
  pluralizeZero,
  type IconName,
} from "@workspace/ui"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"
import { getCurrentSession } from "@/lib/current-citizen"

export default async function CitizenDirectoryPage() {
  const [session, orgs] = await Promise.all([
    getCurrentSession(),
    convex.query(api.citizen.directory.listOrganisms, {}),
  ])
  const citizenName = session?.name ?? "Mon espace"
  const total = orgs.length
  const byCat = orgs.reduce<Record<string, number>>((acc, o) => {
    acc[o.category] = (acc[o.category] ?? 0) + 1
    return acc
  }, {})
  const DIRECTORY_FILTERS = [
    `Tous (${total})`,
    `Ministères (${byCat["Ministère"] ?? 0})`,
    `Directions générales (${byCat["Direction générale"] ?? 0})`,
    `Établissements publics (${byCat["Établissement public"] ?? 0})`,
    `Collectivités (${byCat["Collectivité"] ?? 0})`,
  ] as const
  const navLinks: { label: string; href: string }[] = [
    { label: "Démarches", href: "/" },
    { label: "Administrations", href: "/administrations" },
    { label: "Mon espace", href: "/mon-espace" },
    { label: "Aide", href: "/aide" },
  ]

  return (
    <div style={{ minHeight: "100vh", background: "white" }}>
      <RepublicBar />
      <header
        style={{
          borderBottom: "1px solid var(--ink-200)",
          padding: "14px 64px",
          display: "flex",
          alignItems: "center",
          gap: 24,
          background: "white",
        }}
      >
        <Logo />
        <nav style={{ display: "flex", gap: 24, marginLeft: 32 }}>
          {navLinks.map((l, i) => {
            const isInternal = l.href.startsWith("/")
            const linkStyle = {
              fontSize: 14,
              fontWeight: i === 1 ? 700 : 500,
              color: i === 1 ? "var(--primary-600)" : "var(--ink-700)",
            } as const
            return isInternal ? (
              <Link key={l.label} href={l.href} style={linkStyle}>
                {l.label}
              </Link>
            ) : (
              <a key={l.label} href={l.href} style={linkStyle}>
                {l.label}
              </a>
            )
          })}
        </nav>
        <div style={{ flex: 1 }} />
        <Link href={session ? "/mon-espace" : "/login"} style={{ textDecoration: "none" }}>
          <Button variant="secondary" icon="user">
            {citizenName}
          </Button>
        </Link>
      </header>

      <PageHeader
        title="Annuaire des administrations"
        subtitle={`${total} organismes publics enregistrés sur Gabon Connect.`}
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <TextInput
              placeholder="Rechercher une administration…"
              icon="search"
              style={{ width: 280 }}
            />
            <Button variant="outline" icon="filter">
              Filtrer
            </Button>
          </div>
        }
      />

      <section style={{ padding: "24px 32px", background: "var(--ink-50)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
            {DIRECTORY_FILTERS.map((t, i) => (
              <button
                key={t}
                style={{
                  padding: "6px 14px",
                  borderRadius: 999,
                  border: "1px solid var(--ink-200)",
                  background: i === 0 ? "var(--primary-500)" : "white",
                  color: i === 0 ? "white" : "var(--ink-800)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {t}
              </button>
            ))}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 12,
            }}
          >
            {orgs.map((o) => (
              <div
                key={o.name}
                style={{
                  background: "white",
                  border: "1px solid var(--ink-200)",
                  borderRadius: 10,
                  padding: 18,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <span
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      background: o.tone + "14",
                      color: o.tone,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon name={o.icon as IconName} size={20} />
                  </span>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 14.5,
                        fontWeight: 700,
                        color: "var(--ink-900)",
                        lineHeight: 1.3,
                      }}
                    >
                      {o.name}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--ink-600)",
                        marginTop: 2,
                      }}
                    >
                      {o.category} · {o.theme}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    height: 1,
                    background: "var(--ink-150)",
                    margin: "4px 0",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: 12.5,
                  }}
                >
                  <span style={{ color: "var(--ink-700)" }}>
                    {pluralizeZero(
                      o.servicesCount,
                      "service en ligne",
                      "services en ligne",
                      "Aucun service en ligne",
                    )}
                  </span>
                  <span style={{ color: "var(--ink-700)" }}>
                    Délai moy. <b>{o.delay}</b>
                  </span>
                </div>
                <a
                  href="#"
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    marginTop: 2,
                  }}
                >
                  Voir les démarches →
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
