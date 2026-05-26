import Link from "next/link"
import { redirect } from "next/navigation"
import { Badge, Button, Icon, PageHeader } from "@workspace/ui"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"
import { getCurrentAgent } from "@/lib/current-agent"
import { ThreadView, type ThreadData } from "./thread-view"

/**
 * Page principale /correspondance (Bloc 5 — refonte).
 *
 * Layout 3 colonnes URL-driven :
 *   - Colonne 1 : liste des corres (Reçus/Envoyés/Brouillons/Archivés via ?tab)
 *     avec scopes sur Reçus (?scope=untreated|noreply|all)
 *   - Colonne 2 : thread complet de la corres sélectionnée (?ref=CR-XXX)
 *     OU placeholder « sélectionnez un courrier »
 *   - Colonne 3 : panneau meta (destinataires, dossiers liés, circuit)
 *
 * Si aucune corres dans la liste : empty state + CTA « Nouveau courrier ».
 */

interface ListItem {
  ref: string
  subject: string
  kind?: string
  status: string
  urgent: boolean
  confidentiality: string
  sentAt?: number
  dueAckAt?: number
  side: string
  from: string
  attachmentsCount: number
  unread: boolean
}

type Tab = "inbox" | "outbox" | "drafts" | "archived"
type InboxScope = "untreated" | "noreply" | "all"

interface PageProps {
  searchParams: Promise<{
    tab?: string
    scope?: string
    ref?: string
    search?: string
  }>
}

export default async function CorrespondancePage({
  searchParams,
}: PageProps) {
  const session = await getCurrentAgent()
  if (!session) redirect("/login")
  const sp = await searchParams

  const tab: Tab =
    sp.tab === "outbox" || sp.tab === "drafts" || sp.tab === "archived"
      ? sp.tab
      : "inbox"
  const scope: InboxScope =
    sp.scope === "untreated" || sp.scope === "noreply" ? sp.scope : "all"
  const selectedRef = sp.ref
  const search = sp.search?.trim() || undefined

  // Charge la liste selon le tab
  const list = (await loadList(session.token, tab, scope, search)) as ListItem[]
  const counts = (await convex.query(
    api.admin.correspondenceQueries.getInboxCounts,
    { token: session.token },
  )) as { unread: number; untreated: number; urgent: number }

  // Charge le thread sélectionné (si ref valide).
  // Pour récupérer l'Id Convex (nécessaire aux server actions), on requête
  // directement la table correspondances via une query dédiée.
  let thread: ThreadData | null = null
  let correspondenceId = ""
  if (selectedRef) {
    const raw = (await convex
      .query(api.admin.correspondenceQueries.getThreadV2, {
        token: session.token,
        ref: selectedRef,
      })
      .catch(() => null)) as ThreadData | null
    if (raw) {
      thread = raw
      // L'Id n'est pas exposé dans le shape — on le récupère via getId.
      // Phase D : ajouter `id` au shape de getThreadV2 pour économiser cet appel.
      const idLookup = await convex
        .query(api.admin.correspondenceQueries.searchCorrespondences, {
          token: session.token,
          query: selectedRef,
          limit: 1,
        })
        .catch(() => [] as Array<{ ref: string }>)
      void idLookup
      // À défaut, on lit la corres directement via la query getThreadByThreadId
      // qui renvoie aussi des metadata. Pour Phase C v1, on accepte de ne pas
      // pouvoir actioner depuis cette page (l'utilisateur cliquera sur l'URL
      // deep-link `/correspondance/[ref]` pour les actions).
      correspondenceId = "" // hack temporaire
    }
  }

  return (
    <>
      <PageHeader
        breadcrumbs={["Correspondance"]}
        title="Correspondance inter-administrations"
        subtitle="Échanges officiels avec les autres organismes, citoyens et partenaires."
        actions={
          <Link href="/correspondance/nouveau" style={{ textDecoration: "none" }}>
            <Button icon="plus">Nouveau courrier</Button>
          </Link>
        }
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "320px 1fr 320px",
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {/* Colonne 1 — Liste */}
        <aside
          style={{
            borderRight: "1px solid var(--ink-200)",
            display: "flex",
            flexDirection: "column",
            background: "white",
            overflow: "hidden",
          }}
          aria-label="Liste des correspondances"
        >
          <TabsBar tab={tab} counts={counts} />
          {tab === "inbox" && <InboxScopeBar scope={scope} />}
          <ListItems items={list} selectedRef={selectedRef} tab={tab} scope={scope} />
        </aside>

        {/* Colonne 2 — Thread */}
        <section
          aria-label="Détail du courrier sélectionné"
          style={{
            display: "flex",
            flexDirection: "column",
            background: "white",
            overflow: "hidden",
          }}
        >
          {thread ? (
            <ThreadView thread={thread} correspondenceId={correspondenceId} />
          ) : (
            <EmptyState hasItems={list.length > 0} />
          )}
        </section>

        {/* Colonne 3 — Meta */}
        <aside
          style={{
            borderLeft: "1px solid var(--ink-200)",
            padding: 16,
            background: "var(--ink-50)",
            overflow: "auto",
          }}
          aria-label="Métadonnées de la correspondance"
        >
          {thread ? <MetaPanel thread={thread} /> : <MetaEmpty />}
        </aside>
      </div>
    </>
  )
}

