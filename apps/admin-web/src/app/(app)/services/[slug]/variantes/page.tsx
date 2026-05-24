import { redirect } from "next/navigation"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"
import { getCurrentAgent } from "@/lib/current-agent"
import { VariantsManager } from "./variants-manager"

interface Props {
  params: Promise<{ slug: string }>
}

export default async function VariantesPage({ params }: Props) {
  const session = await getCurrentAgent()
  if (!session) redirect("/login")
  const { slug } = await params

  const detail = await convex.query(api.admin.services.getDetail, {
    token: session.token,
    slug,
  })
  if (!detail) redirect("/services")

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1100, width: "100%" }}>
      <VariantsManager
        slug={slug}
        serviceId={String(detail.id)}
        readOnly={detail.status === "archived"}
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
  )
}
