import Link from "next/link"
import { redirect } from "next/navigation"
import {
  Badge,
  Card,
  Icon,
  PageHeader,
  SectionHeading,
  StatCard,
  Table,
  Td,
  Th,
  Tr,
  type Tone,
} from "@workspace/ui"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"
import { getCurrentAgent } from "@/lib/current-agent"
import { longDate } from "@/lib/format"

/**
 * Page /archives — Bloc 6 (Option C hybride).
 *
 * Refonte vs v1 mockup :
 *   - Plus de gestion de bordereaux d'élimination (délégué au SAE national)
 *   - Plus de visa DGAN (idem)
 *   - Banner "SAE national non configuré" si organisme en mode local
 *   - Stats Bloc 6 (total, active, DUA expirée, pending dispatch)
 *   - Tabs scopes (toutes / actives / DUA expirée / à pousser)
 *   - Liste consultation seule avec lien vers /archives/[cote]
 */

interface ArchiveRow {
  id: string
  cote: string
  description: string
  versedAt: number
  dua: string
  duaExpiresAt?: number
  status: string
  finalSort: string
  sha256Short: string
  externalSaeKind?: string
  externalStatus?: string
}

interface ArchiveStats {
  total: number
  active: number
  duaExpired: number
  externalPending: number
  providerKind: "local" | "digitalium" | "noop"
}

type Scope = "all" | "active" | "dua_expired" | "external_pending"

interface PageProps {
  searchParams: Promise<{ scope?: string; search?: string }>
}

