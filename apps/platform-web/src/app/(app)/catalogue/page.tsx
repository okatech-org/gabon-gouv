import { ComingSoon, PageHeader } from "@workspace/ui"

export default function PlatformCataloguePage() {
  return (
    <>
      <PageHeader
        breadcrumbs={["Catalogue services"]}
        title="Catalogue national des services"
        subtitle="Référentiel des démarches publiques disponibles sur Gabon Connect."
      />
      <ComingSoon
        icon="layers"
        title="Catalogue services bientôt disponible"
        description="Vous pourrez ici parcourir, modérer et publier les services proposés par les organismes — fiches publiques, prérequis, pièces demandées et frais associés."
      />
    </>
  )
}
