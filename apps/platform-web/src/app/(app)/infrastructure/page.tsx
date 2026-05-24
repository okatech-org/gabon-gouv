import { ComingSoon, PageHeader } from "@workspace/ui"

export default function PlatformInfrastructurePage() {
  return (
    <>
      <PageHeader
        breadcrumbs={["Infrastructure"]}
        title="Infrastructure & hébergement"
        subtitle="État des services techniques de la plateforme."
      />
      <ComingSoon
        icon="server"
        title="Supervision infra bientôt disponible"
        description="État des nœuds Convex, stockage, files de jobs, latences et taux d'erreur. Hébergement souverain Owendo + secours Mvengue."
      />
    </>
  )
}
