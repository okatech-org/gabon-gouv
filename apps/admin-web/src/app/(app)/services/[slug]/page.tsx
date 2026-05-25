import Link from "next/link"
import { redirect } from "next/navigation"
import { Badge, Icon, PageHeader, type Tone } from "@workspace/ui"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"
import { getCurrentAgent } from "@/lib/current-agent"
import { ServiceLifecycleActions } from "./service-lifecycle-actions"
import { ServiceTabsContainer } from "./service-tabs-container"

const VALID_TABS = [
  "vue-d-ensemble",
  "variantes",
  "pieces",
  "templates",
  "apercu",
  "stats",
  "signature",
  "archivage",
] as const
type TabId = (typeof VALID_TABS)[number]

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

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ onglet?: string; variant?: string }>
}

export default async function ServiceDetailPage({
  params,
  searchParams,
}: PageProps) {
  const session = await getCurrentAgent()
  if (!session) redirect("/login")

  const { slug } = await params
  const sp = await searchParams
  const initialTab = (VALID_TABS.includes(sp.onglet as TabId)
    ? sp.onglet
    : "vue-d-ensemble") as TabId

  // Pre-fetch toutes les données dont les panels ont besoin, en parallèle.
  // Ainsi la container client n'a plus AUCUN appel réseau à faire — switcher
  // entre tabs devient instantané.
  const [detail, checklist, relatedRequests] = await Promise.all([
    convex.query(api.admin.services.getDetail, {
      token: session.token,
      slug,
    }),
    convex.query(api.admin.services.getPublicationChecklist, {
      token: session.token,
      slug,
    }),
    convex.query(api.admin.services.listRelatedRequests, {
      token: session.token,
      slug,
      limit: 10,
    }),
  ])

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

  const badge = statusBadge(detail.status)
  const readOnly = detail.status === "archived"

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
            flexShrink: 0,
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
            flexShrink: 0,
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
        </div>
      )}

      <ServiceTabsContainer
        slug={slug}
        serviceId={String(detail.id)}
        status={detail.status}
        readOnly={readOnly}
        initialTab={initialTab}
        initialTemplateVariantKey={sp.variant}
        overview={{
          title: detail.title,
          categorySlug: detail.categorySlug ?? "",
          description: detail.description,
          longDescription: detail.longDescription,
          whoCanApply: detail.whoCanApply,
          deliveryMode: detail.deliveryMode ?? "online",
          fee: detail.fee,
          feeFcfa: detail.feeFcfa ?? 0,
          delayHours: detail.delayHours,
          legalReferences: detail.legalReferences,
        }}
        stats={{
          requests30d: detail.requests30d,
          satisfaction: detail.satisfaction,
        }}
        variants={detail.variants.map((v) => ({
          id: String(v.id),
          key: v.key,
          label: v.label,
          description: v.description,
          whoCanApply: v.whoCanApply,
          isDefault: v.isDefault,
          feeOverride: v.feeOverride,
          feeFcfaOverride: v.feeFcfaOverride,
          delayHoursOverride: v.delayHoursOverride,
          order: v.order,
          requestsLast30d: v.requestsLast30d,
        }))}
        requirements={detail.requirements.map((r) => ({
          id: String(r.id),
          label: r.label,
          description: r.description,
          required: r.required,
          acceptedDocTypes: r.acceptedDocTypes,
          autofillSource: r.autofillSource,
          order: r.order,
          variantOverrides: r.variantOverrides.map((o) => ({
            variantId: String(o.variantId),
            required: o.required,
            acceptedDocTypes: o.acceptedDocTypes ?? null,
          })),
        }))}
        templatesByVariant={detail.templatesByVariant.map((tv) => ({
          variantId: String(tv.variantId),
          templates: tv.templates.map((t) => ({
            id: String(t.id),
            key: t.key,
            version: t.version,
            title: t.title,
            status: t.status,
            validatedByComite: t.validatedByComite,
            validatedAt: t.validatedAt,
          })),
        }))}
        relatedRequests={relatedRequests.map((r) => ({
          ref: r.ref,
          status: r.status,
          depositedAt: r.depositedAt,
          progressPct: r.progressPct,
        }))}
      />
    </>
  )
}
