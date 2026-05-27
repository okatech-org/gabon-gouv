import Link from "next/link"
import { redirect } from "next/navigation"
import {
  Badge,
  Card,
  Icon,
  PageHeader,
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
import { relativeTime } from "@/lib/format"

/**
 * Page liste `/generation` admin (fix B3 — précédemment, la sidebar
 * pointait vers une ref de demande hardcodée
 * `/generation/GC-2026-EC-002841` faute de page liste).
 *
 * Affiche tous les documents (en préparation, signés, émis, révoqués)
 * de l'organisme. Tri par statut puis date.
 */

export const dynamic = "force-dynamic"

export default async function GenerationListPage() {
  const session = await getCurrentAgent()
  if (!session) redirect("/login")

  const data = await convex.query(api.admin.documents.listGenerationQueue, {
    token: session.token,
  })

  return (
    <>
      <PageHeader
        breadcrumbs={["Mon espace", "Génération"]}
        title="File de génération des actes"
        subtitle={`${data.stats.total} acte${data.stats.total > 1 ? "s" : ""} au total · ${data.stats.inFlight} en cours · ${data.stats.issued} émis · ${data.stats.revoked} révoqué${data.stats.revoked > 1 ? "s" : ""}.`}
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
        {/* KPI */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
          }}
          role="group"
          aria-label="Statistiques génération"
        >
          <StatCard
            label="Total"
            value={String(data.stats.total)}
            icon="fileText"
          />
          <StatCard
            label="En cours"
            value={String(data.stats.inFlight)}
            icon="clock"
            hint="Draft / préparé / signé"
          />
          <StatCard
            label="Émis"
            value={String(data.stats.issued)}
            icon="checkCircle"
          />
          <StatCard
            label="Révoqués"
            value={String(data.stats.revoked)}
            icon="alertTriangle"
          />
        </div>

        <Card padded={false}>
          {data.rows.length === 0 ? (
            <div
              style={{
                padding: 48,
                textAlign: "center",
                color: "var(--ink-600)",
              }}
            >
              <Icon
                name="fileText"
                size={36}
                aria-hidden="true"
                style={{ color: "var(--ink-400)", marginBottom: 12 }}
              />
              <p style={{ fontSize: 14, margin: 0 }}>
                Aucun acte généré pour le moment.
              </p>
            </div>
          ) : (
            <Table>
              <caption className="sr-only">
                Liste des {data.rows.length} acte
                {data.rows.length > 1 ? "s" : ""}
              </caption>
              <thead>
                <tr>
                  <Th scope="col">N° d&apos;acte</Th>
                  <Th scope="col">Type</Th>
                  <Th scope="col">Citoyen</Th>
                  <Th scope="col">Demande</Th>
                  <Th scope="col">Statut</Th>
                  <Th scope="col">PDF</Th>
                  <Th scope="col">Émis le</Th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <Tr key={r.documentId}>
                    <Td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                      <Link
                        href={`/generation/${r.requestRef}`}
                        style={{
                          color: "var(--primary-600)",
                          textDecoration: "underline",
                          fontWeight: 600,
                        }}
                      >
                        {r.actNumber}
                      </Link>
                    </Td>
                    <Td style={{ fontSize: 13 }}>{r.title}</Td>
                    <Td style={{ fontSize: 13 }}>{r.citizenName}</Td>
                    <Td
                      style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}
                    >
                      <Link
                        href={`/demandes/${r.requestRef}`}
                        style={{
                          color: "var(--primary-600)",
                          textDecoration: "underline",
                        }}
                      >
                        {r.requestRef}
                      </Link>
                    </Td>
                    <Td>
                      <Badge tone={statusTone(r.status)} size="sm">
                        {statusLabel(r.status)}
                      </Badge>
                    </Td>
                    <Td>
                      {r.hasPdf ? (
                        <Badge tone="success" size="sm" icon="checkCircle">
                          Disponible
                        </Badge>
                      ) : (
                        <Badge tone="neutral" size="sm">
                          En attente
                        </Badge>
                      )}
                    </Td>
                    <Td style={{ fontSize: 12.5, color: "var(--ink-700)" }}>
                      {relativeTime(r.issuedAt)}
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

function statusLabel(status: string): string {
  switch (status) {
    case "draft":
      return "Brouillon"
    case "prepared":
      return "Préparé"
    case "signed":
      return "Signé"
    case "issued":
      return "Émis"
    case "revoked":
      return "Révoqué"
    default:
      return status
  }
}

function statusTone(status: string): Tone {
  switch (status) {
    case "draft":
      return "neutral"
    case "prepared":
      return "info"
    case "signed":
      return "warning"
    case "issued":
      return "success"
    case "revoked":
      return "danger"
    default:
      return "neutral"
  }
}
