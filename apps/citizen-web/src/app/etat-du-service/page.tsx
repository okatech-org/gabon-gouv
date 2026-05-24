import { ComingSoon, PageHeader } from "@workspace/ui"
import { PublicShell } from "@/components/public-shell"

export default function EtatDuServicePage() {
  return (
    <PublicShell>
      <PageHeader
        title="État du service"
        subtitle="Disponibilité de Gabon Connect et incidents en cours."
      />
      <ComingSoon
        icon="activity"
        title="Page d'état bientôt disponible"
        description="Suivi en temps réel des incidents, maintenance planifiée et disponibilité par démarche. Historique des 90 derniers jours."
      />
    </PublicShell>
  )
}
