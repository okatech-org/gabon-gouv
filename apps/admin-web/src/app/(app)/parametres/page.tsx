import { ComingSoon, PageHeader } from "@workspace/ui"

export default function AdminParametresPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={["Paramètres"]}
        title="Paramètres de l'organisme"
        subtitle="Configuration, signatures, notifications et préférences."
      />
      <ComingSoon
        icon="settings"
        title="Paramètres bientôt disponibles"
        description="Vous pourrez ici configurer les signatures officielles, les modèles d'actes, les délais d'instruction par défaut et les préférences de notification."
      />
    </>
  )
}
