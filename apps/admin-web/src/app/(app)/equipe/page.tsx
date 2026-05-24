import { ComingSoon, PageHeader } from "@workspace/ui"

export default function AdminEquipePage() {
  return (
    <>
      <PageHeader
        breadcrumbs={["Équipe"]}
        title="Équipe de l'organisme"
        subtitle="Gestion des agents, rôles et délégations."
      />
      <ComingSoon
        icon="users"
        title="Gestion d'équipe bientôt disponible"
        description="Cette page permettra d'inviter des agents, gérer leurs rôles (instructeur, viseur, signataire), et consulter l'activité de l'organisme."
        hint="En attendant, les agents sont provisionnés par la console plateforme."
      />
    </>
  )
}
