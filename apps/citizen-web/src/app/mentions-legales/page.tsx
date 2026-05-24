import { ComingSoon, PageHeader } from "@workspace/ui"
import { PublicShell } from "@/components/public-shell"

export default function MentionsLegalesPage() {
  return (
    <PublicShell>
      <PageHeader
        title="Mentions légales"
        subtitle="Éditeur, hébergement et responsabilités."
      />
      <ComingSoon
        icon="file"
        title="Mentions légales en cours de rédaction"
        description="Les mentions légales détaillées de Gabon Connect (éditeur, directeur de la publication, hébergeur, contact DPO) seront publiées avant la mise en production."
      />
    </PublicShell>
  )
}
