import Link from "next/link"
import { PageHeader } from "@workspace/ui"
import { api } from "@workspace/backend/generated"
import { getCitizenConvex } from "@/lib/convex"
import { requireCurrentSession } from "@/lib/current-citizen"
import { CitizenNewCorrespondenceForm } from "./form"

/**
 * Page citoyen — création d'une nouvelle correspondance vers une administration.
 *
 * Wizard simplifié (pas de stepper, formulaire unique en une page) :
 *   - Administration destinataire (picker organisme)
 *   - Type (3 valeurs autorisées pour citoyens : demande, partage info, autre)
 *   - Sujet + corps
 *   - Submit → corres en sent (pas de circuit côté citoyen)
 */
export default async function CitizenNewCorrespondencePage() {
  const session = await requireCurrentSession()
  const convex = await getCitizenConvex(session)
  const organisms = (await convex.query(
    api.citizen.correspondence.citizenListOrganisms,
    {},
  )) as Array<{ id: string; name: string; shortName: string; category: string }>

  return (
    <>
      <PageHeader
        breadcrumbs={[
          <Link
            key="c"
            href="/mon-espace/courriers"
            style={{ color: "inherit" }}
          >
            Courriers officiels
          </Link>,
          "Nouveau courrier",
        ]}
        title="Écrire à une administration"
        subtitle="Adressez un courrier officiel à un organisme. Votre identité numérique sert de signature."
      />
      <main
        id="main"
        tabIndex={-1}
        style={{
          padding: "24px 32px",
          maxWidth: 760,
          width: "100%",
          flex: 1,
        }}
      >
        <CitizenNewCorrespondenceForm organisms={organisms} />
      </main>
    </>
  )
}
