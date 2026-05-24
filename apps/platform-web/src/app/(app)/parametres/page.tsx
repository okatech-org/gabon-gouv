import { ComingSoon, PageHeader } from "@workspace/ui"

export default function PlatformParametresPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={["Paramètres"]}
        title="Paramètres plateforme"
        subtitle="Configuration globale de Gabon Connect."
      />
      <ComingSoon
        icon="settings"
        title="Paramètres plateforme bientôt disponibles"
        description="Configuration des règles métier transverses : politiques de mot de passe, paramètres NIP, délais légaux, branding et notifications globales."
      />
    </>
  )
}
