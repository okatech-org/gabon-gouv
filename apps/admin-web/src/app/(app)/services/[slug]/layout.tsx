import { redirect } from "next/navigation"
import Link from "next/link"
import type { ReactNode } from "react"
import { Badge, Icon, PageHeader, type Tone } from "@workspace/ui"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"
import { getCurrentAgent } from "@/lib/current-agent"
import { ServiceLifecycleActions } from "./service-lifecycle-actions"
import { ServiceTabsNav } from "./service-tabs-nav"

function statusBadge(status: string): { label: string; tone: Tone } {
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

interface LayoutProps {
  children: ReactNode
  params: Promise<{ slug: string }>
}

export default async function ServiceDetailLayout({
  children,
  params,
}: LayoutProps) {
  const session = await getCurrentAgent()
  if (!session) redirect("/login")

  const { slug } = await params
  const detail = (await convex.query(api.admin.services.getDetail, {
    token: session.token,
    slug,
  })) as
    | {
        title: string
        status: string
        category: string
        slug: string
        publishedAt: number | null
        archivedAt: number | null
      }
    | null

  if (!detail) {
    return (
      <>
        <PageHeader
          breadcrumbs={["Mes services", "Introuvable"]}
          title="Service introuvable"
        />
        <div style={{ padding: 32 }}>
          <Link href="/services">← Retour à la liste</Link>
        </div>
      </>
    )
  }

  const checklist = (await convex.query(
    api.admin.services.getPublicationChecklist,
    { token: session.token, slug },
  )) as { ready: boolean; missing: string[] }

  const badge = statusBadge(detail.status)

  return (
    <>
      <PageHeader
        breadcrumbs={["Mes services", detail.title]}
        title={detail.title}
        subtitle={
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <Badge tone={badge.tone} dot>
              {badge.label}
            </Badge>
            <span style={{ color: "var(--ink-600)" }}>·</span>
            <span style={{ color: "var(--ink-600)" }}>{detail.category}</span>
            <span style={{ color: "var(--ink-600)" }}>·</span>
            <code style={{ fontSize: 12, color: "var(--ink-600)" }}>
              /{detail.slug}
            </code>
          </span>
        }
        actions={
          <ServiceLifecycleActions
            slug={slug}
            status={detail.status}
            title={detail.title}
            checklist={checklist}
          />
        }
      />

      {/* Bannière prérequis pour publication (si draft) */}
      {detail.status === "draft" && !checklist.ready && (
        <div
          role="status"
          style={{
            margin: "16px 32px 0",
            padding: 14,
            background: "var(--warning-50)",
            border: "1px solid var(--warning-300)",
            borderRadius: 8,
            display: "flex",
            gap: 12,
          }}
        >
          <Icon
            name="alertTriangle"
            size={18}
            style={{ color: "var(--warning-600)", flexShrink: 0, marginTop: 2 }}
            aria-hidden="true"
          />
          <div style={{ fontSize: 13 }}>
            <strong>Avant publication, vérifiez :</strong>
            <ul style={{ margin: "6px 0 0 18px", padding: 0 }}>
              {checklist.missing.map((m) => (
                <li key={m} style={{ marginBottom: 2 }}>
                  {m}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {detail.status === "archived" && (
        <div
          role="status"
          style={{
            margin: "16px 32px 0",
            padding: 14,
            background: "var(--ink-100)",
            border: "1px solid var(--ink-200)",
            borderRadius: 8,
            fontSize: 13,
            color: "var(--ink-700)",
          }}
        >
          <Icon
            name="archive"
            size={16}
            style={{
              verticalAlign: "middle",
              marginRight: 8,
              color: "var(--ink-500)",
            }}
            aria-hidden="true"
          />
          Ce service est archivé. Il n'apparaît plus dans le catalogue citoyen.
          Vous pouvez le republier après vérification des prérequis.
        </div>
      )}

      <ServiceTabsNav slug={slug} />

      {children}
    </>
  )
}