export default async function ArchivesPage({ searchParams }: PageProps) {
  const session = await getCurrentAgent()
  if (!session) redirect("/login")
  const sp = await searchParams
  const scope: Scope =
    sp.scope === "active" ||
    sp.scope === "dua_expired" ||
    sp.scope === "external_pending"
      ? sp.scope
      : "all"
  const search = sp.search?.trim() || undefined

  const [list, stats] = await Promise.all([
    convex.query(api.admin.archives.listForOrg, {
      token: session.token,
      scope,
      search,
    }) as Promise<ArchiveRow[]>,
    convex.query(api.admin.archives.getStatsForOrg, {
      token: session.token,
    }) as Promise<ArchiveStats>,
  ])

  const providerLocal = stats.providerKind === "local"

  return (
    <>
      <PageHeader
        breadcrumbs={["Archives"]}
        title="Archives à valeur probante"
        subtitle={
          providerLocal
            ? "Archives gérées localement par Gabon Connect. Pour l'archivage légal complet (élimination, récolement, intégrité), connectez le SAE national."
            : "Archives versées au Système d'Archivage Électronique national."
        }
      />
      <main
        id="main"
        tabIndex={-1}
        style={{
          padding: "20px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          flex: 1,
        }}
      >
        {/* Banner SAE national non configuré */}
        {providerLocal && (
          <Card>
            <div
              role="region"
              aria-labelledby="sae-banner-heading"
              style={{
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
                padding: 4,
              }}
            >
              <Icon
                name="alertTriangle"
                size={20}
                aria-hidden="true"
                style={{ color: "var(--warning-500)", flexShrink: 0 }}
              />
              <div style={{ flex: 1 }}>
                <h2
                  id="sae-banner-heading"
                  style={{ fontSize: 14, fontWeight: 700, margin: 0 }}
                >
                  Système d&apos;Archivage Électronique national non configuré
                </h2>
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--ink-700)",
                    margin: "4px 0 0",
                  }}
                >
                  Vos archives sont conservées localement par Gabon Connect en
                  consultation. L&apos;<strong>élimination réglementaire</strong>{" "}
                  (visa DGAN), le <strong>récolement périodique</strong> et la{" "}
                  <strong>vérification d&apos;intégrité hebdomadaire</strong>{" "}
                  nécessitent un branchement au SAE national, lorsque celui-ci
                  sera disponible.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
          }}
        >
          <StatCard
            label="Total archives"
            value={String(stats.total)}
            icon="archive"
          />
          <StatCard
            label="Actives"
            value={String(stats.active)}
            icon="checkCircle"
          />
          <StatCard
            label="DUA expirée"
            value={String(stats.duaExpired)}
            icon="clock"
            hint={
              stats.duaExpired > 0
                ? "À éliminer via SAE national"
                : "Aucune action"
            }
          />
          <StatCard
            label="À pousser au SAE"
            value={String(stats.externalPending)}
            icon="upload"
            hint={
              stats.externalPending > 0
                ? "En attente de dispatch"
                : "Toutes synchronisées"
            }
          />
        </div>

        {/* Tabs scopes */}
        <Card padded={false}>
          <nav
            aria-label="Filtrage par statut"
            style={{
              display: "flex",
              gap: 2,
              padding: 10,
              borderBottom: "1px solid var(--ink-150)",
            }}
          >
            {(
              [
                { id: "all", label: "Toutes" },
                { id: "active", label: "Actives" },
                { id: "dua_expired", label: "DUA expirée" },
                { id: "external_pending", label: "À pousser" },
              ] as { id: Scope; label: string }[]
            ).map((t) => {
              const active = scope === t.id
              return (
                <Link
                  key={t.id}
                  href={`/archives?scope=${t.id}`}
                  aria-current={active ? "page" : undefined}
                  style={{
                    padding: "6px 10px",
                    fontSize: 12,
                    fontWeight: active ? 700 : 500,
                    color: active ? "var(--primary-700)" : "var(--ink-700)",
                    background: active ? "var(--primary-50)" : "transparent",
                    borderRadius: 4,
                    textDecoration: "none",
                  }}
                >
                  {t.label}
                </Link>
              )
            })}
          </nav>

          {list.length === 0 ? (
            <div
              style={{
                padding: 32,
                textAlign: "center",
                color: "var(--ink-500)",
                fontSize: 13,
              }}
            >
              Aucune archive dans cette vue.
            </div>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th scope="col">Cote</Th>
                  <Th scope="col">Description</Th>
                  <Th scope="col">Versé le</Th>
                  <Th scope="col">DUA</Th>
                  <Th scope="col">Statut</Th>
                  <Th scope="col">Sort final</Th>
                  <Th scope="col">Empreinte</Th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <Tr key={r.cote}>
                    <Td>
                      <Link
                        href={`/archives/${encodeURIComponent(r.cote)}`}
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 12,
                          color: "var(--primary-600)",
                          textDecoration: "underline",
                        }}
                      >
                        {r.cote}
                      </Link>
                    </Td>
                    <Td>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>
                        {r.description}
                      </div>
                      {r.externalStatus === "pending_dispatch" && (
                        <Badge tone="warning" size="sm">
                          En attente SAE
                        </Badge>
                      )}
                    </Td>
                    <Td style={{ fontSize: 12.5, color: "var(--ink-700)" }}>
                      {longDate(r.versedAt)}
                    </Td>
                    <Td style={{ fontSize: 12.5 }}>
                      {r.dua}
                      {r.duaExpiresAt && r.duaExpiresAt < Date.now() && (
                        <Badge tone="danger" size="sm" style={{ marginLeft: 4 }}>
                          Expirée
                        </Badge>
                      )}
                    </Td>
                    <Td>
                      <StatusBadge status={r.status} />
                    </Td>
                    <Td style={{ fontSize: 12.5, color: "var(--ink-700)" }}>
                      {r.finalSort}
                    </Td>
                    <Td
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        color: "var(--ink-500)",
                      }}
                    >
                      {r.sha256Short}…
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        {/* Empty for placeholder */}
        {!providerLocal && (
          <Card>
            <SectionHeading
              title="Bordereaux d'élimination"
              subtitle="Gérés par le SAE national. Consultez la console SAE pour visualiser et valider les bordereaux."
              level={3}
            />
          </Card>
        )}
      </main>
    </>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; tone: Tone }> = {
    active: { label: "Active", tone: "success" },
    pending: { label: "En attente", tone: "warning" },
    semi_active: { label: "Semi-active", tone: "info" },
    scheduled_destruction: { label: "Élim. planifiée", tone: "warning" },
    destroyed: { label: "Détruite", tone: "neutral" },
    archived: { label: "Archivée", tone: "neutral" },
  }
  const m = map[status] ?? { label: status, tone: "neutral" as const }
  return (
    <Badge tone={m.tone} size="sm">
      {m.label}
    </Badge>
  )
}