/* ============================================================
   Sub-composants UI
   ============================================================ */

function TabsBar({
  tab,
  counts,
}: {
  tab: Tab
  counts: { unread: number; untreated: number; urgent: number }
}) {
  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: "inbox", label: "Reçus", badge: counts.unread },
    { id: "outbox", label: "Envoyés" },
    { id: "drafts", label: "Brouillons" },
    { id: "archived", label: "Archives" },
  ]
  return (
    <nav
      aria-label="Sélection de la boîte"
      style={{
        display: "flex",
        gap: 2,
        padding: 10,
        borderBottom: "1px solid var(--ink-200)",
      }}
    >
      {tabs.map((t) => {
        const active = t.id === tab
        return (
          <Link
            key={t.id}
            href={`/correspondance?tab=${t.id}`}
            aria-current={active ? "page" : undefined}
            style={{
              padding: "6px 10px",
              fontSize: 12,
              fontWeight: active ? 700 : 500,
              color: active ? "var(--primary-700)" : "var(--ink-700)",
              background: active ? "var(--primary-50)" : "transparent",
              borderRadius: 4,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {t.label}
            {typeof t.badge === "number" && t.badge > 0 && (
              <Badge tone="primary" size="sm">
                {t.badge}
              </Badge>
            )}
          </Link>
        )
      })}
    </nav>
  )
}

function InboxScopeBar({ scope }: { scope: InboxScope }) {
  const scopes: { id: InboxScope; label: string }[] = [
    { id: "untreated", label: "À traiter" },
    { id: "noreply", label: "Sans réponse" },
    { id: "all", label: "Tous" },
  ]
  return (
    <div
      role="tablist"
      aria-label="Filtre des reçus"
      style={{
        display: "flex",
        gap: 4,
        padding: "6px 10px",
        borderBottom: "1px solid var(--ink-150)",
        fontSize: 11,
      }}
    >
      {scopes.map((s) => {
        const active = s.id === scope
        return (
          <Link
            key={s.id}
            href={`/correspondance?tab=inbox&scope=${s.id}`}
            role="tab"
            aria-selected={active}
            style={{
              padding: "4px 8px",
              borderRadius: 4,
              textDecoration: "none",
              color: active ? "var(--primary-700)" : "var(--ink-600)",
              background: active ? "var(--primary-50)" : "transparent",
              fontWeight: active ? 700 : 500,
            }}
          >
            {s.label}
          </Link>
        )
      })}
    </div>
  )
}

function ListItems({
  items,
  selectedRef,
  tab,
  scope,
}: {
  items: ListItem[]
  selectedRef?: string
  tab: Tab
  scope: InboxScope
}) {
  if (items.length === 0) {
    return (
      <div
        style={{
          padding: 24,
          textAlign: "center",
          fontSize: 13,
          color: "var(--ink-500)",
        }}
      >
        Aucune correspondance dans cette vue.
      </div>
    )
  }
  return (
    <ul
      style={{
        listStyle: "none",
        padding: 0,
        margin: 0,
        overflow: "auto",
        flex: 1,
      }}
      aria-label="Liste des correspondances"
    >
      {items.map((it) => {
        const selected = it.ref === selectedRef
        const baseQuery = `tab=${tab}${tab === "inbox" ? `&scope=${scope}` : ""}`
        return (
          <li key={it.ref}>
            <Link
              href={`/correspondance?${baseQuery}&ref=${it.ref}`}
              aria-current={selected ? "page" : undefined}
              style={{
                display: "flex",
                gap: 10,
                padding: 12,
                borderBottom: "1px solid var(--ink-150)",
                background: selected
                  ? "var(--primary-50)"
                  : it.unread
                    ? "white"
                    : "var(--ink-50)",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: it.unread ? "var(--primary-500)" : "transparent",
                  marginTop: 8,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12.5,
                    fontWeight: it.unread ? 700 : 600,
                  }}
                >
                  <span
                    style={{
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {it.from}
                  </span>
                  <span style={{ fontSize: 10.5, color: "var(--ink-500)" }}>
                    {formatRelative(it.sentAt)}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    marginTop: 2,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {it.subject}
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 4,
                    marginTop: 4,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      color: "var(--ink-500)",
                    }}
                  >
                    {it.ref}
                  </span>
                  {it.urgent && (
                    <Badge tone="danger" size="sm">
                      Urgent
                    </Badge>
                  )}
                  {it.attachmentsCount > 0 && (
                    <span
                      style={{ fontSize: 10.5, color: "var(--ink-600)" }}
                      aria-label={`${it.attachmentsCount} pièces jointes`}
                    >
                      <Icon name="paperclip" size={10} aria-hidden="true" />{" "}
                      {it.attachmentsCount}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

function EmptyState({ hasItems }: { hasItems: boolean }) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        color: "var(--ink-500)",
        padding: 32,
      }}
    >
      <Icon name="mail" size={40} aria-hidden="true" />
      <p style={{ fontSize: 14, margin: 0 }}>
        {hasItems
          ? "Sélectionnez une correspondance pour voir le détail."
          : "Aucune correspondance ici."}
      </p>
      <Link href="/correspondance/nouveau" style={{ textDecoration: "none" }}>
        <Button icon="plus" variant="primary" size="sm">
          Nouveau courrier
        </Button>
      </Link>
    </div>
  )
}

function MetaEmpty() {
  return (
    <div style={{ fontSize: 12, color: "var(--ink-500)" }}>
      Aucun courrier sélectionné.
    </div>
  )
}

function MetaPanel({ thread }: { thread: ThreadData }) {
  return (
    <>
      {/* Destinataires */}
      <section aria-labelledby="meta-recipients-heading">
        <h3 id="meta-recipients-heading" style={metaSectionTitle}>
          Destinataires
        </h3>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {thread.recipients.map((r) => (
            <li
              key={r.id}
              style={{
                fontSize: 12.5,
                padding: "4px 0",
                display: "flex",
                gap: 6,
              }}
            >
              <Badge tone="neutral" size="sm">
                {r.role.toUpperCase()}
              </Badge>
              <span>{r.name}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Circuit signature */}
      {thread.circuit && (
        <section
          aria-labelledby="meta-circuit-heading"
          style={{ marginTop: 16 }}
        >
          <h3 id="meta-circuit-heading" style={metaSectionTitle}>
            Circuit de signature
          </h3>
          <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {thread.circuit.steps.map((s, i) => (
              <li
                key={i}
                style={{
                  fontSize: 12,
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  padding: "4px 0",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background:
                      s.status === "done"
                        ? "var(--success-500)"
                        : s.status === "active"
                          ? "var(--primary-500)"
                          : "var(--ink-300)",
                    color: "white",
                    fontSize: 10,
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {s.order + 1}
                </span>
                <span style={{ flex: 1 }}>{s.assigneeName}</span>
                <span style={{ color: "var(--ink-500)" }}>{s.status}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Métadonnées techniques */}
      <section style={{ marginTop: 16 }} aria-labelledby="meta-tech-heading">
        <h3 id="meta-tech-heading" style={metaSectionTitle}>
          Métadonnées
        </h3>
        <dl
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: "4px 12px",
            fontSize: 11.5,
            margin: 0,
          }}
        >
          <dt style={{ color: "var(--ink-500)" }}>Référence</dt>
          <dd
            style={{
              margin: 0,
              fontFamily: "var(--font-mono)",
              fontWeight: 600,
            }}
          >
            {thread.ref}
          </dd>
          {thread.kind && (
            <>
              <dt style={{ color: "var(--ink-500)" }}>Type</dt>
              <dd style={{ margin: 0 }}>{thread.kind}</dd>
            </>
          )}
          {thread.dueAckAt && (
            <>
              <dt style={{ color: "var(--ink-500)" }}>Échéance AR</dt>
              <dd style={{ margin: 0 }}>
                {new Date(thread.dueAckAt).toLocaleDateString("fr-FR")}
              </dd>
            </>
          )}
          {thread.duaCode && (
            <>
              <dt style={{ color: "var(--ink-500)" }}>Archivage</dt>
              <dd style={{ margin: 0 }}>{thread.duaCode}</dd>
            </>
          )}
        </dl>
      </section>
    </>
  )
}

/* ============================================================
   Helpers
   ============================================================ */

async function loadList(
  token: string,
  tab: Tab,
  scope: InboxScope,
  search: string | undefined,
): Promise<ListItem[]> {
  if (tab === "outbox") {
    return (await convex.query(api.admin.correspondenceQueries.listOutbox, {
      token,
      search,
    })) as ListItem[]
  }
  if (tab === "drafts") {
    return (await convex.query(api.admin.correspondenceQueries.listDrafts, {
      token,
    })) as ListItem[]
  }
  if (tab === "archived") {
    return (await convex.query(api.admin.correspondenceQueries.listArchived, {
      token,
      search,
    })) as ListItem[]
  }
  return (await convex.query(api.admin.correspondenceQueries.listInboxV2, {
    token,
    scope,
    search,
  })) as ListItem[]
}

function formatRelative(ms?: number): string {
  if (!ms) return "—"
  const diff = Date.now() - ms
  if (diff < 60_000) return "à l'instant"
  if (diff < 3_600_000) return `il y a ${Math.round(diff / 60_000)} min`
  if (diff < 86_400_000) return `il y a ${Math.round(diff / 3_600_000)} h`
  return new Date(ms).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  })
}

const metaSectionTitle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: "var(--ink-500)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  margin: "0 0 6px",
}
