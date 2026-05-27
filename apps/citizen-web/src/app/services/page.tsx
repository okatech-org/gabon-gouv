import Link from "next/link"
import { Badge, Card, Icon, PageHeader, SectionHeading } from "@workspace/ui"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"
import { PublicShell } from "@/components/public-shell"

/**
 * Page `/services` côté citoyen — catalogue public exhaustif des services
 * de toutes les administrations connectées, groupés par catégorie.
 *
 * Comble le bug B1 (404 brute) : précédemment cette URL n'existait pas
 * alors qu'elle peut être atteinte par lien externe ou tape manuelle.
 */

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Catalogue des services · Gabon Connect",
  description:
    "Tous les services administratifs gabonais en un seul catalogue.",
}

export default async function CitizenServicesPage() {
  const data = await convex.query(api.citizen.catalog.listAllPublished, {})

  return (
    <PublicShell active="demarches">
      <PageHeader
        title="Catalogue des services"
        subtitle={`${data.total} démarche${data.total > 1 ? "s" : ""} disponible${data.total > 1 ? "s" : ""} en ligne · ${data.categories.length} thématique${data.categories.length > 1 ? "s" : ""}.`}
      />
      <div
        style={{
          padding: "24px 64px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
          maxWidth: 1280,
          margin: "0 auto",
          width: "100%",
        }}
      >
        {data.categories.length === 0 ? (
          <Card>
            <div
              style={{
                padding: 48,
                textAlign: "center",
                color: "var(--ink-600)",
              }}
            >
              <Icon
                name="inbox"
                size={36}
                aria-hidden="true"
                style={{ color: "var(--ink-400)", marginBottom: 12 }}
              />
              <p style={{ fontSize: 14 }}>
                Aucun service publié pour le moment.
              </p>
            </div>
          </Card>
        ) : (
          data.categories.map((cat) => (
            <section key={cat.slug} aria-labelledby={`cat-${cat.slug}`}>
              <SectionHeading
                title={cat.label}
                subtitle={`${cat.services.length} démarche${cat.services.length > 1 ? "s" : ""}`}
                level={2}
              />
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: "12px 0 0",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: 12,
                }}
              >
                {cat.services.map((s) => (
                  <li key={s.slug}>
                    <Link
                      href={`/services/${s.slug}`}
                      style={{
                        display: "block",
                        padding: 16,
                        background: "white",
                        border: "1px solid var(--ink-200)",
                        borderRadius: 10,
                        textDecoration: "none",
                        color: "inherit",
                        height: "100%",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: 8,
                          marginBottom: 8,
                        }}
                      >
                        <h3
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: "var(--ink-900)",
                            margin: 0,
                            lineHeight: 1.4,
                          }}
                        >
                          {s.title}
                        </h3>
                        {s.online && (
                          <Badge tone="success" size="sm" icon="zap">
                            En ligne
                          </Badge>
                        )}
                      </div>
                      <p
                        style={{
                          fontSize: 12.5,
                          color: "var(--ink-600)",
                          margin: "0 0 10px",
                        }}
                      >
                        {s.organismShortName}
                      </p>
                      <div
                        style={{
                          display: "flex",
                          gap: 12,
                          fontSize: 12,
                          color: "var(--ink-700)",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Icon name="clock" size={12} aria-hidden="true" />
                          {s.delayLabel}
                        </span>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Icon
                            name="dollarSign"
                            size={12}
                            aria-hidden="true"
                          />
                          {s.fee}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </PublicShell>
  )
}
