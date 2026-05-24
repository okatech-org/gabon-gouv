import { redirect } from "next/navigation"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"
import { getCurrentAgent } from "@/lib/current-agent"
import { RequirementsManager } from "./requirements-manager"

interface Props {
  params: Promise<{ slug: string }>
}

export default async function PiecesPage({ params }: Props) {
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
      <RequirementsManager
        slug={slug}
        serviceId={String(detail.id)}
        readOnly={detail.status === "archived"}
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
  )
}
