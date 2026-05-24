import { redirect } from "next/navigation"
import { Button, Icon, SectionHeading } from "@workspace/ui"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"
import { getCurrentAgent } from "@/lib/current-agent"

interface Props {
  params: Promise<{ slug: string }>
}

export default async function ApercuPage({ params }: Props) {
  const session = await getCurrentAgent()
  if (!session) redirect("/login")
  const { slug } = await params

  const detail = await convex.query(api.admin.services.getDetail, {
    token: session.token,
    slug,
  })
  if (!detail) redirect("/services")

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
        <SectionHeading
          title="Aperçu citoyen"
          subtitle="Rendu de la fiche publique telle qu'elle apparaît sur le portail citoyen."
          level={2}
        />
        <a
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: "none" }}
        >
          <Button variant="outline" icon="externalLink">
            Ouvrir dans un nouvel onglet
          </Button>
        </a>
      </div>

      {detail.status === "draft" && (
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
          Ce service est en brouillon. La fiche citoyen n'est pas publique
          tant qu'il n'est pas publié.
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
          title={`Aperçu citoyen de ${detail.title}`}
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
