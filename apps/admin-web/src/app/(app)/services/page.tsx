import Link from "next/link"
import { redirect } from "next/navigation"
import type { Tone } from "@workspace/ui"
import {
  Badge,
  Button,
  Icon,
  PageHeader,
  Table,
  Td,
  Th,
  Tr,
} from "@workspace/ui"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"
import { getCurrentAgent } from "@/lib/current-agent"
import { ServiceRowMenu } from "./service-row-menu"

interface ServiceRow {
  slug: string
  title: string
  category: string
  categorySlug?: string | null
  status: string
  requests30d: number
  fee: string
  delayHours: number
  satisfaction?: number
  updatedAt?: number
}

const FILTERS = [
  { id: "all", label: "Tous" },
  { id: "published", label: "Publiés" },
  { id: "draft", label: "Brouillons" },
  { id: "archived", label: "Archivés" },
] as const
type FilterId = (typeof FILTERS)[number]["id"]

function serviceStatusBadge(status: string): { label: string; tone: Tone } {
  switch (status) {
    case "published":
      return { label: "Publié", tone: "success" }
    case "draft":
      return { label: "Brouillon", tone: "warning" }
    case "archived":
      return { label: "Archivé", tone: "neutral" }
    default:
      return { label: status, tone: "neutral" }
  }
}

function formatDelay(hours: number): string {
  if (hours >= 48) {
    const d = Math.floor(hours / 24)
    const h = hours % 24
    return h > 0 ? `${d} j ${h} h` : `${d} j`
  }
  return `${hours} h`
}

function formatFee(fee: string): string {
  if (fee === "0" || fee === "0 FCFA" || fee === "gratuit") return "Gratuit"
  return fee
}

function formatRelativeDate(ms?: number): string {
  if (!ms) return "—"
  const days = Math.floor((Date.now() - ms) / (1000 * 60 * 60 * 24))
  if (days === 0) return "aujourd'hui"
  if (days === 1) return "hier"
  if (days < 30) return `il y a ${days} j`
  if (days < 365) return `il y a ${Math.floor(days / 30)} mois`
  return `il y a ${Math.floor(days / 365)} an${days >= 730 ? "s" : ""}`
}

interface PageProps {
  searchParams: Promise<{ statut?: string; q?: string }>
}

