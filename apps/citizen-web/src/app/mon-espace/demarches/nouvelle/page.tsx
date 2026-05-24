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

  const [service, dashboard] = await Promise.all([
    convex.query(api.citizen.catalog.getServiceDetail, { slug }),
    convex.query(api.citizen.dashboard.getDashboard, {
      idnSub: session.idnSub,
    }),
  ])
  if (!service) notFound()

  return (
    <DepositWizard
      service={{
        slug: service.slug,
        title: service.title,
        category: service.category,
        org: service.orgShort,
        variants: service.variants.map((v) => ({
          key: v.key,
          title: v.title,
          description: v.description,
          who: v.who,
          isDefault: v.highlight,
        })),
        pieces: service.pieces.map((p) => ({
          title: p.title,
          description: p.description,
          required: p.required,
          auto: p.auto,
        })),
      }}
      citizen={dashboard.profile}
    />
  )
}
