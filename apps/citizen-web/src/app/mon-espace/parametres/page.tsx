import { ComingSoon, PageHeader } from "@workspace/ui"

export default function CitizenParametresPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={["Paramètres"]}
        title="Paramètres du compte"
        subtitle="Sécurité, notifications et confidentialité."
      />
      <ComingSoon
        icon="settings"
        title="Paramètres bientôt disponibles"
        description="Vous pourrez ici gérer votre mot de passe, l'authentification à deux facteurs, vos préférences de notification et vos consentements de partage de données."
      />
    </>
  )
}