export default async function AdminServicesPage({ searchParams }: PageProps) {
  const session = await getCurrentAgent()
  if (!session) redirect("/login")

  const sp = await searchParams
  const filter = (FILTERS.find((f) => f.id === sp.statut)?.id ??
    "all") as FilterId
  const search = (sp.q ?? "").trim().toLowerCase()

  // On charge TOUT puis on filtre client : permet de calculer les compteurs
  // par statut + de filtrer côté serveur sans appels multiples.
  const services = (await convex.query(api.admin.services.list, {
    token: session.token,
  })) as ServiceRow[]

  const counts = {
    all: services.length,
    published: services.filter((s) => s.status === "published").length,
    draft: services.filter((s) => s.status === "draft").length,
    archived: services.filter((s) => s.status === "archived").length,
  }

  const filtered = services.filter((s) => {
    if (filter !== "all" && s.status !== filter) return false
    if (search) {
      const haystack = `${s.title} ${s.category}`.toLowerCase()
      if (!haystack.includes(search)) return false
    }
    return true
  })

  return (
    <>
      <PageHeader
        breadcrumbs={["Mes services"]}
        title="Services proposés au public"
        subtitle={
          counts.published === 0
            ? "Aucun service publié pour le moment."
            : `${counts.published} service${counts.published > 1 ? "s" : ""} publié${counts.published > 1 ? "s" : ""} au catalogue Gabon Connect${counts.draft > 0 ? ` · ${counts.draft} en projet` : ""}.`
        }
        actions={
          <Link
            href="/services/nouveau"
            style={{ textDecoration: "none", display: "inline-flex" }}
          >
            <Button icon="plus" aria-label="Créer un nouveau service">
              Créer un service
            </Button>
          </Link>
        }
      />
      <div
        style={{
          padding: "20px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          maxWidth: 1400,
          width: "100%",
        }}
      >
        {/* Filtres + recherche */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <nav aria-label="Filtrer par statut">
            <ul
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                padding: 0,
                margin: 0,
                listStyle: "none",
              }}
            >
              {FILTERS.map((f) => {
                const active = f.id === filter
                const count = counts[f.id]
                const href =
                  f.id === "all"
                    ? search
                      ? `/services?q=${encodeURIComponent(search)}`
                      : "/services"
                    : search
                      ? `/services?statut=${f.id}&q=${encodeURIComponent(search)}`
                      : `/services?statut=${f.id}`
                return (
                  <li key={f.id}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "6px 14px",
                        borderRadius: 999,
                        border: `1px solid ${active ? "var(--primary-500)" : "var(--ink-200)"}`,
                        background: active ? "var(--primary-500)" : "white",
                        color: active ? "white" : "var(--ink-800)",
                        fontSize: 13,
                        fontWeight: 600,
                        textDecoration: "none",
                      }}
                    >
                      <span>{f.label}</span>
                      <span
                        style={{
                          background: active
                            ? "rgba(255,255,255,.22)"
                            : "var(--ink-150)",
                          color: active ? "white" : "var(--ink-700)",
                          padding: "1px 6px",
                          borderRadius: 999,
                          fontSize: 11,
                          fontVariantNumeric: "tabular-nums",
                        }}
                        aria-label={`${count} service${count > 1 ? "s" : ""}`}
                      >
                        {count}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
          <div style={{ flex: 1 }} />
          <form
            method="GET"
            action="/services"
            role="search"
            style={{ display: "flex", gap: 8, alignItems: "center" }}
          >
            {filter !== "all" && (
              <input type="hidden" name="statut" value={filter} />
            )}
            <label htmlFor="search-services" className="sr-only">
              Rechercher un service
            </label>
            <input
              id="search-services"
              name="q"
              type="search"
              defaultValue={search}
              placeholder="Rechercher un service…"
              style={{
                width: 260,
                padding: "8px 12px",
                fontSize: 13,
                border: "1px solid var(--ink-300)",
                borderRadius: 6,
                background: "white",
              }}
            />
            <button
              type="submit"
              aria-label="Lancer la recherche"
              style={{
                padding: "8px 12px",
                fontSize: 13,
                background: "var(--ink-100)",
                border: "1px solid var(--ink-300)",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              <Icon name="search" size={14} aria-hidden="true" />
            </button>
          </form>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div
            style={{
              padding: "48px 24px",
              textAlign: "center",
              color: "var(--ink-600)",
              background: "white",
              border: "1px solid var(--ink-200)",
              borderRadius: 8,
            }}
          >
            <Icon
              name="layers"
              size={36}
              style={{ color: "var(--ink-400)", marginBottom: 12 }}
              aria-hidden="true"
            />
            <h2 style={{ fontSize: 17, marginBottom: 6 }}>
              {search
                ? "Aucun service ne correspond à votre recherche"
                : filter === "all"
                  ? "Aucun service pour le moment"
                  : `Aucun service dans la catégorie « ${FILTERS.find((f) => f.id === filter)?.label} »`}
            </h2>
            <p style={{ fontSize: 14, color: "var(--ink-600)" }}>
              {filter === "all" && !search
                ? "Créez votre premier service pour qu'il apparaisse dans le catalogue Gabon Connect."
                : "Essayez un autre filtre ou une autre recherche."}
            </p>
            {filter === "all" && !search && (
              <div style={{ marginTop: 16 }}>
                <Link
                  href="/services/nouveau"
                  style={{ textDecoration: "none" }}
                >
                  <Button icon="plus">Créer un service</Button>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <Table>
            <caption
              style={{
                position: "absolute",
                width: 1,
                height: 1,
                overflow: "hidden",
                clip: "rect(0 0 0 0)",
              }}
            >
              {filtered.length} service{filtered.length > 1 ? "s" : ""} affiché
              {filtered.length > 1 ? "s" : ""} sur {counts.all}
            </caption>
            <thead>
              <tr>
                <Th scope="col">Service</Th>
                <Th scope="col">Catégorie</Th>
                <Th scope="col">Statut</Th>
                <Th scope="col">Demandes 30 j</Th>
                <Th scope="col">Délai moyen</Th>
                <Th scope="col">Satisfaction</Th>
                <Th scope="col">Coût</Th>
                <Th scope="col">Mise à jour</Th>
                <Th scope="col">
                  <span className="sr-only">Actions</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const status = serviceStatusBadge(s.status)
                return (
                  <Tr key={s.slug}>
                    <Td>
                      <Link
                        href={`/services/${s.slug}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          textDecoration: "none",
                          color: "inherit",
                        }}
                        aria-label={`Configurer le service ${s.title}`}
                      >
                        <Icon
                          name="layers"
                          size={16}
                          style={{ color: "var(--primary-500)", flexShrink: 0 }}
                          aria-hidden="true"
                        />
                        <span style={{ fontWeight: 600 }}>{s.title}</span>
                      </Link>
                    </Td>
                    <Td>{s.category}</Td>
                    <Td>
                      <Badge tone={status.tone} dot>
                        {status.label}
                      </Badge>
                    </Td>
                    <Td
                      style={{
                        fontWeight: 600,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {s.requests30d}
                    </Td>
                    <Td>{formatDelay(s.delayHours)}</Td>
                    <Td>
                      {typeof s.satisfaction === "number" ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Icon
                            name="star"
                            size={12}
                            style={{ color: "var(--warning-500)" }}
                            aria-hidden="true"
                          />
                          {s.satisfaction.toFixed(1).replace(".", ",")}/5
                        </span>
                      ) : (
                        "—"
                      )}
                    </Td>
                    <Td>{formatFee(s.fee)}</Td>
                    <Td style={{ color: "var(--ink-600)" }}>
                      {formatRelativeDate(s.updatedAt)}
                    </Td>
                    <Td>
                      <ServiceRowMenu
                        slug={s.slug}
                        title={s.title}
                        status={s.status}
                      />
                    </Td>
                  </Tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </div>
    </>
  )
}
