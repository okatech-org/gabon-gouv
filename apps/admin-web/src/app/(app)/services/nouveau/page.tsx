import { redirect } from "next/navigation"
import { Button, PageHeader } from "@workspace/ui"
import { getCurrentAgent } from "@/lib/current-agent"
import { CreateServiceForm } from "./create-service-form"

export default async function NewServicePage() {
  const session = await getCurrentAgent()
  if (!session) redirect("/login")

  return (
    <>
      <PageHeader
        breadcrumbs={["Mes services", "Créer un service"]}
        title="Créer un nouveau service"
        subtitle="Renseignez l'identité du service. Les variantes, pièces requises et templates de documents se configurent ensuite."
      />
      <div
        style={{
          padding: "24px 32px",
          maxWidth: 720,
          width: "100%",
        }}
      >
        <CreateServiceForm />
      </div>
    </>
  )
}
