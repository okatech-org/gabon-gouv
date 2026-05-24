import { notFound } from "next/navigation"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"
import { requireCurrentSession } from "@/lib/current-citizen"
import { DepositWizard } from "./deposit-wizard"

const DEFAULT_SERVICE = "acte-naissance"

interface PageProps {
  searchParams: Promise<{ service?: string }>
}

export default async function CitizenDepositPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const slug = sp.service ?? DEFAULT_SERVICE
  const session = await requireCurrentSession()

  // Charge tout en parallèle : data wizard + brouillon existant pour reprise
  const [wizard, draft] = await Promise.all([
    convex.query(api.citizen.catalog.getServiceForWizard, {
      idnSub: session.idnSub,
      slug,
    }),
    convex.query(api.citizen.drafts.getMyDraft, {
      idnSub: session.idnSub,
      serviceSlug: slug,
    }),
  ])
  if (!wizard) notFound()

  return (
    <DepositWizard
      service={{
        id: String(wizard.service.id),
        slug: wizard.service.slug,
        title: wizard.service.title,
        category: wizard.service.category,
        organism: wizard.service.organism,
        delayHours: wizard.service.delayHours,
        fee: wizard.service.fee,
        feeFcfa: wizard.service.feeFcfa,
        deliveryMode: wizard.service.deliveryMode,
        whoCanApply: wizard.service.whoCanApply,
        legalReferences: wizard.service.legalReferences,
      }}
      variants={wizard.variants.map((v) => ({
        id: String(v.id),
        key: v.key,
        label: v.label,
        description: v.description,
        whoCanApply: v.whoCanApply,
        isDefault: v.isDefault,
        feeOverride: v.feeOverride,
        feeFcfaOverride: v.feeFcfaOverride,
        delayHoursOverride: v.delayHoursOverride,
      }))}
      requirements={wizard.requirements.map((r) => ({
        id: String(r.id),
        label: r.label,
        description: r.description,
        required: r.required,
        acceptedDocTypes: r.acceptedDocTypes,
        autofillSource: r.autofillSource,
        variantOverrides: r.variantOverrides.map((o) => ({
          variantId: String(o.variantId),
          required: o.required,
          acceptedDocTypes: o.acceptedDocTypes,
        })),
      }))}
      autofillValues={wizard.autofillValues}
      initialDraft={
        draft
          ? {
              currentStep: draft.currentStep,
              serviceVariantId: draft.serviceVariantId
                ? String(draft.serviceVariantId)
                : null,
              payload: draft.payload as Record<string, unknown> | null,
              updatedAt: draft.updatedAt,
            }
          : null
      }
    />
  )
}
