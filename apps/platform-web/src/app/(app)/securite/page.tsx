import { ComingSoon, PageHeader } from "@workspace/ui"

export default function PlatformSecuritePage() {
  return (
    <>
      <PageHeader
        breadcrumbs={["Sécurité & audit"]}
        title="Sécurité & audit"
        subtitle="Journal d'accès, événements scellés et alertes de sécurité."
      />
      <ComingSoon
        icon="shield"
        title="Console sécurité bientôt disponible"
        description="Vous pourrez consulter le journal scellé des accès agents, les anomalies détectées, les tentatives d'intrusion et les rapports d'audit BSI."
      />
    </>
  )
}
