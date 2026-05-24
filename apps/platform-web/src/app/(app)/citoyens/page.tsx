import { ComingSoon, PageHeader } from "@workspace/ui"

export default function PlatformCitoyensPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={["Citoyens"]}
        title="Citoyens & identités numériques"
        subtitle="Supervision des comptes citoyens, NIP et identités KYC."
      />
      <ComingSoon
        icon="users"
        title="Supervision citoyens bientôt disponible"
        description="Tableau de bord des comptes citoyens, vérifications KYC, blocages et incidents d'identité numérique. Accès strictement audité."
      />
    </>
  )
}
