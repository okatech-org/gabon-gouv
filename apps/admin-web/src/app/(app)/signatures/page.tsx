import Link from "next/link"
import { redirect } from "next/navigation"
import { Badge, Card, Icon, PageHeader, SectionHeading } from "@workspace/ui"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"
import { getCurrentAgent } from "@/lib/current-agent"
import { longDate, relativeTime } from "@/lib/format"
import { SignatureTabs } from "./signature-tabs"
import { SignatureCard } from "./signature-card"

interface SignatureRow {
  stepId: string
  circuitId: string
  stepOrder: number
  stepsTotal: number
  stepStatus: string
  decidedAt?: number
  comment?: string
  document: {
    id: string
    actNumber: string
    title: string
    status?: string
    hasPdf: boolean
  }
  request: {
    ref: string
    urgent: boolean
    depositedAt: number
    dueAt?: number
  }
  citizen?: { name: string; nip: string } | null
  service?: { title: string; category: string } | null
}

interface PageProps {
  searchParams: Promise<{ scope?: string }>
}

/**
 * Page « Mes signatures » — point d'entrée des officiers signataires
 * (et autres agents susceptibles d'être assignees d'un step).
 *
 * Tabs URL-driven :
 *   - `?scope=pending` (défaut) → steps `active` qui m'attendent
 *   - `?scope=recent` → mes 30 dernières décisions (approuvées + refusées)
 */
export default async function SignaturesPage({ searchParams }: PageProps) {
  const session = await getCurrentAgent()
  if (!session) redirect("/login")

  const sp = await searchParams
  const scope: "pending" | "recent" =
    sp.scope === "recent" ? "recent" : "pending"

  const rows = (await convex.query(api.admin.signatures.listMine, {
    token: session.token,
    scope,
  })) as SignatureRow[]

  const pendingCount =
    scope === "pending"
      ? rows.length
      : ((await convex.query(api.admin.signatures.countMyPending, {
          token: session.token,
        })) as number)

  return (
    <>
      <PageHeader
        title="Mes signatures"
        subtitle={
          scope === "pending"
            ? `${pendingCount} acte${pendingCount > 1 ? "s" : ""} en attente de votre décision`
            : "Vos 30 dernières décisions de signature"
        }
      />

      <div style={{ padding: "20px 32px", display: "flex", flexDirection: "column", gap: 16 }}>
        <SignatureTabs
          currentScope={scope}
          pendingCount={pendingCount}
        />

        {rows.length === 0 ? (
          <EmptyState scope={scope} />
        ) : (
          <ul
            aria-label={
              scope === "pending"
                ? "Signatures en attente"
                : "Décisions récentes"
            }
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {rows.map((row) => (
              <li key={row.stepId}>
                <SignatureCard
                  circuitId={row.circuitId}
                  stepOrder={row.stepOrder}
                  stepsTotal={row.stepsTotal}
                  stepStatus={row.stepStatus}
                  decidedAt={row.decidedAt}
                  comment={row.comment}
                  document={row.document}
                  request={row.request}
                  citizen={row.citizen}
                  service={row.service}
                  agentName={session.agent.name}
                  scope={scope}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

function EmptyState({ scope }: { scope: "pending" | "recent" }) {
  return (
    <Card>
      <div
        style={{
          padding: "48px 24px",
          textAlign: "center",
          color: "var(--ink-600)",
        }}
      >
        <Icon
          name="check"
          size={32}
          style={{ color: "var(--success-500)", marginBottom: 12 }}
          aria-hidden="true"
        />
        <SectionHeading
          title={
            scope === "pending"
              ? "Aucune signature en attente"
              : "Aucune décision récente"
          }
          subtitle={
            scope === "pending"
              ? "Vous êtes à jour. Toutes les demandes prêtes à signer sont traitées."
              : "Vos décisions de signature apparaîtront ici une fois prises."
          }
          level={3}
        />
        {scope === "pending" && (
          <p style={{ marginTop: 16, fontSize: 13 }}>
            <Link
              href="/demandes"
              style={{ color: "var(--primary-600)", textDecoration: "underline" }}
            >
              Voir la file de demandes
            </Link>
          </p>
        )}
      </div>
    </Card>
  )
}

// Helpers ré-exportés pour usage dans les composants client (formatage)
export { longDate, relativeTime }
// (Re-export pour assurer le treeshake côté Next.js)
void Badge
