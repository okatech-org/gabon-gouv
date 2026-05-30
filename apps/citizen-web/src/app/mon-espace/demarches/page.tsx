import Link from "next/link"
import {
  Badge,
  Button,
  Card,
  Icon,
  PageHeader,
  Progress,
  StatCard,
  Table,
  Td,
  Th,
  Tr,
  type Tone,
} from "@workspace/ui"
import { api } from "@workspace/backend/generated"
import { getCitizenConvex } from "@/lib/convex"
import { requireCurrentSession } from "@/lib/current-citizen"

const FILTERS = [
  { id: "all", label: "Toutes" },
  { id: "in_progress", label: "En cours" },
  { id: "waiting_pieces", label: "Pièces à fournir" },
  { id: "issued", label: "Délivrées" },
  { id: "rejected", label: "Rejetées" },
  { id: "cancelled", label: "Annulées" },
] as const

type FilterId = (typeof FILTERS)[number]["id"]

interface PageProps {
  searchParams: Promise<{ statut?: string }>
}

export default async function CitizenRequestsListPage({
  searchParams,
}: PageProps) {
  const sp = await searchParams
  const filter = (FILTERS.find((f) => f.id === sp.statut)?.id ??
    "all") as FilterId

  const session = await requireCurrentSession()
  const convex = await getCitizenConvex(session)
  const { requests, stats } = await convex.query(
    api.citizen.requests.listMyRequests,
    {},
  )

  // Filtre côté serveur (rendu rapide, fonctionne sans JS)
  const filtered = requests.filter((r) => matchesFilter(r, filter))

  return (
    <>
      <PageHeader
        breadcrumbs={["Mon espace", "Mes demandes"]}
        title="Mes demandes"
        subtitle={
          stats.total === 0
            ? "Vous n'avez encore déposé aucune démarche."
            : `${stats.total} démarche${stats.total > 1 ? "s" : ""} · ${stats.inProgress} en cours, ${stats.issued} délivrée${stats.issued > 1 ? "s" : ""}.`
        }
        actions={
          <Link
            href="/mon-espace/demarches/nouvelle"
            style={{ textDecoration: "none", display: "inline-flex" }}
          >
            <Button icon="plus" aria-label="Déposer une nouvelle démarche">
              Nouvelle démarche
            </Button>
          </Link>
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
        {/* KPI compteurs */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 12,
          }}
          role="group"
          aria-label="Statistiques de mes demandes"
        >
          <StatCard label="Total" value={String(stats.total)} icon="inbox" />
          <StatCard
            label="En cours"
            value={String(stats.inProgress)}
            icon="refresh"
          />
          <StatCard
            label="Pièces à fournir"
            value={String(stats.waitingPieces)}
            icon="alertTriangle"
            accent={stats.waitingPieces > 0}
          />
          <StatCard
            label="Délivrées"
            value={String(stats.issued)}
            icon="checkCircle"
          />
          <StatCard
            label="Refusées / annulées"
            value={String(stats.rejected + stats.cancelled)}
            icon="x"
          />
        </div>

        {/* Filtres par statut — pills semantic <a> pour fonctionner sans JS */}
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
              const count = countFor(stats, f.id)
              return (
                <li key={f.id}>
                  <Link
                    href={
                      f.id === "all"
                        ? "/mon-espace/demarches"
                        : `/mon-espace/demarches?statut=${f.id}`
                    }
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
                      transition: "background .12s, border-color .12s",
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
                      aria-label={`${count} demande${count > 1 ? "s" : ""}`}
                    >
                      {count}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Table — vide ou peuplée */}
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
                name="inbox"
                size={36}
                style={{ color: "var(--ink-400)", marginBottom: 12 }}
              />
              <h2 style={{ fontSize: 17, marginBottom: 6 }}>
                Aucune démarche dans cette catégorie
              </h2>
              <p style={{ fontSize: 14, color: "var(--ink-600)" }}>
                {filter === "all"
                  ? "Lancez votre première démarche depuis l'accueil."
                  : "Essayez un autre filtre."}
              </p>
              {filter === "all" && (
                <div style={{ marginTop: 16 }}>
                  <Link
                    href="/mon-espace/demarches/nouvelle"
                    style={{ textDecoration: "none" }}
                  >
                    <Button icon="plus">Nouvelle démarche</Button>
                  </Link>
                </div>
              )}
            </div>
          </Card>
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
              {filtered.length} démarche{filtered.length > 1 ? "s" : ""}{" "}
              affichée{filtered.length > 1 ? "s" : ""} sur {stats.total}
            </caption>
            <thead>
              <tr>
                <Th scope="col">Démarche</Th>
                <Th scope="col">Administration</Th>
                <Th scope="col">Référence</Th>
                <Th scope="col">Déposée le</Th>
                <Th scope="col">Statut</Th>
                <Th scope="col">Avancement</Th>
                <Th scope="col">
                  <span className="sr-only">Action</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <Tr key={r.ref}>
                  <Td>
                    <Link
                      href={`/mon-espace/demarches/${r.ref}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        textDecoration: "none",
                        color: "inherit",
                      }}
                      aria-label={`Voir le suivi de ${r.title}, référence ${r.ref}`}
                    >
                      <Icon
                        name="fileText"
                        size={16}
                        style={{ color: "var(--ink-500)", flexShrink: 0 }}
                        aria-hidden="true"
                      />
                      <span style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontWeight: 600 }}>{r.title}</span>
                        <span
                          style={{
                            fontSize: 12,
                            color: "var(--ink-500)",
                          }}
                        >
                          {r.category}
                        </span>
                      </span>
                      {r.unreadFromAgent > 0 && (
                        <Badge tone="danger" size="sm" dot>
                          {r.unreadFromAgent} nouveau{r.unreadFromAgent > 1 ? "x" : ""}
                        </Badge>
                      )}
                      {r.missingPiecesCount > 0 && (
                        <Badge tone="warning" size="sm" dot>
                          {r.missingPiecesCount} pièce
                          {r.missingPiecesCount > 1 ? "s" : ""} à fournir
                        </Badge>
                      )}
                    </Link>
                  </Td>
                  <Td style={{ color: "var(--ink-600)" }}>{r.org}</Td>
                  <Td
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                    }}
                  >
                    <span aria-label={`Référence ${r.ref}`}>{r.ref}</span>
                  </Td>
                  <Td>
                    <time dateTime={new Date(r.depositedAtMs).toISOString()}>
                      {r.depositedAt}
                    </time>
                  </Td>
                  <Td>
                    <Badge tone={r.tone as Tone} dot>
                      {r.status}
                    </Badge>
                  </Td>
                  <Td style={{ minWidth: 160 }}>
                    <Progress
                      value={r.progress}
                      label={`${r.progress} %`}
                      tone={r.progress === 100 ? "success" : "primary"}
                    />
                  </Td>
                  <Td>
                    <Icon
                      name="chevronRight"
                      size={16}
                      style={{ color: "var(--ink-400)" }}
                      aria-hidden="true"
                    />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </>
  )
}

function matchesFilter(
  r: { rawStatus: string; missingPiecesCount: number },
  filter: FilterId,
): boolean {
  switch (filter) {
    case "all":
      return true
    case "in_progress":
      return [
        "submitted",
        "in_instruction",
        "waiting_pieces",
        "waiting_registry",
        "prepared",
        "to_sign",
      ].includes(r.rawStatus)
    case "waiting_pieces":
      return r.missingPiecesCount > 0 || r.rawStatus === "waiting_pieces"
    case "issued":
      return r.rawStatus === "issued"
    case "rejected":
      return r.rawStatus === "rejected"
    case "cancelled":
      return r.rawStatus === "cancelled"
  }
}

function countFor(
  stats: { total: number; inProgress: number; issued: number; rejected: number; cancelled: number; waitingPieces: number },
  filter: FilterId,
): number {
  switch (filter) {
    case "all":
      return stats.total
    case "in_progress":
      return stats.inProgress
    case "waiting_pieces":
      return stats.waitingPieces
    case "issued":
      return stats.issued
    case "rejected":
      return stats.rejected
    case "cancelled":
      return stats.cancelled
  }
}
