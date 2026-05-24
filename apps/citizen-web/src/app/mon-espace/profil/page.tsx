import Link from "next/link"
import { Badge, Card, Icon, PageHeader, SectionHeading } from "@workspace/ui"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"
import { requireCurrentSession } from "@/lib/current-citizen"
import { EditableContactForm } from "./editable-contact-form"

export default async function CitizenProfilPage() {
  const session = await requireCurrentSession()
  const profile = await convex.query(api.citizen.profile.getMyProfile, {
    idnSub: session.idnSub,
  })

  const readonlyFields: Array<[string, string]> = [
    ["NIP", profile.readonly.nip],
    ["Nom complet", profile.readonly.name],
    ["Sexe", profile.readonly.sex],
    ["Date de naissance", profile.readonly.birthDate],
    ["Lieu de naissance", profile.readonly.birthPlace],
    ["Nationalité", profile.readonly.nationality],
    ["Nom du père", profile.readonly.fatherName],
    ["Nom de la mère", profile.readonly.motherName],
  ]

  return (
    <>
      <PageHeader
        breadcrumbs={["Mon espace", "Mes informations"]}
        title="Mes informations personnelles"
        subtitle="Vos coordonnées de contact sont modifiables. Les éléments d'état civil sont gérés par les officiers et nécessitent une demande d'acte rectificatif."
      />
      <div
        style={{
          padding: "24px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
          maxWidth: 960,
          width: "100%",
        }}
      >
        {/* Section éditable : contact */}
        <Card>
          <SectionHeading
            title="Coordonnées de contact"
            subtitle="Utilisées pour vous notifier des mises à jour de vos demandes."
            level={2}
            action={
              <Badge tone="primary" size="sm" dot>
                Modifiable
              </Badge>
            }
          />
          <EditableContactForm
            initial={{
              email: profile.editable.email,
              phone: profile.editable.phone,
              address: profile.editable.address,
              addressProvinceCode: profile.editable.addressProvinceCode ?? "",
            }}
          />
        </Card>

        {/* Section read-only : état civil */}
        <Card>
          <SectionHeading
            title="Identité civile"
            subtitle="Source de vérité : Direction Générale de l'État Civil."
            level={2}
            action={
              <Badge tone="archived" size="sm" dot icon="lock">
                Lecture seule
              </Badge>
            }
          />
          <dl
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "12px 32px",
              fontSize: 13.5,
              margin: 0,
            }}
          >
            {readonlyFields.map(([k, v]) => (
              <div
                key={k}
                style={{
                  display: "grid",
                  gridTemplateColumns: "180px 1fr",
                  alignItems: "baseline",
                  padding: "6px 0",
                  borderBottom: "1px solid var(--ink-150)",
                }}
              >
                <dt style={{ color: "var(--ink-600)" }}>{k}</dt>
                <dd style={{ fontWeight: 600, margin: 0 }}>{v}</dd>
              </div>
            ))}
          </dl>
          <p
            style={{
              fontSize: 12.5,
              color: "var(--ink-600)",
              marginTop: 14,
              padding: 12,
              background: "var(--ink-50)",
              borderRadius: 8,
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
            }}
          >
            <Icon
              name="info"
              size={14}
              style={{ color: "var(--primary-500)", marginTop: 2, flexShrink: 0 }}
              aria-hidden="true"
            />
            <span>
              Pour rectifier l&apos;un de ces champs, déposez une{" "}
              <Link
                href="/services/acte-naissance"
                style={{ color: "var(--primary-600)", fontWeight: 600 }}
              >
                demande d&apos;acte rectificatif
              </Link>{" "}
              auprès de la DG État Civil.
            </span>
          </p>
        </Card>
      </div>
    </>
  )
}
