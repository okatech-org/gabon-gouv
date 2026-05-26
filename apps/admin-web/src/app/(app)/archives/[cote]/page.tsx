import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import {
  Badge,
  Card,
  Icon,
  PageHeader,
  SectionHeading,
  type Tone,
} from "@workspace/ui"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"
import { getCurrentAgent } from "@/lib/current-agent"
import { longDate } from "@/lib/format"

/**
 * Page détail d'une archive — Bloc 6 (Option C hybride).
 *
 * Consultation seule. Affiche tous les champs (cote, dua, sha256 complet,
 * timestamp qualifié, statut local + externe) et les liens vers la demande,
 * le document et la correspondance associés.
 */

interface ArchiveDetail {
  id: string
  cote: string
  description: string
  versedAt: number
  dua: string
  duaExpiresAt?: number
  status: string
  finalSort: string
  sha256Short: string
  sha256: string
  qualifiedTimestamp?: string
  sizeBytes?: number
  storageReplicas?: string[]
  lastIntegrityCheckAt?: number
  lastIntegrityCheckOutcome?: string
  externalSaeId?: string
  externalSaeKind?: string
  externalStatus?: string
  externalStatusUpdatedAt?: number
  linkedRequest?: { ref: string; status: string } | null
  linkedDocument?: { actNumber: string; status?: string } | null
  linkedCorrespondence?: { ref: string; subject: string } | null
}

