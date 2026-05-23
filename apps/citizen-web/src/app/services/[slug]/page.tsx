import {
  Badge,
  Button,
  Frame,
  Icon,
  Logo,
  RepublicBar,
  SectionHeading,
} from "@workspace/ui"
import { getCurrentCitizen, getServiceDetail } from "@workspace/mocks/citizen"

export default async function CitizenServiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const [citizen, service] = await Promise.all([
    getCurrentCitizen(),
    getServiceDetail(slug),
  ])

  const navLinks: { label: string; href: string }[] = [
    { label: "Démarches", href: "/" },
    { label: "Administrations", href: "/administrations" },
    { label: "Mon espace", href: "/mon-espace" },
    { label: "Aide", href: "#" },
  ]

  return (
    <Frame width={1440} height={1100} style={{ background: "white", overflow: "hidden" }}>
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
          {navLinks.map((l, i) => (
            <a
              key={l.label}
              href={l.href}
              style={{
                fontSize: 14,
                fontWeight: i === 0 ? 700 : 500,
                color: i === 0 ? "var(--primary-600)" : "var(--ink-700)",
              }}
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div style={{ flex: 1 }} />
        <a href="/mon-espace" style={{ textDecoration: "none" }}>
          <Button variant="secondary" icon="user">
            {citizen.name}
          </Button>
        </a>
      </header>

      <div
        style={{
          padding: "20px 64px 12px",
          borderBottom: "1px solid var(--ink-150)",
          background: "var(--ink-50)",
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            color: "var(--ink-600)",
          }}
        >
          <a href="/" style={{ color: "var(--ink-600)" }}>
            Accueil
          </a>
          <Icon name="chevronRight" size={12} />
          <a href="/" style={{ color: "var(--ink-600)" }}>
            Démarches
          </a>
          <Icon name="chevronRight" size={12} />
          <span style={{ color: "var(--ink-600)" }}>
            {service.category}
          </span>
          <Icon name="chevronRight" size={12} />
          <span style={{ color: "var(--ink-900)", fontWeight: 600 }}>
            Acte de naissance
          </span>
        </div>
      </div>

      <section style={{ padding: "32px 64px 48px" }}>
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1fr 360px",
            gap: 48,
          }}
        >
          <div>
            <Badge tone="primary" size="sm">
              {service.category}
            </Badge>
            <h1 style={{ fontSize: 36, marginTop: 12, letterSpacing: "-0.02em" }}>
              {service.title}
            </h1>
            <p
              style={{
                fontSize: 16,
                color: "var(--ink-600)",
                marginTop: 8,
                lineHeight: 1.55,
                maxWidth: 720,
              }}
            >
              {service.description}
            </p>

            {/* Méta */}
            <div
              style={{
                display: "flex",
                gap: 32,
                marginTop: 24,
                paddingTop: 20,
                borderTop: "1px solid var(--ink-200)",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--ink-500)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Délivré par
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>
                  {service.org}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--ink-500)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Délai moyen
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>
                  {service.delay}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--ink-500)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Coût
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>
                  {service.cost}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--ink-500)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Mode
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    marginTop: 4,
                    color: "var(--success-600)",
                  }}
                >
                  {service.mode}
                </div>
              </div>
            </div>

            {/* Variantes */}
            <SectionHeading
              title="Quel acte choisir ?"
              subtitle="Trois variantes possibles selon votre besoin."
              style={{ marginTop: 36 }}
            />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 12,
              }}
            >
              {service.variants.map((v) => (
                <div
                  key={v.title}
                  style={{
                    border: `1px solid ${
                      v.highlight ? "var(--primary-500)" : "var(--ink-200)"
                    }`,
                    background: v.highlight ? "var(--primary-50)" : "white",
                    borderRadius: 8,
                    padding: 16,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <h4 style={{ fontSize: 14, fontWeight: 700 }}>{v.title}</h4>
                    {v.highlight && (
                      <Badge tone="primary" size="sm">
                        {v.highlightLabel ?? "Le plus demandé"}
                      </Badge>
                    )}
                  </div>
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--ink-700)",
                      marginTop: 6,
                      lineHeight: 1.5,
                    }}
                  >
                    {v.description}
                  </p>
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--ink-500)",
                      marginTop: 8,
                    }}
                  >
                    <b>Qui peut le demander ?</b> {v.who}
                  </p>
                </div>
              ))}
            </div>

            {/* Pièces */}
            <SectionHeading
              title="Pièces à fournir"
              subtitle="Préparez ces documents avant de commencer."
              style={{ marginTop: 36 }}
            />
            <div
              style={{
                border: "1px solid var(--ink-200)",
                borderRadius: 8,
                background: "white",
              }}
            >
              {service.pieces.map((p, i) => (
                <div
                  key={p.title}
                  style={{
                    padding: 16,
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    borderTop: i === 0 ? "none" : "1px solid var(--ink-150)",
                  }}
                >
                  <span
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 6,
                      flexShrink: 0,
                      background: p.auto ? "var(--success-50)" : "var(--ink-100)",
                      color: p.auto ? "var(--success-600)" : "var(--ink-500)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon
                      name={p.auto ? "check" : "paperclip"}
                      size={16}
                      stroke={2.25}
                    />
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>
                      {p.title}
                      {p.required && (
                        <span style={{ color: "var(--danger-500)", marginLeft: 4 }}>
                          *
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--ink-600)",
                        marginTop: 2,
                      }}
                    >
                      {p.description}
                    </div>
                  </div>
                  {p.auto && (
                    <Badge tone="archived" size="sm" dot>
                      Pré-rempli depuis votre identité
                    </Badge>
                  )}
                </div>
              ))}
            </div>

            <SectionHeading title="Foire aux questions" style={{ marginTop: 36 }} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              {service.faq.map((q) => (
                <div
                  key={q.question}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 0",
                    borderBottom: "1px solid var(--ink-150)",
                  }}
                >
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: "var(--ink-800)",
                    }}
                  >
                    {q.question}
                  </span>
                  <Icon
                    name={q.open ? "chevronUp" : "chevronDown"}
                    size={16}
                    style={{ color: "var(--ink-500)" }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Sticky CTA */}
          <aside>
            <div
              style={{
                position: "sticky",
                top: 24,
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <div
                style={{
                  border: "1px solid var(--ink-200)",
                  borderRadius: 10,
                  padding: 20,
                  background: "white",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--ink-500)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Démarrer la demande
                </div>
                <h3 style={{ fontSize: 18, marginTop: 8 }}>Vous êtes prêt(e) ?</h3>
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--ink-600)",
                    marginTop: 6,
                    lineHeight: 1.5,
                  }}
                >
                  4 étapes · environ 5 minutes. Vous pourrez sauvegarder à tout moment.
                </p>
                <a
                  href="/mon-espace/demarches/nouvelle"
                  style={{
                    textDecoration: "none",
                    display: "block",
                    marginTop: 16,
                  }}
                >
                  <Button
                    size="lg"
                    iconRight="arrowRight"
                    style={{ width: "100%" }}
                  >
                    Commencer
                  </Button>
                </a>
                <Button
                  variant="ghost"
                  icon="bookmark"
                  style={{ width: "100%", marginTop: 8 }}
                >
                  Sauvegarder pour plus tard
                </Button>
                <div
                  style={{
                    height: 1,
                    background: "var(--ink-150)",
                    margin: "16px 0",
                  }}
                />
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--ink-600)",
                    lineHeight: 1.6,
                  }}
                >
                  <Icon
                    name="lock"
                    size={12}
                    style={{ verticalAlign: "middle", marginRight: 4 }}
                  />
                  Vos données sont chiffrées de bout en bout et conservées au Gabon.
                </div>
              </div>

              <div
                style={{
                  border: "1px solid var(--ink-200)",
                  borderRadius: 10,
                  padding: 20,
                  background: "var(--ink-50)",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--ink-500)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Démarches connexes
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    marginTop: 12,
                  }}
                >
                  {service.related.map((d) => (
                    <a
                      key={d}
                      href="#"
                      style={{
                        fontSize: 14,
                        color: "var(--ink-800)",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Icon name="arrowRight" size={12} />
                      {d}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </Frame>
  )
}
