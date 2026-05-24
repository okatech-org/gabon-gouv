import { ComingSoon, PageHeader } from "@workspace/ui"

export default function CitizenIdentitePage() {
  return (
    <>
      <PageHeader
        breadcrumbs={["Identité numérique"]}
        title="Identité numérique"
        subtitle="NIP, niveau de vérification et appareils de confiance."
      />
      <ComingSoon
        icon="fingerprint"
        title="Identité numérique bientôt disponible"
        description="Consultation de votre NIP, niveau d'assurance KYC, journal des connexions et gestion des appareils de confiance pour vos connexions à Gabon Connect."
      />
    </>
  )
}
