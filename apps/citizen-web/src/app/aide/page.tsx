import { ComingSoon, PageHeader } from "@workspace/ui"
import { PublicShell } from "@/components/public-shell"

export default function CitizenAidePage() {
  return (
    <PublicShell active="aide">
      <PageHeader
        title="Aide & support"
        subtitle="Guides, foire aux questions et contact du support Gabon Connect."
      />
      <ComingSoon
        icon="info"
        title="Centre d'aide bientôt disponible"
        description="Vous trouverez ici les guides pas-à-pas pour vos démarches, la FAQ et les coordonnées du support. En attendant, vous pouvez nous contacter via le formulaire de contact."
      />
    </PublicShell>
  )
}
