import Link from "next/link"
import {
  Badge,
  Button,
  Card,
  Icon,
  PageHeader,
  Select,
  StatCard,
  TextInput,
} from "@workspace/ui"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"
import { requireCurrentSession } from "@/lib/current-citizen"

interface PageProps {
  searchParams: Promise<{ annee?: string; organisme?: string }>
}

export default async function CitizenDocumentsListPage({
  searchParams,
}: PageProps) {
  const sp = await searchParams
  const session = await requireCurrentSession()
  const { documents, stats, facets } = await convex.query(
    api.citizen.documents.listMyDocuments,
    { idnSub: session.idnSub },
  )

  const yearFilter = sp.annee ? Number(sp.annee) : null
  const orgFilter = sp.organisme ?? null
  const filtered = documents.filter(
    (d) =>
      (yearFilter == null || d.year === yearFilter) &&
      (orgFilter == null || d.org === orgFilter),
  )

  return (
    <>
      <PageHeader
        breadcrumbs={["Mon espace", "Mes documents"]}
        title="Mes documents"
        subtitle={
          stats.total === 0
            ? "Vous n'avez encore reçu aucun document."
            : `${stats.total} acte${stats.total > 1 ? "s" : ""} numérique${stats.total > 1 ? "s" : ""} émis par les administrations.`
        }
        actions={
          <>
            <Button variant="outline" icon="search">
              Vérifier un acte
            </Button>
          </>
        }
      />
      <div
        style={{
          padding: "24px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
          maxWidth: 1400,
          width: "100%",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
          }}
          role="group"
          aria-label="Statistiques documents"
        >
          <StatCard
            label="Total"
            value={String(stats.total)}
            icon="fileText"
          />
          <StatCard
            label="Actifs"
            value={String(stats.active)}
            icon="shieldCheck"
          />
          <StatCard
            label="Révoqués"
            value={String(stats.revoked)}
            icon="alertTriangle"
            accent={stats.revoked > 0}
          />
        </div>

        {/* Barre filtres */}
        <Card>
          <form
            method="get"
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
            }}
            aria-label="Filtres documents"
          >
            <label
              style={{ fontSize: 13, color: "var(--ink-700)", fontWeight: 600 }}
            >
              Recherche
              <TextInput
                name="q"
                placeholder="Numéro d'acte ou titre…"
                icon="search"
                style={{ width: 280, marginLeft: 8 }}
              />
            </label>
            <label
              style={{ fontSize: 13, color: "var(--ink-700)", fontWeight: 600 }}
            >
              Année
              <Select
                name="annee"
                defaultValue={yearFilter ? String(yearFilter) : ""}
                style={{ width: 120, marginLeft: 8 }}
              >
                <option value="">Toutes</option>
                {facets.years.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </Select>
            </label>
            <label
              style={{ fontSize: 13, color: "var(--ink-700)", fontWeight: 600 }}
            >
              Administration
              <Select
                name="organisme"
                defaultValue={orgFilter ?? ""}
                style={{ width: 240, marginLeft: 8 }}
              >
                <option value="">Toutes</option>
                {facets.organisms.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </Select>
            </label>
            <div style={{ flex: 1 }} />
            <Button type="submit" variant="secondary">
              Filtrer
            </Button>
            <Link
              href="/mon-espace/documents"
              style={{
                fontSize: 13,
                color: "var(--primary-600)",
                fontWeight: 600,
                textDecoration: "underline",
              }}
            >
              Réinitialiser
            </Link>
          </form>
        </Card>

        {/* Grille de documents */}
        {filtered.length === 0 ? (
          <Card>
            <div
              style={{
                padding: "48px 24px",
                textAlign: "center",
                color: "var(--ink-600)",
              }}
            >
              <Icon
                name="fileText"
                size={36}
                style={{ color: "var(--ink-400)", marginBottom: 12 }}
              />
              <h2 style={{ fontSize: 17, marginBottom: 6 }}>
                Aucun document à afficher
              </h2>
              <p style={{ fontSize: 14, color: "var(--ink-600)" }}>
                {stats.total === 0
                  ? "Vos actes signés apparaîtront ici dès qu'une administration en aura émis."
                  : "Essayez d'enlever les filtres."}
              </p>
            </div>
          </Card>
        ) : (
          <ul
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: 16,
              padding: 0,
              margin: 0,
              listStyle: "none",
            }}
            aria-label={`${filtered.length} documents`}
          >
            {filtered.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/mon-espace/documents/${d.actNumber}`}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    padding: 18,
                    background: "white",
                    border: `1px solid ${d.revoked ? "var(--danger-300, #fca5a5)" : "var(--ink-200)"}`,
                    borderRadius: 10,
                    textDecoration: "none",
                    color: "inherit",
                    height: "100%",
                    boxShadow: "0 1px 2px rgba(14,26,43,.04)",
                  }}
                  aria-label={`Ouvrir ${d.title}, ${d.actNumber}`}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Badge tone="primary" size="sm">
                      {d.year}
                    </Badge>
                    {d.revoked ? (
                      <Badge tone="danger" dot>
                        Révoqué
                      </Badge>
                    ) : (
                      <Badge tone="archived" dot>
                        Valide
                      </Badge>
                    )}
                  </div>
                  <h3 style={{ fontSize: 15, lineHeight: 1.3, margin: 0 }}>
                    {d.title}
                  </h3>
                  <dl
                    style={{
                      display: "grid",
                      gridTemplateColumns: "auto 1fr",
                      gap: "4px 12px",
                      fontSize: 12.5,
                      margin: 0,
                    }}
                  >
                    <dt style={{ color: "var(--ink-500)" }}>N° d&apos;acte</dt>
                    <dd
                      style={{
                        fontFamily: "var(--font-mono)",
                        margin: 0,
                      }}
                    >
                      {d.actNumber}
                    </dd>
                    <dt style={{ color: "var(--ink-500)" }}>Émis par</dt>
                    <dd style={{ margin: 0, fontWeight: 600 }}>{d.org}</dd>
                    <dt style={{ color: "var(--ink-500)" }}>Délivré le</dt>
                    <dd style={{ margin: 0 }}>
                      <time dateTime={new Date(d.issuedAtMs).toISOString()}>
                        {d.issuedAt}
                      </time>
                    </dd>
                    <dt style={{ color: "var(--ink-500)" }}>Empreinte</dt>
                    <dd
                      style={{
                        margin: 0,
                        fontFamily: "var(--font-mono)",
                        color: "var(--ink-700)",
                      }}
                    >
                      {d.sha256Short}
                    </dd>
                  </dl>
                  <div
                    style={{
                      marginTop: "auto",
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      paddingTop: 8,
                      borderTop: "1px solid var(--ink-150)",
                      fontSize: 12.5,
                      color: "var(--primary-600)",
                      fontWeight: 600,
                    }}
                  >
                    <Icon name="arrowRight" size={13} aria-hidden="true" />
                    Voir le document
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
