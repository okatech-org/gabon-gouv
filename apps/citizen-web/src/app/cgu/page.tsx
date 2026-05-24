import { ComingSoon, PageHeader } from "@workspace/ui"
import { PublicShell } from "@/components/public-shell"

export default function CGUPage() {
  return (
    <PublicShell>
      <PageHeader
        title="Conditions générales d'utilisation"
        subtitle="Règles d'usage de Gabon Connect."
      />
      <ComingSoon
        icon="fileText"
        title="CGU en cours de rédaction"
        description="Les conditions générales d'utilisation, la politique de protection des données personnelles et les engagements de service seront publiés ici avant la mise en production."
      />
    </PublicShell>
  )
}
