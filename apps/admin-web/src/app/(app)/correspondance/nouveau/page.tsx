import Link from "next/link"
import { redirect } from "next/navigation"
import { PageHeader } from "@workspace/ui"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"
import { getCurrentAgent } from "@/lib/current-agent"
import { NewCorrespondenceWizard } from "./wizard"

/**
 * Page /correspondance/nouveau — wizard de création d'une corres (Bloc 5).
 *
 * 3 étapes :
 *   1. Type (sélection kind parmi 16 valeurs / 6 familles)
 *   2. Destinataires (To obligatoire, CC + BCC optionnels)
 *   3. Rédaction (sujet, corps, urgent, PJ — pour l'instant texte simple)
 *
 * Au submit final → createDraft puis soit submitForSignature soit sendDirect
 * selon les règles du kind.
 */
export default async function NewCorrespondencePage() {
  const session = await getCurrentAgent()
  if (!session) redirect("/login")

  // Charge la liste des organismes pour le picker destinataire
  const organisms = (await convex
    .query(api.admin.directory.listForPicker, { token: session.token })
    .catch(() => [])) as Array<{ id: string; name: string }>

  return (
    <>
      <PageHeader
        breadcrumbs={[
          <Link key="c" href="/correspondance" style={{ color: "inherit" }}>
            Correspondance
          </Link>,
          "Nouveau courrier",
        ]}
        title="Rédiger un nouveau courrier"
        subtitle="Sélectionnez le type, les destinataires et rédigez."
      />
      <main
        id="main"
        tabIndex={-1}
        style={{
          padding: "24px 32px",
          maxWidth: 880,
          width: "100%",
          flex: 1,
          overflow: "auto",
        }}
      >
        <NewCorrespondenceWizard organisms={organisms} />
      </main>
    </>
  )
}
