import {
  Alert,
  Badge,
  Card,
  Icon,
  PageHeader,
  Select,
  StatCard,
  Table,
  Td,
  Th,
  Tr,
  TextInput,
} from "@workspace/ui"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"
import { requirePlatformUser } from "@/lib/current-platform-user"

const PROVINCES: Array<[string, string]> = [
  ["estuaire", "Estuaire"],
  ["haut_ogooue", "Haut-Ogooué"],
  ["moyen_ogooue", "Moyen-Ogooué"],
  ["ngounie", "Ngounié"],
  ["nyanga", "Nyanga"],
  ["ogooue_ivindo", "Ogooué-Ivindo"],
  ["ogooue_lolo", "Ogooué-Lolo"],
  ["ogooue_maritime", "Ogooué-Maritime"],
  ["woleu_ntem", "Woleu-Ntem"],
]

interface PageProps {
  searchParams: Promise<{
    q?: string
    province?: string
    verifies?: string
  }>
}

export default async function PlatformCitoyensPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const { token } = await requirePlatformUser()
  const verifiedOnly = sp.verifies === "1"
  const data = await convex.query(api.platform.citizens.listCitizens, {
    token,
    search: sp.q,
    provinceCode: sp.province ?? undefined,
    verifiedOnly,
    limit: 100,
  })

  return (
    <>
      <PageHeader
        breadcrumbs={["Plateforme", "Citoyens"]}
        title="Citoyens enregistrés"
        subtitle={`${data.total.toLocaleString("fr-FR")} comptes au total · ${data.totalVerified.toLocaleString("fr-FR")} avec identité vérifiée.`}
        meta={
          <Badge tone="warning" dot icon="lock">
            Données sensibles · accès platform_admin
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
        <Alert tone="warning" title="Confidentialité">
          La consultation de cette liste est tracée dans le journal d&apos;audit
          (NF Z42-013). Conformément à la loi 001/2011 sur la protection des
          données, n&apos;effectuez de recherche que dans le cadre de vos
          missions de supervision.
        </Alert>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
          }}
          role="group"
          aria-label="Statistiques citoyens"
        >
          <StatCard
            label="Total comptes"
            value={data.total.toLocaleString("fr-FR")}
            icon="users"
          />
          <StatCard
            label="Identités vérifiées"
            value={data.totalVerified.toLocaleString("fr-FR")}
            icon="shieldCheck"
            hint={
              data.total > 0
                ? `${Math.round((data.totalVerified / data.total) * 100)} %`
                : "—"
            }
          />
          <StatCard
            label="Affichés"
            value={String(data.citizens.length)}
            icon="search"
            hint={
              data.paged
                ? `${data.filteredCount} résultats au total`
                : undefined
            }
          />
        </div>

        <Card>
          <form
            method="get"
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
            }}
            aria-label="Filtres citoyens"
          >
            <label
              style={{
                fontSize: 13,
                color: "var(--ink-700)",
                fontWeight: 600,
              }}
            >
              Recherche
              <TextInput
                name="q"
                defaultValue={sp.q ?? ""}
                placeholder="NIP, nom ou e-mail…"
                icon="search"
                style={{ width: 280, marginLeft: 8 }}
              />
            </label>
            <label
              style={{
                fontSize: 13,
                color: "var(--ink-700)",
                fontWeight: 600,
              }}
            >
              Province
              <Select
                name="province"
                defaultValue={sp.province ?? ""}
                style={{ width: 200, marginLeft: 8 }}
              >
                <option value="">Toutes</option>
                {PROVINCES.map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </Select>
            </label>
            <label
              style={{
                fontSize: 13,
                color: "var(--ink-700)",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <input
                type="checkbox"
                name="verifies"
                value="1"
                defaultChecked={verifiedOnly}
                style={{ width: 16, height: 16, accentColor: "var(--primary-500)" }}
              />
              Vérifiés seulement
            </label>
          </form>
        </Card>

        <Card>
          {data.citizens.length === 0 ? (
            <div
              style={{
                padding: "48px 24px",
                textAlign: "center",
                color: "var(--ink-600)",
              }}
            >
              <Icon
                name="users"
                size={36}
                style={{ color: "var(--ink-400)", marginBottom: 12 }}
                aria-hidden="true"
              />
              <h2 style={{ fontSize: 17, marginBottom: 6 }}>
                Aucun citoyen ne correspond
              </h2>
              <p style={{ fontSize: 14 }}>
                Essayez d&apos;élargir les filtres.
              </p>
            </div>
          ) : (
            <Table>
              <caption className="sr-only">
                Liste des citoyens enregistrés
              </caption>
              <thead>
                <tr>
                  <Th scope="col">Citoyen</Th>
                  <Th scope="col">NIP</Th>
                  <Th scope="col">Province</Th>
                  <Th scope="col">Identité</Th>
                  <Th scope="col">Demandes</Th>
                  <Th scope="col">Documents</Th>
                  <Th scope="col">Compte créé</Th>
                </tr>
              </thead>
              <tbody>
                {data.citizens.map((c) => (
                  <Tr key={c.id}>
                    <Td>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>{c.name}</span>
                        {c.email && (
                          <span
                            style={{
                              fontSize: 12,
                              color: "var(--ink-500)",
                              fontFamily: "var(--font-mono)",
                            }}
                          >
                            {c.email}
                          </span>
                        )}
                      </div>
                    </Td>
                    <Td
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 12.5,
                      }}
                    >
                      {c.nip}
                    </Td>
                    <Td>
                      {c.addressProvinceCode ?? c.birthProvinceCode
                        ? provinceLabel(
                            c.addressProvinceCode ?? c.birthProvinceCode ?? "",
                          )
                        : "—"}
                    </Td>
                    <Td>
                      {c.identityVerified ? (
                        <Badge tone="archived" dot icon="shieldCheck">
                          Vérifiée
                        </Badge>
                      ) : (
                        <Badge tone="warning" dot>
                          Non vérifiée
                        </Badge>
                      )}
                    </Td>
                    <Td
                      style={{
                        fontVariantNumeric: "tabular-nums",
                        fontWeight: 600,
                      }}
                    >
                      {c.requests}
                    </Td>
                    <Td
                      style={{
                        fontVariantNumeric: "tabular-nums",
                        fontWeight: 600,
                      }}
                    >
                      {c.documents}
                    </Td>
                    <Td style={{ color: "var(--ink-600)" }}>
                      <time
                        dateTime={new Date(c.createdAt).toISOString()}
                      >
                        {c.createdAtLabel}
                      </time>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
          {data.paged && (
            <p
              style={{
                fontSize: 12.5,
                color: "var(--ink-600)",
                marginTop: 14,
                textAlign: "center",
              }}
            >
              <Icon
                name="info"
                size={12}
                style={{ verticalAlign: "middle", marginRight: 6 }}
                aria-hidden="true"
              />
              Affichage limité aux 100 premiers résultats. Affinez la recherche
              pour préciser.
            </p>
          )}
        </Card>
      </div>
    </>
  )
}

function provinceLabel(code: string): string {
  const found = PROVINCES.find(([k]) => k === code)
  return found?.[1] ?? code
}
