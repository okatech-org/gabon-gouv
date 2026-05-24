import { ComingSoon, PageHeader } from "@workspace/ui"

export default function CitizenDossierPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={["Mon dossier"]}
        title="Mon dossier administratif"
        subtitle="Vue consolidée de votre situation administrative."
      />
      <ComingSoon
        icon="folder"
        title="Mon dossier bientôt disponible"
        description="Cette page rassemblera l'ensemble de votre situation : actes d'état civil, titres en cours de validité, antécédents et liens familiaux déclarés."
      />
    </>
  )
}
