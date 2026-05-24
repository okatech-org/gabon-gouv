import { ComingSoon, PageHeader } from "@workspace/ui"

export default function CitizenProfilPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={["Mes informations"]}
        title="Mes informations personnelles"
        subtitle="Coordonnées, adresse et préférences de contact."
      />
      <ComingSoon
        icon="user"
        title="Profil bientôt disponible"
        description="Mise à jour de vos coordonnées (e-mail, téléphone, adresse postale) et de vos préférences de contact. Les données d'état civil restent gérées par les officiers d'état civil."
      />
    </>
  )
}
