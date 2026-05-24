import { redirect } from "next/navigation"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"
import { getCurrentAgent } from "@/lib/current-agent"
import { TemplatesManager } from "./templates-manager"

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ variant?: string }>
}

export default async function TemplatesPage({ params, searchParams }: Props) {
  const session = await getCurrentAgent()
  if (!session) redirect("/login")
  const { slug } = await params
  const sp = await searchParams

  const detail = await convex.query(api.admin.services.getDetail, {
    token: session.token,
    slug,
  })
  if (!detail) redirect("/services")

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1200, width: "100%" }}>
      <TemplatesManager
        slug={slug}
        readOnly={detail.status === "archived"}
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
  )
}
