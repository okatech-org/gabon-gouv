import {
  Badge,
  Card,
  Icon,
  PageHeader,
  SectionHeading,
  Select,
  StatCard,
  Table,
  Td,
  Th,
  Tr,
} from "@workspace/ui"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"
import { requirePlatformUser } from "@/lib/current-platform-user"

interface PageProps {
  searchParams: Promise<{ verbe?: string }>
}

export default async function PlatformSecuritePage({ searchParams }: PageProps) {
  const sp = await searchParams
  const { token } = await requirePlatformUser()
  const [{ events, verbs }, seals] = await Promise.all([
    convex.query(api.platform.security.listAuditEvents, {
      token,
      verb: sp.verbe || undefined,
      limit: 100,
    }),
    convex.query(api.platform.security.listDailySeals, { token }),
  ])

  return (
    <>
      <PageHeader
        breadcrumbs={["Plateforme", "Sécurité & audit"]}
        title="Sécurité & audit"
        subtitle="Journal probant des actions métier (NF Z42-013) et chaîne de scellements quotidiens."
        meta={
          <Badge tone="archived" dot icon="shieldCheck">
            Conforme NF Z42-013
          </Badge>
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
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
          }}
          role="group"
          aria-label="Statistiques audit"
        >
          <StatCard
            label="Événements affichés"
            value={String(events.length)}
            icon="activity"
          />
          <StatCard
            label="Verbes distincts"
            value={String(verbs.length)}
            icon="layers"
          />
          <StatCard
            label="Scellements quotidiens"
            value={String(seals.length)}
            icon="shieldCheck"
            hint="60 derniers jours"
          />
        </div>

        {/* Journal d'audit */}
        <Card>
          <SectionHeading
            title="Journal d'audit (append-only)"
            subtitle="Chaque action métier est écrite ici de manière immuable, avec empreinte SHA-256 et acteur tracé. Les payloads sensibles sont hors-ligne."
            level={2}
            action={
              <form method="get" style={{ display: "inline-flex", gap: 8 }}>
                <label
                  style={{
                    fontSize: 12,
                    color: "var(--ink-600)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  Filtrer par verbe
                  <Select
                    name="verbe"
                    defaultValue={sp.verbe ?? ""}
                    style={{ width: 220 }}
                  >
                    <option value="">Tous</option>
                    {verbs.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </Select>
                </label>
              </form>
            }
          />
          {events.length === 0 ? (
            <div
              style={{
                padding: "32px 16px",
                textAlign: "center",
                color: "var(--ink-600)",
              }}
            >
              <Icon
                name="shield"
                size={28}
                style={{ color: "var(--ink-400)", marginBottom: 10 }}
                aria-hidden="true"
              />
              <p style={{ fontSize: 14.5, fontWeight: 600 }}>
                Aucun événement
              </p>
              <p style={{ fontSize: 13 }}>
                Le journal d&apos;audit sera alimenté dès que des actions
                métier seront effectuées sur la plateforme.
              </p>
            </div>
          ) : (
            <Table>
              <caption className="sr-only">
                {events.length} événements d&apos;audit
              </caption>
              <thead>
                <tr>
                  <Th scope="col">Quand</Th>
                  <Th scope="col">Verbe</Th>
                  <Th scope="col">Acteur</Th>
                  <Th scope="col">Organisme</Th>
                  <Th scope="col">Cible</Th>
                  <Th scope="col">Empreinte</Th>
                  <Th scope="col">Scellé</Th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <Tr key={e.id}>
                    <Td>
                      <time
                        dateTime={new Date(e.occurredAt).toISOString()}
                        title={e.occurredAtLabel}
                      >
                        {e.occurredAtRelative}
                      </time>
                    </Td>
                    <Td>
                      <span style={{ fontWeight: 600 }}>{e.verbLabel}</span>
                      <div
                        style={{
                          fontSize: 11.5,
                          color: "var(--ink-500)",
                          fontFamily: "var(--font-mono)",
                          marginTop: 2,
                        }}
                      >
                        {e.verb}
                      </div>
                    </Td>
                    <Td>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontWeight: 600 }}>{e.actorName}</span>
                        {e.actorRole && (
                          <span
                            style={{ fontSize: 11.5, color: "var(--ink-500)" }}
                          >
                            {e.actorRole}
                          </span>
                        )}
                      </div>
                    </Td>
                    <Td style={{ color: "var(--ink-700)" }}>
                      {e.organism ?? "—"}
                    </Td>
                    <Td>
                      <span
                        style={{
                          fontSize: 12,
                          color: "var(--ink-700)",
                        }}
                      >
                        {e.subjectKind}
                      </span>
                    </Td>
                    <Td
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11.5,
                        color: "var(--ink-600)",
                      }}
                    >
                      {e.payloadHash}
                    </Td>
                    <Td>
                      {e.sealed ? (
                        <Badge tone="archived" size="sm" dot>
                          Scellé
                        </Badge>
                      ) : (
                        <Badge tone="neutral" size="sm" dot>
                          En attente
                        </Badge>
                      )}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        {/* Scellements quotidiens */}
        <Card>
          <SectionHeading
            title="Scellements quotidiens"
            subtitle="Chaque jour, le lot d'événements est scellé par une chaîne SHA-256 cumulative. La rupture d'un seul scellement invaliderait toute la chaîne suivante."
            level={2}
          />
          {seals.length === 0 ? (
            <div
              style={{
                padding: "32px 16px",
                textAlign: "center",
                color: "var(--ink-600)",
              }}
            >
              <Icon
                name="shield"
                size={24}
                style={{ color: "var(--ink-400)", marginBottom: 10 }}
                aria-hidden="true"
              />
              <p style={{ fontSize: 13 }}>
                Aucun scellement enregistré pour l&apos;instant.
              </p>
            </div>
          ) : (
            <Table>
              <caption className="sr-only">
                Liste des scellements quotidiens
              </caption>
              <thead>
                <tr>
                  <Th scope="col">Jour</Th>
                  <Th scope="col">Événements</Th>
                  <Th scope="col">Empreinte chaîne</Th>
                  <Th scope="col">Scellé le</Th>
                  <Th scope="col">Horodatage qualifié</Th>
                </tr>
              </thead>
              <tbody>
                {seals.map((s) => (
                  <Tr key={s.id}>
                    <Td style={{ fontWeight: 600 }}>{s.day}</Td>
                    <Td
                      style={{
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {s.entryCount}
                    </Td>
                    <Td
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 11.5,
                        color: "var(--ink-700)",
                      }}
                    >
                      {s.sha256Short}
                    </Td>
                    <Td style={{ color: "var(--ink-600)" }}>{s.sealedAtLabel}</Td>
                    <Td>
                      {s.qualifiedTimestamp ? (
                        <Badge tone="archived" size="sm" dot>
                          Présent
                        </Badge>
                      ) : (
                        <Badge tone="warning" size="sm" dot>
                          Manquant
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
