"use client"

import {
  Badge,
  Icon,
  SectionHeading,
  StatCard,
  Table,
  Td,
  Th,
  Tr,
  type Tone,
} from "@workspace/ui"

interface Variant {
  id: string
  label: string
  isDefault: boolean
  requestsLast30d: number
}

interface RelatedRequest {
  ref: string
  status: string
  depositedAt: number
  progressPct: number
}

interface Props {
  requests30d: number
  variantsCount: number
  requirementsCount: number
  satisfaction: number | null
  topVariants: Variant[]
  relatedRequests: RelatedRequest[]
}

function statusTone(s: string): Tone {
  switch (s) {
    case "issued":
      return "success"
    case "rejected":
      return "danger"
    case "cancelled":
      return "neutral"
    default:
      return "warning"
  }
}

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    submitted: "Déposée",
    in_instruction: "En instruction",
    waiting_pieces: "Pièces attendues",
    waiting_registry: "Registre attendu",
    prepared: "Préparée",
    to_sign: "À signer",
    issued: "Délivrée",
    rejected: "Rejetée",
    cancelled: "Annulée",
  }
  return map[s] ?? s
}

export function StatsPanel({
  requests30d,
  variantsCount,
  requirementsCount,
  satisfaction,
  topVariants,
  relatedRequests,
}: Props) {
  const sortedVariants = [...topVariants].sort(
    (a, b) => b.requestsLast30d - a.requestsLast30d,
  )

  return (
    <div
      style={{
        padding: "24px 32px",
        maxWidth: 1100,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      <SectionHeading
        title="Statistiques du service"
        subtitle="Vue d'ensemble sur les 30 derniers jours."
        level={2}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
        }}
        role="group"
        aria-label="Indicateurs clés"
      >
        <StatCard
          label="Demandes 30 jours"
          value={String(requests30d)}
          icon="inbox"
        />
        <StatCard
          label="Variantes actives"
          value={String(variantsCount)}
          icon="layers"
        />
        <StatCard
          label="Pièces requises"
          value={String(requirementsCount)}
          icon="paperclip"
        />
        <StatCard
          label="Satisfaction"
          value={
            typeof satisfaction === "number"
              ? `${satisfaction.toFixed(1).replace(".", ",")}/5`
              : "—"
          }
          icon="star"
        />
      </div>

      <div>
        <SectionHeading title="Top variantes (30 jours)" level={3} />
        {sortedVariants.every((v) => v.requestsLast30d === 0) ? (
          <p style={{ fontSize: 13, color: "var(--ink-600)" }}>
            Aucune demande sur les 30 derniers jours.
          </p>
        ) : (
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {sortedVariants.slice(0, 5).map((v) => {
              const max = Math.max(
                ...sortedVariants.map((x) => x.requestsLast30d),
                1,
              )
              const pct = Math.round((v.requestsLast30d / max) * 100)
              return (
                <li
                  key={v.id}
                  style={{
                    background: "white",
                    border: "1px solid var(--ink-200)",
                    borderRadius: 8,
                    padding: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 6,
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: 14 }}>
                      {v.label}
                      {v.isDefault && (
                        <Badge
                          tone="primary"
                          size="sm"
                          style={{ marginLeft: 8 }}
                        >
                          Défaut
                        </Badge>
                      )}
                    </span>
                    <span
                      style={{
                        fontVariantNumeric: "tabular-nums",
                        fontWeight: 600,
                      }}
                    >
                      {v.requestsLast30d}
                    </span>
                  </div>
                  <div
                    style={{
                      height: 6,
                      background: "var(--ink-100)",
                      borderRadius: 3,
                      overflow: "hidden",
                    }}
                    role="progressbar"
                    aria-valuenow={v.requestsLast30d}
                    aria-valuemin={0}
                    aria-valuemax={max}
                    aria-label={`${v.requestsLast30d} demande${v.requestsLast30d > 1 ? "s" : ""} sur ${max} maximum`}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${pct}%`,
                        background: "var(--primary-500)",
                      }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div>
        <SectionHeading title="Dernières demandes" level={3} />
        {relatedRequests.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--ink-600)" }}>
            Aucune demande liée pour le moment.
          </p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th scope="col">Référence</Th>
                <Th scope="col">Statut</Th>
                <Th scope="col">Déposée</Th>
                <Th scope="col">Avancement</Th>
              </tr>
            </thead>
            <tbody>
              {relatedRequests.map((r) => (
                <Tr key={r.ref}>
                  <Td>
                    <code style={{ fontSize: 12 }}>{r.ref}</code>
                  </Td>
                  <Td>
                    <Badge tone={statusTone(r.status)} dot>
                      {statusLabel(r.status)}
                    </Badge>
                  </Td>
                  <Td>
                    <time dateTime={new Date(r.depositedAt).toISOString()}>
                      {new Date(r.depositedAt).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </time>
                  </Td>
                  <Td
                    style={{
                      fontVariantNumeric: "tabular-nums",
                      fontWeight: 600,
                    }}
                  >
                    {r.progressPct} %
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>

      <p
        style={{
          fontSize: 12,
          color: "var(--ink-500)",
          padding: 12,
          background: "var(--ink-50)",
          borderRadius: 6,
        }}
      >
        <Icon
          name="info"
          size={12}
          style={{ verticalAlign: "middle", marginRight: 6 }}
          aria-hidden="true"
        />
        Statistiques avancées (délai réel par étape, distribution satisfaction,
        graphique 30 j jour par jour) — à venir avec les blocs suivants.
      </p>
    </div>
  )
}
