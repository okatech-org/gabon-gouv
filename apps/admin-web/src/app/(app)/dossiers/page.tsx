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
} from "@workspace/ui"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"
import { getCurrentAgent } from "@/lib/current-agent"
import { relativeTime } from "@/lib/format"

/**
 * Page liste `/dossiers` admin (fix B2 — précédemment, la sidebar
 * pointait vers un NIP hardcodé `/dossiers/184127600504` faute de
 * page liste).
 *
 * Affiche les citoyens distincts qui ont au moins une demande dans
 * l'organisme de l'agent connecté, triés par dernière interaction.
 */

export const dynamic = "force-dynamic"

interface PageProps {
  searchParams: Promise<{ search?: string }>
}

export default async function DossiersPage({ searchParams }: PageProps) {
  const session = await getCurrentAgent()
  if (!session) redirect("/login")
  const sp = await searchParams
  const search = sp.search?.trim() || undefined

  const { total, rows } = await convex.query(api.admin.citizens.listFolders, {
    token: session.token,
    search,
  })

  const verifiedCount = rows.filter((r) => r.identityVerified).length

  return (
    <>
      <PageHeader
        breadcrumbs={["Mon espace", "Dossiers citoyens"]}
        title="Dossiers citoyens"
        subtitle={`${total} citoyen${total > 1 ? "s" : ""} ${total > 1 ? "ont" : "a"} eu au moins une démarche avec ${session.agent.organism?.shortName ?? "votre organisme"}.`}
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
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 12,
            maxWidth: 560,
          }}
          role="group"
          aria-label="Statistiques dossiers"
        >
          <StatCard label="Total dossiers" value={String(total)} icon="folder" />
          <StatCard
            label="Identité vérifiée"
            value={String(verifiedCount)}
            icon="checkCircle"
          />
        </div>

        {/* Recherche */}
        <form
          action=""
          method="get"
          style={{ display: "flex", gap: 8, maxWidth: 480 }}
        >
          <input
            type="search"
            name="search"
            defaultValue={search ?? ""}
            placeholder="Rechercher par nom, NIP ou e-mail…"
            style={{
              flex: 1,
              padding: "8px 12px",
              fontSize: 14,
              border: "1px solid var(--ink-300)",
              borderRadius: 6,
            }}
          />
          <button
            type="submit"
            style={{
              padding: "8px 16px",
              background: "var(--primary-500)",
              color: "white",
              border: "none",
              borderRadius: 6,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Rechercher
          </button>
        </form>

        <Card padded={false}>
          {rows.length === 0 ? (
            <div
              style={{
                padding: 48,
                textAlign: "center",
                color: "var(--ink-600)",
              }}
            >
              <Icon
                name="folder"
                size={36}
                aria-hidden="true"
                style={{ color: "var(--ink-400)", marginBottom: 12 }}
              />
              <p style={{ fontSize: 14, margin: 0 }}>
                {search
                  ? "Aucun dossier ne correspond à votre recherche."
                  : "Aucun dossier citoyen pour le moment."}
              </p>
            </div>
          ) : (
            <Table>
              <caption className="sr-only">
                Liste des {rows.length} dossier{rows.length > 1 ? "s" : ""}{" "}
                citoyen{rows.length > 1 ? "s" : ""}
              </caption>
              <thead>
                <tr>
                  <Th scope="col">Citoyen</Th>
                  <Th scope="col">NIP</Th>
                  <Th scope="col">Demandes</Th>
                  <Th scope="col">Dernière interaction</Th>
                  <Th scope="col">Identité</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <Tr key={r.nip}>
                    <Td>
                      <Link
                        href={`/dossiers/${r.nip}`}
                        style={{
                          color: "var(--primary-600)",
                          textDecoration: "underline",
                          fontWeight: 600,
                        }}
                      >
                        {r.name}
                      </Link>
                      {r.email && (
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--ink-500)",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          {r.email}
                        </div>
                      )}
                    </Td>
                    <Td style={{ fontFamily: "var(--font-mono)", fontSize: 12.5 }}>
                      {r.nipFormatted}
                    </Td>
                    <Td
                      style={{
                        fontVariantNumeric: "tabular-nums",
                        fontWeight: 600,
                      }}
                    >
                      {r.requestsCount}
                    </Td>
                    <Td style={{ fontSize: 12.5, color: "var(--ink-700)" }}>
                      <div>{relativeTime(r.lastInteractionAt)}</div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--ink-500)",
                          fontFamily: "var(--font-mono)",
                          marginTop: 2,
                        }}
                      >
                        {r.lastRef}
                      </div>
                    </Td>
                    <Td>
                      {r.identityVerified ? (
                        <Badge tone="success" size="sm" dot>
                          Vérifiée
                        </Badge>
                      ) : (
                        <Badge tone="warning" size="sm" dot>
                          Non vérifiée
                        </Badge>
                      )}
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
