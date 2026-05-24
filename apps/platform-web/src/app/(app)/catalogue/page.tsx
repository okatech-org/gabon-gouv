import {
  Badge,
  Card,
  Icon,
  PageHeader,
  Select,
  StatCard,
  Table,
  Td,
  Th,
  Tr,
  TextInput,
  type Tone,
} from "@workspace/ui"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"
import { requirePlatformUser } from "@/lib/current-platform-user"

interface PageProps {
  searchParams: Promise<{
    categorie?: string
    organisme?: string
    statut?: string
    q?: string
  }>
}

export default async function PlatformCataloguePage({ searchParams }: PageProps) {
  const sp = await searchParams
  const { token } = await requirePlatformUser()
  const { services, facets, stats } = await convex.query(
    api.platform.catalog.listAllServices,
    { token },
  )

  const filtered = services.filter((s) => {
    if (sp.categorie && s.category !== sp.categorie) return false
    if (sp.organisme && s.orgShort !== sp.organisme) return false
    if (sp.statut && s.status !== sp.statut) return false
    if (sp.q) {
      const q = sp.q.toLowerCase()
      if (!s.title.toLowerCase().includes(q) && !s.slug.includes(q))
        return false
    }
    return true
  })

  return (
    <>
      <PageHeader
        breadcrumbs={["Plateforme", "Catalogue services"]}
        title="Catalogue national des services"
        subtitle={`${stats.total} services référencés · ${stats.published} publiés, ${stats.draft} en brouillon, ${stats.archived} archivés.`}
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
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
          }}
          role="group"
          aria-label="Statistiques catalogue"
        >
          <StatCard label="Total" value={String(stats.total)} icon="layers" />
          <StatCard
            label="Publiés"
            value={String(stats.published)}
            icon="checkCircle"
            accent
          />
          <StatCard
            label="Brouillons"
            value={String(stats.draft)}
            icon="edit"
          />
          <StatCard
            label="Archivés"
            value={String(stats.archived)}
            icon="archive"
          />
        </div>

        <Card>
          <form
            method="get"
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
            }}
            aria-label="Filtres catalogue"
          >
            <label
              style={{
                fontSize: 13,
                color: "var(--ink-700)",
                fontWeight: 600,
              }}
            >
              Recherche
              <TextInput
                name="q"
                defaultValue={sp.q ?? ""}
                placeholder="Titre ou slug…"
                icon="search"
                style={{ width: 240, marginLeft: 8 }}
              />
            </label>
            <label
              style={{
                fontSize: 13,
                color: "var(--ink-700)",
                fontWeight: 600,
              }}
            >
              Catégorie
              <Select
                name="categorie"
                defaultValue={sp.categorie ?? ""}
                style={{ width: 200, marginLeft: 8 }}
              >
                <option value="">Toutes</option>
                {facets.categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </label>
            <label
              style={{
                fontSize: 13,
                color: "var(--ink-700)",
                fontWeight: 600,
              }}
            >
              Organisme
              <Select
                name="organisme"
                defaultValue={sp.organisme ?? ""}
                style={{ width: 240, marginLeft: 8 }}
              >
                <option value="">Tous</option>
                {facets.organisms.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </Select>
            </label>
            <label
              style={{
                fontSize: 13,
                color: "var(--ink-700)",
                fontWeight: 600,
              }}
            >
              Statut
              <Select
                name="statut"
                defaultValue={sp.statut ?? ""}
                style={{ width: 140, marginLeft: 8 }}
              >
                <option value="">Tous</option>
                <option value="published">Publié</option>
                <option value="draft">Brouillon</option>
                <option value="archived">Archivé</option>
              </Select>
            </label>
          </form>
        </Card>

        <Card>
          {filtered.length === 0 ? (
            <div
              style={{
                padding: "48px 24px",
                textAlign: "center",
                color: "var(--ink-600)",
              }}
            >
              <Icon
                name="layers"
                size={36}
                style={{ color: "var(--ink-400)", marginBottom: 12 }}
                aria-hidden="true"
              />
              <h2 style={{ fontSize: 17, marginBottom: 6 }}>
                Aucun service ne correspond
              </h2>
              <p style={{ fontSize: 14 }}>Essayez d&apos;élargir les filtres.</p>
            </div>
          ) : (
            <Table>
              <caption className="sr-only">
                {filtered.length} services sur {stats.total} référencés
              </caption>
              <thead>
                <tr>
                  <Th scope="col">Service</Th>
                  <Th scope="col">Organisme</Th>
                  <Th scope="col">Catégorie</Th>
                  <Th scope="col">Statut</Th>
                  <Th scope="col">Délai</Th>
                  <Th scope="col">Frais</Th>
                  <Th scope="col">Satisfaction</Th>
                  <Th scope="col">Volume 30 j</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <Tr key={s.id}>
                    <Td>
                      <div
                        style={{ display: "flex", alignItems: "center", gap: 10 }}
                      >
                        <Icon
                          name="fileText"
                          size={16}
                          style={{ color: "var(--ink-500)" }}
                          aria-hidden="true"
                        />
                        <div
                          style={{ display: "flex", flexDirection: "column" }}
                        >
                          <span style={{ fontWeight: 600 }}>{s.title}</span>
                          <span
                            style={{
                              fontSize: 12,
                              color: "var(--ink-500)",
                              fontFamily: "var(--font-mono)",
                            }}
                          >
                            {s.slug}
                          </span>
                        </div>
                        {s.online && (
                          <Badge tone="archived" size="sm" dot>
                            En ligne
                          </Badge>
                        )}
                      </div>
                    </Td>
                    <Td style={{ color: "var(--ink-700)" }}>{s.orgShort}</Td>
                    <Td>
                      <Badge tone="primary" size="sm">
                        {s.category}
                      </Badge>
                    </Td>
                    <Td>
                      <Badge tone={statusTone(s.status)} dot>
                        {statusLabel(s.status)}
                      </Badge>
                    </Td>
                    <Td>{s.delay}</Td>
                    <Td>{s.fee}</Td>
                    <Td>
                      {s.satisfaction ? (
                        <span aria-label={`${s.satisfaction} sur 5`}>
                          <Icon
                            name="star"
                            size={12}
                            style={{
                              color: "var(--warning-500)",
                              verticalAlign: "middle",
                              marginRight: 4,
                            }}
                            aria-hidden="true"
                          />
                          {s.satisfaction}/5
                        </span>
                      ) : (
                        "—"
                      )}
                    </Td>
                    <Td
                      style={{
                        fontVariantNumeric: "tabular-nums",
                        fontWeight: 600,
                      }}
                    >
                      {s.requestsLast30d.toLocaleString("fr-FR")}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
    </>
  )
}

function statusLabel(s: string): string {
  switch (s) {
    case "published":
      return "Publié"
    case "draft":
      return "Brouillon"
    case "archived":
      return "Archivé"
    default:
      return s
  }
}

function statusTone(s: string): Tone {
  switch (s) {
    case "published":
      return "archived"
    case "draft":
      return "warning"
    case "archived":
      return "neutral"
    default:
      return "neutral"
  }
}
