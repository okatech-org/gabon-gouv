import Link from "next/link"
import {
  Avatar,
  Badge,
  Card,
  Icon,
  PageHeader,
  SectionHeading,
  StatCard,
  Table,
  Td,
  Th,
  Tr,
  type IconName,
} from "@workspace/ui"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"
import { requireCurrentSession } from "@/lib/current-citizen"

export default async function CitizenDossierPage() {
  const session = await requireCurrentSession()
  const data = await convex.query(api.citizen.dossier.getMyDossier, {
    idnSub: session.idnSub,
  })
  const { profile, relations, registryEntries, grants, counts } = data

  const identityFields: Array<[string, string]> = [
    ["NIP", profile.nip],
    ["Nom complet", profile.name],
    ["Date de naissance", profile.birthDate],
    ["Lieu de naissance", profile.birthPlace],
    ["Sexe", profile.sex],
    ["Situation maritale", profile.civilStatus],
    ["Nationalité", profile.nationality],
    ["Adresse de résidence", profile.address],
  ]

  return (
    <>
      <PageHeader
        breadcrumbs={["Mon espace", "Mon dossier"]}
        title="Mon dossier administratif"
        subtitle="Vue d'ensemble de votre identité civile, vos liens de filiation, vos actes sources et les administrations habilitées."
        meta={
          profile.identityVerified ? (
            <Badge tone="archived" dot icon="shieldCheck">
              Identité vérifiée
              {profile.identityVerifiedAt
                ? ` · ${profile.identityVerifiedAt}`
                : ""}
            </Badge>
          ) : (
            <Badge tone="warning" dot icon="alertTriangle">
              Identité non vérifiée
            </Badge>
          )
        }
      />
      <div
        style={{
          padding: "24px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
          maxWidth: 1400,
          width: "100%",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
          }}
          role="group"
          aria-label="Statistiques dossier"
        >
          <StatCard
            label="Démarches"
            value={String(counts.requests)}
            icon="inbox"
            hint="déposées sur Gabon Connect"
          />
          <StatCard
            label="Documents reçus"
            value={String(counts.documents)}
            icon="fileText"
          />
          <StatCard
            label="Filiations déclarées"
            value={String(relations.length)}
            icon="users"
          />
          <StatCard
            label="Administrations habilitées"
            value={String(counts.activeGrants)}
            icon="shieldCheck"
            hint="accès actif à mon dossier"
          />
        </div>

        <Card>
          <SectionHeading
            title="Identité civile"
            subtitle="Source de vérité : Direction Générale de l'État Civil. Pour rectifier, déposez une demande d'acte rectificatif."
            level={2}
          />
          <dl
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "14px 32px",
              fontSize: 13.5,
              margin: 0,
            }}
          >
            {identityFields.map(([k, v]) => (
              <div
                key={k}
                style={{
                  display: "grid",
                  gridTemplateColumns: "200px 1fr",
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
        </Card>

        <Card>
          <SectionHeading
            title="Filiation déclarée"
            subtitle={
              relations.length === 0
                ? "Aucun lien de famille déclaré."
                : `${relations.length} relation${relations.length > 1 ? "s" : ""} reconnue${relations.length > 1 ? "s" : ""} par l'État civil.`
            }
            level={2}
          />
          {relations.length === 0 ? (
            <EmptyState
              icon="users"
              title="Aucune filiation"
              description="Vos liens familiaux apparaîtront ici dès qu'un acte de naissance, de mariage ou un livret de famille les aura déclarés."
            />
          ) : (
            <Table>
              <caption
                style={{
                  position: "absolute",
                  width: 1,
                  height: 1,
                  overflow: "hidden",
                  clip: "rect(0 0 0 0)",
                }}
              >
                Liste des liens de filiation déclarés
              </caption>
              <thead>
                <tr>
                  <Th scope="col">Lien</Th>
                  <Th scope="col">Personne</Th>
                  <Th scope="col">Profession</Th>
                  <Th scope="col">Déclaré le</Th>
                </tr>
              </thead>
              <tbody>
                {relations.map((r) => (
                  <Tr key={r.id}>
                    <Td>
                      <Badge tone="primary" size="sm">
                        {r.kind}
                      </Badge>
                    </Td>
                    <Td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <Avatar
                          name={r.displayedName}
                          size={24}
                          tone="primary"
                        />
                        <span style={{ fontWeight: 600 }}>
                          {r.displayedName}
                        </span>
                      </div>
                    </Td>
                    <Td style={{ color: "var(--ink-600)" }}>{r.profession}</Td>
                    <Td style={{ color: "var(--ink-600)" }}>{r.declaredAt}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card>
          <SectionHeading
            title="Actes sources de l'État civil"
            subtitle="Actes originaux conservés au registre — toute copie ou extrait que vous demandez s'en réclame."
            level={2}
          />
          {registryEntries.length === 0 ? (
            <EmptyState
              icon="archive"
              title="Aucun acte source"
              description="Si un acte vous concernant est manquant, contactez la mairie de votre lieu de naissance."
            />
          ) : (
            <Table>
              <caption
                style={{
                  position: "absolute",
                  width: 1,
                  height: 1,
                  overflow: "hidden",
                  clip: "rect(0 0 0 0)",
                }}
              >
                Liste des actes sources
              </caption>
              <thead>
                <tr>
                  <Th scope="col">Type</Th>
                  <Th scope="col">N° d&apos;acte</Th>
                  <Th scope="col">Registre</Th>
                  <Th scope="col">Année</Th>
                  <Th scope="col">Précision</Th>
                </tr>
              </thead>
              <tbody>
                {registryEntries.map((e) => (
                  <Tr key={e.id}>
                    <Td>
                      <Badge tone="archived" size="sm">
                        {e.kind}
                      </Badge>
                    </Td>
                    <Td
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 12.5,
                      }}
                    >
                      {e.actNumber}
                    </Td>
                    <Td>
                      <span style={{ fontWeight: 600 }}>{e.registerCode}</span>
                      <span
                        style={{
                          fontSize: 12,
                          color: "var(--ink-500)",
                          marginLeft: 6,
                        }}
                      >
                        ({e.commune})
                      </span>
                    </Td>
                    <Td>{e.year}</Td>
                    <Td>
                      <Badge
                        tone={
                          e.accuracyLevel === "verified" ||
                          e.accuracyLevel === "attested"
                            ? "archived"
                            : "warning"
                        }
                        size="sm"
                        dot
                      >
                        {e.accuracyLevel === "verified"
                          ? "Vérifié"
                          : e.accuracyLevel === "attested"
                            ? "Attesté"
                            : "Partiel"}
                      </Badge>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card>
          <SectionHeading
            title="Qui peut consulter mon dossier ?"
            subtitle="Administrations à qui vous (ou la loi) avez accordé un accès à tout ou partie de votre dossier. Demandez une révocation en cas de besoin."
            level={2}
            action={
              <Link
                href="/mon-espace/parametres"
                style={{ fontSize: 13, fontWeight: 600 }}
              >
                Gérer les permissions →
              </Link>
            }
          />
          {grants.length === 0 ? (
            <EmptyState
              icon="shield"
              title="Aucune habilitation enregistrée"
              description="Aucune administration n'a actuellement accès à votre dossier au-delà de ses propres demandes en cours."
            />
          ) : (
            <Table>
              <caption
                style={{
                  position: "absolute",
                  width: 1,
                  height: 1,
                  overflow: "hidden",
                  clip: "rect(0 0 0 0)",
                }}
              >
                Liste des habilitations d&apos;accès au dossier
              </caption>
              <thead>
                <tr>
                  <Th scope="col">Administration</Th>
                  <Th scope="col">Niveau</Th>
                  <Th scope="col">Portée</Th>
                  <Th scope="col">Accordé le</Th>
                  <Th scope="col">Expire</Th>
                  <Th scope="col">Statut</Th>
                </tr>
              </thead>
              <tbody>
                {grants.map((g) => (
                  <Tr key={g.id}>
                    <Td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <Icon
                          name="building"
                          size={14}
                          style={{ color: "var(--ink-500)" }}
                          aria-hidden="true"
                        />
                        <span style={{ fontWeight: 600 }}>{g.organism}</span>
                      </div>
                    </Td>
                    <Td>{g.level}</Td>
                    <Td style={{ color: "var(--ink-600)" }}>{g.scope}</Td>
                    <Td style={{ color: "var(--ink-600)" }}>{g.grantedAt}</Td>
                    <Td style={{ color: "var(--ink-600)" }}>
                      {g.expiresAt ?? "—"}
                    </Td>
                    <Td>
                      {g.active ? (
                        <Badge tone="archived" dot>
                          Actif
                        </Badge>
                      ) : (
                        <Badge tone="neutral" dot>
                          Révoqué
                        </Badge>
                      )}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
    </>
  )
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: IconName
  title: string
  description: string
}) {
  return (
    <div
      style={{
        padding: "32px 16px",
        textAlign: "center",
        color: "var(--ink-600)",
      }}
    >
      <Icon
        name={icon}
        size={28}
        style={{ color: "var(--ink-400)", marginBottom: 10 }}
        aria-hidden="true"
      />
      <p style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 4 }}>
        {title}
      </p>
      <p
        style={{
          fontSize: 13,
          color: "var(--ink-600)",
          maxWidth: 480,
          margin: "0 auto",
        }}
      >
        {description}
      </p>
    </div>
  )
}
