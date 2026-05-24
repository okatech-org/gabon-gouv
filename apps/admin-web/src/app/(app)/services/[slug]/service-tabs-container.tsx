"use client"

/**
 * Conteneur de tabs côté client pour la page détail d'un service.
 *
 * Convention Gabon Connect pour les tabs :
 *   - URL = source de vérité (lecture initiale via useSearchParams)
 *   - Switch de tab = window.history.replaceState (pas de server roundtrip)
 *   - Données pré-fetchées en server component, passées en props
 *   - Panels rendus conditionnellement à partir d'un useState local
 *
 * Avantages :
 *   - Switch instantané (pas de flash, pas de re-render du PageHeader)
 *   - URL partageable + reload preserve l'onglet actif
 *   - Pas d'appel Convex à chaque clic de tab
 */

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { Icon, type IconName } from "@workspace/ui"
import { ServiceOverviewForm } from "./panels/overview-form"
import { VariantsManager } from "./panels/variants-manager"
import { RequirementsManager } from "./panels/requirements-manager"
import { TemplatesManager } from "./panels/templates-manager"
import { ApercuPanel } from "./panels/apercu-panel"
import { StatsPanel } from "./panels/stats-panel"

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

interface Variant {
  id: string
  key: string
  label: string
  description: string
  whoCanApply: string
  isDefault: boolean
  feeOverride: string | null
  feeFcfaOverride: number | null
  delayHoursOverride: number | null
  order: number
  requestsLast30d: number
}

interface Requirement {
  id: string
  label: string
  description: string
  required: boolean
  acceptedDocTypes: string[]
  autofillSource: string | null
  order: number
}

interface TemplateRow {
  id: string
  key: string
  version: string
  title: string
  status: string
  validatedByComite: boolean
  validatedAt: string | null
}

interface RelatedRequest {
  ref: string
  status: string
  depositedAt: number
  progressPct: number
}

export interface ServiceTabsContainerProps {
  slug: string
  serviceId: string
  status: string
  readOnly: boolean
  initialTab?: TabId
  // Données pour Vue d'ensemble
  overview: {
    title: string
    categorySlug: string
    description: string
    longDescription: string
    whoCanApply: string
    deliveryMode: string
    fee: string
    feeFcfa: number
    delayHours: number
    legalReferences: string[]
  }
  // Stats pour Vue d'ensemble + Stats
  stats: {
    requests30d: number
    satisfaction: number | null
  }
  variants: Variant[]
  requirements: Requirement[]
  templatesByVariant: { variantId: string; templates: TemplateRow[] }[]
  relatedRequests: RelatedRequest[]
  initialTemplateVariantKey?: string
}

export function ServiceTabsContainer(props: ServiceTabsContainerProps) {
  const searchParams = useSearchParams()
  const urlTab = searchParams.get("onglet")
  const initialFromUrl = (TABS.find((t) => t.id === urlTab)?.id ??
    "vue-d-ensemble") as TabId

  const [activeTab, setActiveTab] = useState<TabId>(initialFromUrl)

  const switchTab = (id: TabId) => {
    if (id === activeTab) return
    setActiveTab(id)
    const url =
      id === "vue-d-ensemble"
        ? `/services/${props.slug}`
        : `/services/${props.slug}?onglet=${id}`
    // Met à jour l'URL sans déclencher de navigation/server roundtrip.
    // L'historique est remplacé pour ne pas polluer le bouton « back ».
    window.history.replaceState(null, "", url)
  }

  return (
    <>
      {/* Tabs nav — buttons + history.replaceState (zéro server roundtrip).
          flexShrink:0 indispensable : (app)/layout met <main> en flex column,
          un nav avec overflow autrement écrasé à 1px. */}
      <nav
        aria-label="Sections de configuration du service"
        style={{
          flexShrink: 0,
          marginTop: 16,
          padding: "0 32px",
          borderBottom: "1px solid var(--ink-200)",
          overflowX: "auto",
        }}
      >
        <ul
          role="tablist"
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
            return (
              <li key={tab.id} role="presentation">
                <button
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-controls={`panel-${tab.id}`}
                  id={`tab-${tab.id}`}
                  onClick={() => switchTab(tab.id)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "12px 14px",
                    fontSize: 13,
                    fontWeight: active ? 700 : 500,
                    color: active ? "var(--primary-600)" : "var(--ink-700)",
                    background: "transparent",
                    border: "none",
                    borderBottom: active
                      ? "2px solid var(--primary-500)"
                      : "2px solid transparent",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    marginBottom: -1,
                    fontFamily: "inherit",
                  }}
                >
                  <Icon
                    name={tab.icon as IconName}
                    size={14}
                    aria-hidden="true"
                  />
                  {tab.label}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Panels — render conditionnel selon activeTab */}
      <div
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
      >
        {activeTab === "vue-d-ensemble" && (
          <div style={{ padding: "24px 32px", maxWidth: 960, width: "100%" }}>
            <ServiceOverviewForm
              slug={props.slug}
              initial={props.overview}
              stats={props.stats}
              readOnly={props.readOnly}
            />
          </div>
        )}

        {activeTab === "variantes" && (
          <div style={{ padding: "24px 32px", maxWidth: 1100, width: "100%" }}>
            <VariantsManager
              slug={props.slug}
              serviceId={props.serviceId}
              readOnly={props.readOnly}
              variants={props.variants}
            />
          </div>
        )}

        {activeTab === "pieces" && (
          <div style={{ padding: "24px 32px", maxWidth: 1100, width: "100%" }}>
            <RequirementsManager
              slug={props.slug}
              serviceId={props.serviceId}
              readOnly={props.readOnly}
              requirements={props.requirements}
            />
          </div>
        )}

        {activeTab === "templates" && (
          <div style={{ padding: "24px 32px", maxWidth: 1200, width: "100%" }}>
            <TemplatesManager
              slug={props.slug}
              readOnly={props.readOnly}
              initialVariantKey={props.initialTemplateVariantKey}
              variants={props.variants.map((v) => ({
                id: v.id,
                key: v.key,
                label: v.label,
                isDefault: v.isDefault,
              }))}
              templatesByVariant={props.templatesByVariant}
            />
          </div>
        )}

        {activeTab === "apercu" && (
          <ApercuPanel
            slug={props.slug}
            status={props.status}
            title={props.overview.title}
          />
        )}

        {activeTab === "stats" && (
          <StatsPanel
            requests30d={props.stats.requests30d}
            variantsCount={props.variants.length}
            requirementsCount={props.requirements.length}
            satisfaction={props.stats.satisfaction}
            topVariants={props.variants}
            relatedRequests={props.relatedRequests}
          />
        )}

        {activeTab === "signature" && <SignatureStub />}
        {activeTab === "archivage" && <ArchivageStub />}
      </div>
    </>
  )
}

function SignatureStub() {
  return (
    <div style={{ padding: "24px 32px", maxWidth: 900, width: "100%" }}>
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
          <p style={{ marginTop: 6, color: "var(--ink-600)", fontSize: 13 }}>
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
    <div style={{ padding: "24px 32px", maxWidth: 900, width: "100%" }}>
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
          <p style={{ marginTop: 6, color: "var(--ink-600)", fontSize: 13 }}>
            Configuration de la DUA, du sort final, des replicas et des règles
            de versement automatique.
          </p>
        </div>
      </div>
    </div>
  )
}
