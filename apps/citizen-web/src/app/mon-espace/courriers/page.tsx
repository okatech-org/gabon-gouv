import Link from "next/link"
import { Badge, Button, Card, Icon, PageHeader } from "@workspace/ui"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"
import { requireCurrentSession } from "@/lib/current-citizen"

/**
 * Page citoyen /mon-espace/courriers (Bloc 5).
 *
 * Affiche :
 *   - boîte de réception (corres reçues par le citoyen)
 *   - boîte d'envoi (corres créées par le citoyen)
 *   - bouton "Écrire à une administration" → /nouveau
 *
 * Lecture seule pour la liste — l'AR + reply sont sur la page thread.
 */
interface ListItem {
  ref: string
  subject: string
  kind?: string
  urgent: boolean
  status: string
  confidentiality: string
  sentAt?: number
  dueAckAt?: number
  side: "inbox" | "sent"
  from: string
}

export default async function CitizenCourriersPage() {
  const session = await requireCurrentSession()
  const res = (await convex.query(
    api.citizen.correspondence.citizenListInbox,
    { idnSub: session.idnSub },
  )) as { inbox: ListItem[]; sent: ListItem[] }

  return (
    <>
      <PageHeader
        breadcrumbs={["Courriers officiels"]}
        title="Mes courriers officiels"
        subtitle="Échanges formels avec les administrations gabonaises."
        actions={
          <Link
            href="/mon-espace/courriers/nouveau"
            style={{ textDecoration: "none" }}
          >
            <Button icon="plus">Écrire à une administration</Button>
          </Link>
        }
      />
      <div
        style={{
          padding: "24px 32px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
          maxWidth: 1200,
          width: "100%",
        }}
      >
        <Section
          title="Reçus"
          icon="inbox"
          items={res.inbox}
          emptyMessage="Aucun courrier reçu pour le moment."
        />
        <Section
          title="Envoyés"
          icon="arrowRight"
          items={res.sent}
          emptyMessage="Vous n'avez pas encore envoyé de courrier."
        />
      </div>
    </>
  )
}

function Section({
  title,
  icon,
  items,
  emptyMessage,
}: {
  title: string
  icon: "inbox" | "arrowRight"
  items: ListItem[]
  emptyMessage: string
}) {
  return (
    <section aria-labelledby={`sect-${title}`}>
      <h2
        id={`sect-${title}`}
        style={{
          fontSize: 14,
          fontWeight: 700,
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Icon name={icon} size={16} aria-hidden="true" />
        {title} ({items.length})
      </h2>
      {items.length === 0 ? (
        <Card>
          <p
            style={{
              fontSize: 13,
              color: "var(--ink-500)",
              textAlign: "center",
              padding: 16,
              margin: 0,
            }}
          >
            {emptyMessage}
          </p>
        </Card>
      ) : (
        <ul
          style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}
          aria-label={`Liste ${title}`}
        >
          {items.map((it) => (
            <li key={it.ref}>
              <Link
                href={`/mon-espace/courriers/${it.ref}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <Card>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 12,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          marginBottom: 4,
                        }}
                      >
                        {it.subject}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--ink-600)",
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <span>{it.from}</span>
                        <span style={{ fontFamily: "var(--font-mono)" }}>
                          {it.ref}
                        </span>
                        <span>{formatRelative(it.sentAt)}</span>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                        alignItems: "flex-end",
                      }}
                    >
                      {it.urgent && (
                        <Badge tone="danger" size="sm" icon="alertTriangle">
                          Urgent
                        </Badge>
                      )}
                      <StatusBadge status={it.status} />
                    </div>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<
    string,
    {
      tone: "neutral" | "info" | "warning" | "success" | "danger"
      label: string
    }
  > = {
    sent: { tone: "info", label: "Envoyé" },
    acknowledged: { tone: "info", label: "Reçu" },
    replied: { tone: "success", label: "Répondu" },
    closed: { tone: "neutral", label: "Clôturé" },
    archived: { tone: "neutral", label: "Archivé" },
    recalled: { tone: "danger", label: "Rappelé" },
    draft: { tone: "neutral", label: "Brouillon" },
    pending_signature: { tone: "warning", label: "En attente" },
  }
  const m = map[status] ?? { tone: "neutral" as const, label: status }
  return (
    <Badge tone={m.tone} size="sm">
      {m.label}
    </Badge>
  )
}

function formatRelative(ms?: number): string {
  if (!ms) return "—"
  const diff = Date.now() - ms
  if (diff < 86_400_000) return `il y a ${Math.round(diff / 3_600_000)} h`
  return new Date(ms).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}
