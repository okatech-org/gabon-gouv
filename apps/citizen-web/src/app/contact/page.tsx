import { ComingSoon, PageHeader } from "@workspace/ui"
import { PublicShell } from "@/components/public-shell"

export default function ContactPage() {
  return (
    <PublicShell>
      <PageHeader
        title="Nous contacter"
        subtitle="Support, signalement et demandes presse."
      />
      <ComingSoon
        icon="mail"
        title="Formulaire de contact bientôt disponible"
        description="Vous pourrez ici joindre le support Gabon Connect, signaler un problème ou demander une assistance pour une démarche en cours."
      />
    </PublicShell>
  )
}
