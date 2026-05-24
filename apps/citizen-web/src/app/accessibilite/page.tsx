import { ComingSoon, PageHeader } from "@workspace/ui"
import { PublicShell } from "@/components/public-shell"

export default function AccessibilitePage() {
  return (
    <PublicShell>
      <PageHeader
        title="Accessibilité"
        subtitle="Engagement RGAA 4.1 et schéma pluriannuel."
      />
      <ComingSoon
        icon="eye"
        title="Déclaration d'accessibilité en préparation"
        description="Gabon Connect vise la conformité RGAA 4.1 niveau AA. La déclaration d'accessibilité, l'audit en cours et le schéma pluriannuel seront publiés ici."
      />
    </PublicShell>
  )
}
