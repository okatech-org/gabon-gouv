import Link from "next/link"
import { redirect } from "next/navigation"
import {
  Badge,
  Icon,
  PageHeader,
  type IconName,
  type Tone,
} from "@workspace/ui"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"
import { getCurrentAgent } from "@/lib/current-agent"
import { ServiceLifecycleActions } from "./service-lifecycle-actions"
import { ServiceOverviewForm } from "./panels/overview-form"
import { VariantsManager } from "./panels/variants-manager"
import { RequirementsManager } from "./panels/requirements-manager"
import { TemplatesManager } from "./panels/templates-manager"
import { StatsPanel } from "./stats-panel"

const TABS = [
  { id: "vue-d-ensemble", label: "Vue d'ensemble", icon: "info" },
  { id: "variantes", label: "Variantes", icon: "layers" },
  { id: "pieces", label: "Pièces requises", icon: "paperclip" },
  { id: "templates", label: "Templates documents", icon: "fileText" },
  { id: "apercu", label: "Aperçu citoyen", icon: "eye" },
  { id: "stats", label: "Statistiques", icon: "barChart" },
  { id: "signature", label: "Circuit de signature", icon: "shieldCheck" },
  { id: "archivage", label: "Archivage SAE", icon: "archive" },
] as const

type TabId = (typeof TABS)[number]["id"]

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
  const activeTab: TabId =
    (TABS.find((t) => t.id === sp.onglet)?.id ?? "vue-d-ensemble") as TabId

  const [detail, checklist] = await Promise.all([
    convex.query(api.admin.services.getDetail, {
      token: session.token,
      slug,
    }),
    convex.query(api.admin.services.getPublicationChecklist, {
      token: session.token,
      slug,
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
        </div>
      )}

      {/* Tabs nav — pure SSR via <Link> + searchParams */}
      <nav
        aria-label="Sections de configuration du service"
        style={{
          marginTop: 16,
          padding: "0 32px",
          borderBottom: "1px solid var(--ink-200)",
          overflowX: "auto",
        }}
      >
        <ul
          style={{
            display: "flex",
            gap: 4,
            margin: 0,
            padding: 0,
            listStyle: "none",
          }}
        >
          {TABS.map((tab) => {
            const active = tab.id === activeTab
            const href =
              tab.id === "vue-d-ensemble"
                ? `/services/${slug}`
                : `/services/${slug}?onglet=${tab.id}`
            return (
              <li key={tab.id}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "12px 14px",
                    fontSize: 13,
                    fontWeight: active ? 700 : 500,
                    color: active
                      ? "var(--primary-600)"
                      : "var(--ink-700)",
                    textDecoration: "none",
                    borderBottom: active
                      ? "2px solid var(--primary-500)"
                      : "2px solid transparent",
                    whiteSpace: "nowrap",
                    marginBottom: -1,
                  }}
                >
                  <Icon
                    name={tab.icon as IconName}
                    size={14}
                    aria-hidden="true"
                  />
                  {tab.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Panel actif */}
      {activeTab === "vue-d-ensemble" && (
        <div style={{ padding: "24px 32px", maxWidth: 960, width: "100%" }}>
          <ServiceOverviewForm
            slug={slug}
            initial={{
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
            readOnly={readOnly}
          />
        </div>
      )}

      {activeTab === "variantes" && (
        <div style={{ padding: "24px 32px", maxWidth: 1100, width: "100%" }}>
          <VariantsManager
            slug={slug}
            serviceId={String(detail.id)}
            readOnly={readOnly}
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
          />
        </div>
      )}

      {activeTab === "pieces" && (
        <div style={{ padding: "24px 32px", maxWidth: 1100, width: "100%" }}>
          <RequirementsManager
            slug={slug}
            serviceId={String(detail.id)}
            readOnly={readOnly}
            requirements={detail.requirements.map((r) => ({
              id: String(r.id),
              label: r.label,
              description: r.description,
              required: r.required,
              acceptedDocTypes: r.acceptedDocTypes,
              autofillSource: r.autofillSource,
              order: r.order,
            }))}
          />
        </div>
      )}

      {activeTab === "templates" && (
        <div style={{ padding: "24px 32px", maxWidth: 1200, width: "100%" }}>
          <TemplatesManager
            slug={slug}
            readOnly={readOnly}
            initialVariantKey={sp.variant}
            variants={detail.variants.map((v) => ({
              id: String(v.id),
              key: v.key,
              label: v.label,
              isDefault: v.isDefault,
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
          />
        </div>
      )}

      {activeTab === "apercu" && (
        <ApercuPanel slug={slug} status={detail.status} title={detail.title} />
      )}

      {activeTab === "stats" && (
        <StatsPanel
          requests30d={detail.requests30d}
          variantsCount={detail.variants.length}
          requirementsCount={detail.requirements.length}
          satisfaction={detail.satisfaction}
          topVariants={detail.variants.map((v) => ({
            id: String(v.id),
            label: v.label,
            isDefault: v.isDefault,
            requestsLast30d: v.requestsLast30d,
          }))}
          slug={slug}
        />
      )}

      {activeTab === "signature" && <SignatureStub />}
      {activeTab === "archivage" && <ArchivageStub />}
    </>
  )
}

/* ------------------------------------------------------------
   Panels « simples » inlinés
   ------------------------------------------------------------ */

function ApercuPanel({
  slug,
  status,
  title,
}: {
  slug: string
  status: string
  title: string
}) {
  const citizenAppUrl =
    process.env.NEXT_PUBLIC_CITIZEN_WEB_URL ?? "http://localhost:4000"
  const previewUrl = `${citizenAppUrl}/services/${slug}`

  return (
    <div
      style={{
        padding: "24px 32px",
        maxWidth: 1100,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
        }}
      >
        <div>
          <h2 style={{ fontSize: 18, margin: 0 }}>Aperçu citoyen</h2>
          <p
            style={{
              fontSize: 13,
              color: "var(--ink-600)",
              marginTop: 4,
            }}
          >
            Rendu de la fiche publique telle qu'elle apparaît sur le portail
            citoyen.
          </p>
        </div>
        <a
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--primary-600)",
            border: "1px solid var(--ink-300)",
            borderRadius: 6,
            textDecoration: "none",
            background: "white",
          }}
        >
          <Icon name="externalLink" size={14} aria-hidden="true" />
          Ouvrir dans un nouvel onglet
        </a>
      </div>

      {status === "draft" && (
        <div
          role="status"
          style={{
            padding: 12,
            background: "var(--warning-50)",
            border: "1px solid var(--warning-300)",
            borderRadius: 6,
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "var(--warning-700)",
          }}
        >
          <Icon name="alertTriangle" size={14} aria-hidden="true" />
          Ce service est en brouillon. La fiche citoyen n'est pas publique tant
          qu'il n'est pas publié.
        </div>
      )}

      <div
        style={{
          background: "var(--ink-100)",
          border: "1px solid var(--ink-200)",
          borderRadius: 8,
          padding: 12,
        }}
      >
        <iframe
          src={previewUrl}
          title={`Aperçu citoyen de ${title}`}
          style={{
            width: "100%",
            height: 720,
            border: "1px solid var(--ink-300)",
            borderRadius: 6,
            background: "white",
          }}
        />
      </div>
    </div>
  )
}

function SignatureStub() {
  return (
    <div
      style={{
        padding: "24px 32px",
        maxWidth: 900,
        width: "100%",
      }}
    >
      <div
        style={{
          padding: 24,
          background: "var(--ink-50)",
          border: "1px dashed var(--ink-300)",
          borderRadius: 8,
          color: "var(--ink-700)",
          fontSize: 14,
          display: "flex",
          gap: 12,
          alignItems: "flex-start",
        }}
      >
        <Icon
          name="shieldCheck"
          size={20}
          style={{ color: "var(--ink-500)", flexShrink: 0, marginTop: 2 }}
          aria-hidden="true"
        />
        <div>
          <strong>À venir au Bloc 3 — traitement des demandes.</strong>
          <p
            style={{
              marginTop: 6,
              color: "var(--ink-600)",
              fontSize: 13,
            }}
          >
            Configuration du circuit par défaut : rôles signataires, ordre des
            signatures, signataires de secours.
          </p>
        </div>
      </div>
    </div>
  )
}

function ArchivageStub() {
  return (
    <div
      style={{
        padding: "24px 32px",
        maxWidth: 900,
        width: "100%",
      }}
    >
      <div
        style={{
          padding: 24,
          background: "var(--ink-50)",
          border: "1px dashed var(--ink-300)",
          borderRadius: 8,
          color: "var(--ink-700)",
          fontSize: 14,
          display: "flex",
          gap: 12,
          alignItems: "flex-start",
        }}
      >
        <Icon
          name="archive"
          size={20}
          style={{ color: "var(--ink-500)", flexShrink: 0, marginTop: 2 }}
          aria-hidden="true"
        />
        <div>
          <strong>À venir au Bloc 6 — archivage SAE complet.</strong>
          <p
            style={{
              marginTop: 6,
              color: "var(--ink-600)",
              fontSize: 13,
            }}
          >
            Configuration de la DUA, du sort final, des replicas et des règles
            de versement automatique.
          </p>
        </div>
      </div>
    </div>
  )
}