export default async function ArchiveDetailPage({
  params,
}: {
  params: Promise<{ cote: string }>
}) {
  const session = await getCurrentAgent()
  if (!session) redirect("/login")
  const { cote: encodedCote } = await params
  const cote = decodeURIComponent(encodedCote)

  const archive = (await convex.query(api.admin.archives.getDetail, {
    token: session.token,
    cote,
  })) as ArchiveDetail | null
  if (!archive) notFound()

  return (
    <>
      <PageHeader
        breadcrumbs={[
          <Link key="a" href="/archives" style={{ color: "inherit" }}>
            Archives
          </Link>,
          archive.cote,
        ]}
        title={archive.description}
        subtitle={
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>
            {archive.cote}
          </span>
        }
      />
      <div
        style={{
          padding: "20px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          maxWidth: 1000,
          flex: 1,
        }}
      >
        {/* Statut + DUA */}
        <Card>
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <StatusBadge status={archive.status} />
            {archive.externalStatus && (
              <Badge tone="info" size="sm" icon="cloud">
                SAE externe : {archive.externalStatus}
              </Badge>
            )}
            {archive.duaExpiresAt &&
              archive.duaExpiresAt < Date.now() &&
              archive.status === "active" && (
                <Badge tone="danger" size="sm" icon="alertTriangle">
                  DUA expirée
                </Badge>
              )}
          </div>
        </Card>

        {/* Métadonnées principales */}
        <Card>
          <SectionHeading title="Métadonnées" level={2} />
          <dl
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(180px, max-content) 1fr",
              gap: "8px 24px",
              fontSize: 13,
              margin: 0,
            }}
          >
            <dt style={{ color: "var(--ink-500)" }}>Cote</dt>
            <dd
              style={{
                margin: 0,
                fontFamily: "var(--font-mono)",
                fontWeight: 600,
              }}
            >
              {archive.cote}
            </dd>
            <dt style={{ color: "var(--ink-500)" }}>Versée le</dt>
            <dd style={{ margin: 0 }}>{longDate(archive.versedAt)}</dd>
            <dt style={{ color: "var(--ink-500)" }}>
              Durée d&apos;utilité (DUA)
            </dt>
            <dd style={{ margin: 0 }}>
              {archive.dua}
              {archive.duaExpiresAt && (
                <span style={{ color: "var(--ink-500)" }}>
                  {" "}
                  · expire le {longDate(archive.duaExpiresAt)}
                </span>
              )}
            </dd>
            <dt style={{ color: "var(--ink-500)" }}>Sort final</dt>
            <dd style={{ margin: 0 }}>{archive.finalSort}</dd>
            {archive.sizeBytes && (
              <>
                <dt style={{ color: "var(--ink-500)" }}>Taille</dt>
                <dd style={{ margin: 0 }}>{formatBytes(archive.sizeBytes)}</dd>
              </>
            )}
            {archive.storageReplicas && archive.storageReplicas.length > 0 && (
              <>
                <dt style={{ color: "var(--ink-500)" }}>Réplication</dt>
                <dd style={{ margin: 0 }}>
                  {archive.storageReplicas.join(" + ")}
                </dd>
              </>
            )}
          </dl>
        </Card>

        {/* Empreinte + horodatage */}
        <Card>
          <SectionHeading title="Authenticité" level={2} />
          <dl
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(180px, max-content) 1fr",
              gap: "8px 24px",
              fontSize: 13,
              margin: 0,
            }}
          >
            <dt style={{ color: "var(--ink-500)" }}>Empreinte SHA-256</dt>
            <dd
              style={{
                margin: 0,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                wordBreak: "break-all",
              }}
            >
              {archive.sha256}
            </dd>
            {archive.qualifiedTimestamp && (
              <>
                <dt style={{ color: "var(--ink-500)" }}>Horodatage qualifié</dt>
                <dd style={{ margin: 0, fontFamily: "var(--font-mono)" }}>
                  {archive.qualifiedTimestamp}
                </dd>
              </>
            )}
            {archive.lastIntegrityCheckAt && (
              <>
                <dt style={{ color: "var(--ink-500)" }}>
                  Dernier contrôle d&apos;intégrité
                </dt>
                <dd style={{ margin: 0 }}>
                  {longDate(archive.lastIntegrityCheckAt)}
                  {archive.lastIntegrityCheckOutcome && (
                    <Badge
                      tone={
                        archive.lastIntegrityCheckOutcome === "ok"
                          ? "success"
                          : "danger"
                      }
                      size="sm"
                      style={{ marginLeft: 8 }}
                    >
                      {archive.lastIntegrityCheckOutcome}
                    </Badge>
                  )}
                </dd>
              </>
            )}
          </dl>
        </Card>

        {/* Liens vers les entités source */}
        {(archive.linkedRequest ||
          archive.linkedDocument ||
          archive.linkedCorrespondence) && (
          <Card>
            <SectionHeading title="Entités liées" level={2} />
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {archive.linkedRequest && (
                <li>
                  <Link
                    href={`/demandes/${archive.linkedRequest.ref}`}
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      padding: 8,
                      border: "1px solid var(--ink-200)",
                      borderRadius: 6,
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <Icon name="folder" size={14} aria-hidden="true" />
                    <span style={{ flex: 1 }}>
                      Demande {archive.linkedRequest.ref}
                    </span>
                    <Badge tone="neutral" size="sm">
                      {archive.linkedRequest.status}
                    </Badge>
                  </Link>
                </li>
              )}
              {archive.linkedDocument && (
                <li>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      padding: 8,
                      border: "1px solid var(--ink-200)",
                      borderRadius: 6,
                    }}
                  >
                    <Icon name="fileText" size={14} aria-hidden="true" />
                    <span style={{ flex: 1 }}>
                      Acte {archive.linkedDocument.actNumber}
                    </span>
                    {archive.linkedDocument.status && (
                      <Badge tone="neutral" size="sm">
                        {archive.linkedDocument.status}
                      </Badge>
                    )}
                  </div>
                </li>
              )}
              {archive.linkedCorrespondence && (
                <li>
                  <Link
                    href={`/correspondance/${archive.linkedCorrespondence.ref}`}
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      padding: 8,
                      border: "1px solid var(--ink-200)",
                      borderRadius: 6,
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <Icon name="mail" size={14} aria-hidden="true" />
                    <span style={{ flex: 1 }}>
                      Correspondance {archive.linkedCorrespondence.ref} —{" "}
                      {archive.linkedCorrespondence.subject}
                    </span>
                  </Link>
                </li>
              )}
            </ul>
          </Card>
        )}

        {/* SAE externe */}
        {archive.externalSaeId && (
          <Card>
            <SectionHeading
              title="SAE externe"
              subtitle={`Provider : ${archive.externalSaeKind ?? "—"}`}
              level={2}
            />
            <dl
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(180px, max-content) 1fr",
                gap: "8px 24px",
                fontSize: 13,
                margin: 0,
              }}
            >
              <dt style={{ color: "var(--ink-500)" }}>Identifiant externe</dt>
              <dd
                style={{
                  margin: 0,
                  fontFamily: "var(--font-mono)",
                }}
              >
                {archive.externalSaeId}
              </dd>
              <dt style={{ color: "var(--ink-500)" }}>Statut externe</dt>
              <dd style={{ margin: 0 }}>{archive.externalStatus ?? "—"}</dd>
              {archive.externalStatusUpdatedAt && (
                <>
                  <dt style={{ color: "var(--ink-500)" }}>Mis à jour</dt>
                  <dd style={{ margin: 0 }}>
                    {longDate(archive.externalStatusUpdatedAt)}
                  </dd>
                </>
              )}
            </dl>
          </Card>
        )}
      </div>
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
    <Badge tone={m.tone}>{m.label}</Badge>
  )
}

function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} Go`
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} Mo`
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(0)} Ko`
  return `${bytes} o`
}
