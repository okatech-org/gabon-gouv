import { ComingSoon, PageHeader } from "@workspace/ui"

export default function CitizenMessagesPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={["Messages"]}
        title="Mes messages"
        subtitle="Échanges avec les administrations."
      />
      <ComingSoon
        icon="mail"
        title="Messagerie bientôt disponible"
        description="Vous pourrez ici recevoir et répondre aux demandes de compléments des administrations, et conserver l'historique scellé de vos échanges."
      />
    </>
  )
}
