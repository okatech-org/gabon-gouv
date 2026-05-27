import Link from "next/link"
import {
  Badge,
  Button,
  Icon,
  Logo,
  RepublicBar,
  SectionHeading,
  pluralize,
  type IconName,
} from "@workspace/ui"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"

export default async function CitizenHomePage() {
  const [categories, topServices, homeStats, homeCounters] = await Promise.all(
    [
      convex.query(api.citizen.catalog.getCategories, {}),
      convex.query(api.citizen.catalog.getTopServices, { limit: 6 }),
      convex.query(api.citizen.home.getHomeStats, {}),
      convex.query(api.citizen.home.getHomeCounters, {}),
    ],
  )

  const navLinks: { label: string; href: string }[] = [
    { label: "Démarches", href: "/services" },
    { label: "Administrations", href: "/administrations" },
    { label: "Mon espace", href: "/mon-espace" },
    { label: "Aide", href: "/aide" },
  ]
  const suggestions: { label: string; href: string }[] = [
    { label: "acte de naissance", href: "/services/acte-naissance" },
    { label: "passeport", href: "/services/passeport" },
    { label: "Registre commerce (RCCM)", href: "/services" },
    { label: "casier judiciaire", href: "/services" },
  ]
  const howItWorks = [
    {
      icon: "fingerprint" as const,
      n: "01",
      title: "Je m'identifie",
      description:
        "Connexion sécurisée par votre identité numérique gabonaise (NIP). Aucun mot de passe à retenir.",
    },
    {
      icon: "fileText" as const,
      n: "02",
      title: "Je dépose ma demande",
      description:
        "Je remplis le formulaire et je joins mes pièces justificatives. Les informations connues sont pré-remplies.",
    },
    {
      icon: "download" as const,
      n: "03",
      title: "Je reçois mon document",
      description:
        "L'administration traite, signe et m'envoie mon document numérique scellé, opposable aux tiers.",
    },
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
        <Logo subtitle="Guichet unique" />
        <nav style={{ display: "flex", gap: 24, marginLeft: 32 }}>
          {navLinks.map((l, i) => {
            const isInternal = l.href.startsWith("/")
            const linkStyle = {
              fontSize: 14,
              fontWeight: i === 0 ? 700 : 500,
              color: i === 0 ? "var(--primary-600)" : "var(--ink-700)",
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
        <span style={{ fontSize: 12, color: "var(--ink-600)" }}>République Gabonaise</span>
        <Link href="/mon-espace" style={{ textDecoration: "none" }}>
          <Button variant="secondary" icon="user">
            Se connecter
          </Button>
        </Link>
      </header>

      {/* Hero */}
      <section
        style={{
          background: "linear-gradient(180deg, var(--primary-50) 0%, white 100%)",
          padding: "56px 64px 40px",
        }}
      >
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 0.8fr",
              gap: 48,
              alignItems: "center",
            }}
          >
            <div>
              <Badge tone="primary" dot>
                Plateforme officielle · 47 administrations connectées
              </Badge>
              <h1
                style={{
                  fontSize: 52,
                  lineHeight: 1.05,
                  letterSpacing: "-0.02em",
                  marginTop: 16,
                }}
              >
                Toutes vos démarches
                <br />
                administratives,{" "}
                <span style={{ color: "var(--primary-500)" }}>en un seul endroit.</span>
              </h1>
              <p
                style={{
                  fontSize: 18,
                  color: "var(--ink-600)",
                  maxWidth: 540,
                  lineHeight: 1.55,
                  marginTop: 16,
                }}
              >
                Acte de naissance, passeport, casier judiciaire, immatriculation
                d&apos;entreprise — déposez et suivez vos demandes en ligne, à toute heure.
              </p>

              {/* Recherche */}
              <div
                style={{
                  marginTop: 28,
                  background: "white",
                  border: "1px solid var(--ink-200)",
                  borderRadius: 10,
                  padding: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  maxWidth: 560,
                  boxShadow: "0 4px 12px rgba(14,26,43,.06)",
                }}
              >
                <Icon
                  name="search"
                  size={18}
                  style={{ color: "var(--ink-500)", marginLeft: 10 }}
                />
                <input
                  placeholder="Rechercher une démarche, un service, une administration…"
                  style={{
                    flex: 1,
                    border: "none",
                    outline: "none",
                    fontSize: 15,
                    padding: "10px 4px",
                    fontFamily: "inherit",
                    background: "transparent",
                  }}
                  defaultValue=""
                />
                <Button>Rechercher</Button>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginTop: 12,
                  fontSize: 12,
                  color: "var(--ink-600)",
                  flexWrap: "wrap",
                }}
              >
                <span>Suggestions :</span>
                {suggestions.map((s) => {
                  const isInternal = s.href.startsWith("/")
                  const chipStyle = {
                    background: "var(--ink-100)",
                    padding: "2px 10px",
                    borderRadius: 999,
                    color: "var(--ink-700)",
                  } as const
                  return isInternal ? (
                    <Link key={s.label} href={s.href} style={chipStyle}>
                      {s.label}
                    </Link>
                  ) : (
                    <a key={s.label} href={s.href} style={chipStyle}>
                      {s.label}
                    </a>
                  )
                })}
              </div>
            </div>

            {/* Stat card */}
            <div
              style={{
                background: "var(--primary-600)",
                color: "white",
                padding: 32,
                borderRadius: 12,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: -60,
                  right: -60,
                  width: 260,
                  height: 260,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,.05)",
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "rgba(255,255,255,.7)",
                }}
              >
                Gabon Connect en chiffres
              </span>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 24,
                  marginTop: 20,
                  position: "relative",
                }}
              >
                {homeStats.map((s) => (
                  <div key={s.label}>
                    <div
                      style={{
                        fontSize: 28,
                        fontWeight: 700,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {s.value}
                    </div>
                    <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.78)" }}>
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
              <div
                style={{
                  height: 1,
                  background: "rgba(255,255,255,.18)",
                  margin: "20px 0",
                }}
              />
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  fontSize: 11.5,
                  fontWeight: 600,
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <Icon name="shieldCheck" size={13} />
                  RGPD-conforme
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <Icon name="fingerprint" size={13} />
                  Identité numérique
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <Icon name="database" size={13} />
                  Hébergé au Gabon
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Catégories */}
      <section style={{ padding: "40px 64px 24px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <SectionHeading
            title="Démarches par thème"
            subtitle={`Parcourez ${pluralize(homeCounters.totalServices, "service publié", "services publiés")} par ${pluralize(homeCounters.totalAdministrations, "administration")} ${homeCounters.totalAdministrations > 1 ? "gabonaises" : "gabonaise"}.`}
            action={
              <Link href="/administrations" style={{ fontSize: 14, fontWeight: 600 }}>
                Voir tout l&apos;annuaire →
              </Link>
            }
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 12,
            }}
          >
            {categories.map((c) => (
              <a
                key={c.id}
                href={`/services?categorie=${c.id}`}
                style={{
                  border: "1px solid var(--ink-200)",
                  borderRadius: 10,
                  padding: 18,
                  background: "white",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  textDecoration: "none",
                  color: "inherit",
                  transition: "border-color .12s, transform .12s",
                }}
              >
                <span
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 8,
                    background: c.color + "14",
                    color: c.color,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon name={c.icon as IconName} size={20} />
                </span>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "var(--ink-900)",
                    }}
                  >
                    {c.label}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink-500)" }}>
                    {pluralize(c.count, "démarche")}
                  </div>
                </div>
                <Icon
                  name="chevronRight"
                  size={16}
                  style={{ color: "var(--ink-400)" }}
                />
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Top services */}
      <section style={{ padding: "24px 64px 56px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <SectionHeading
            title="Démarches les plus demandées"
            subtitle="Les 6 services les plus utilisés cette semaine."
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 12,
            }}
          >
            {topServices.map((s) => (
              <Link
                key={s.id}
                href={`/services/${s.id}`}
                style={{
                  border: "1px solid var(--ink-200)",
                  borderRadius: 10,
                  padding: 20,
                  background: "white",
                  textDecoration: "none",
                  color: "inherit",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Badge tone="primary" size="sm">
                    {s.cat}
                  </Badge>
                  {s.online && (
                    <Badge tone="archived" size="sm" dot>
                      100% en ligne
                    </Badge>
                  )}
                </div>
                <h3 style={{ fontSize: 16.5, lineHeight: 1.3, marginTop: 4 }}>{s.label}</h3>
                <div
                  style={{
                    fontSize: 12.5,
                    color: "var(--ink-600)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Icon name="building" size={13} />
                  {s.org}
                </div>
                <div
                  style={{
                    height: 1,
                    background: "var(--ink-150)",
                    margin: "6px 0",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: 12.5,
                    color: "var(--ink-700)",
                  }}
                >
                  <span>
                    <Icon
                      name="clock"
                      size={12}
                      style={{ verticalAlign: "middle", marginRight: 4 }}
                    />
                    Délai · <b>{s.delay}</b>
                  </span>
                  <span>
                    <Icon
                      name="dollarSign"
                      size={12}
                      style={{ verticalAlign: "middle", marginRight: 4 }}
                    />
                    {s.fee}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Comment ça marche */}
      <section
        style={{
          background: "var(--ink-50)",
          padding: "48px 64px",
          borderTop: "1px solid var(--ink-200)",
        }}
      >
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <SectionHeading
            title="Comment ça marche ?"
            subtitle="Trois étapes pour effectuer une démarche administrative en ligne."
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 16,
            }}
          >
            {howItWorks.map((c) => (
              <div
                key={c.n}
                style={{
                  background: "white",
                  border: "1px solid var(--ink-200)",
                  borderRadius: 10,
                  padding: 24,
                  position: "relative",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--primary-500)",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                  }}
                >
                  {c.n}
                </span>
                <span
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 8,
                    background: "var(--primary-50)",
                    color: "var(--primary-500)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 8,
                    marginBottom: 12,
                  }}
                >
                  <Icon name={c.icon} size={20} />
                </span>
                <h3 style={{ fontSize: 17 }}>{c.title}</h3>
                <p
                  style={{
                    fontSize: 14,
                    color: "var(--ink-600)",
                    marginTop: 6,
                    lineHeight: 1.55,
                  }}
                >
                  {c.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          padding: "24px 64px",
          borderTop: "1px solid var(--ink-200)",
          background: "white",
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 13,
            color: "var(--ink-600)",
          }}
        >
          <div style={{ display: "flex", gap: 24 }}>
            <Link href="/mentions-legales">Mentions légales</Link>
            <Link href="/accessibilite">Accessibilité</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/etat-du-service">État du service</Link>
            <Link href="/cgu">CGU</Link>
          </div>
          <div>© 2026 République Gabonaise · Gabon Connect</div>
        </div>
      </footer>
    </div>
  )
}
