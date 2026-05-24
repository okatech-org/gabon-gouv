import { redirect } from "next/navigation"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"
import { getCurrentAgent } from "@/lib/current-agent"
import { ServiceOverviewForm } from "./service-overview-form"

interface Props {
  params: Promise<{ slug: string }>
}

export default async function ServiceOverviewPage({ params }: Props) {
  const session = await getCurrentAgent()
  if (!session) redirect("/login")

  const { slug } = await params
  const detail = await convex.query(api.admin.services.getDetail, {
    token: session.token,
    slug,
  })
  if (!detail) redirect("/services")

  return (
    <div
      style={{
        padding: "24px 32px",
        maxWidth: 960,
        width: "100%",
      }}
    >
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
        readOnly={detail.status === "archived"}
      />
    </div>
  )
}
