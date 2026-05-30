import { Fragment } from "react"
import Link from "next/link"
import {
  Badge,
  Button,
  Card,
  Icon,
  ProbatoryBanner,
  type IconName,
} from "@workspace/ui"
import { notFound } from "next/navigation"
import { api } from "@workspace/backend/generated"
import { getCitizenConvex } from "@/lib/convex"
import { requireCurrentSession } from "@/lib/current-citizen"

export default async function CitizenDocumentPage({
  params,
}: {
  params: Promise<{ ref: string }>
}) {
  const { ref } = await params
  const session = await requireCurrentSession()
  const convex = await getCitizenConvex(session)
  const doc = await convex.query(api.citizen.documents.getMyDocument, {
    actNumber: ref,
  })
  if (!doc) notFound()

  const linked: { icon: IconName; title: string; description: string; href: string }[] = [
    ...(doc.requestRef
      ? [
          {
            icon: "inbox" as IconName,
            title: `Demande ${doc.requestRef}`,
            description: `Délivrée le ${doc.deliveredAt}`,
            href: `/mon-espace/demarches/${doc.requestRef}`,
          },
        ]
      : []),
    {
      icon: "folder" as IconName,
      title: `Mon dossier · ${doc.org}`,
      description: "Voir l'historique",
      href: "#",
    },
  ]

  return (
    <main style={{ padding: "32px 64px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            color: "var(--ink-600)",
            marginBottom: 12,
          }}
        >
          <Link href="/mon-espace">Mes documents</Link>
          <Icon name="chevronRight" size={12} />
          <span style={{ color: "var(--ink-900)", fontWeight: 600 }}>
            Acte de naissance · {doc.deliveredAt}
          </span>
        </nav>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <div>
            <Badge tone="archived" dot icon="shieldCheck">
              Document signé électroniquement · valeur probante
            </Badge>
            <h1
              style={{
                fontSize: 30,
                marginTop: 12,
                letterSpacing: "-0.02em",
              }}
            >
              {doc.title}
            </h1>
            <p
              style={{
                fontSize: 14,
                color: "var(--ink-600)",
                marginTop: 4,
              }}
            >
              Délivré le {doc.deliveredAt} par la {doc.org} · valable indéfiniment.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="secondary" icon="share">
              Partager
            </Button>
            <Button icon="download">Télécharger PDF</Button>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 360px",
            gap: 20,
          }}
        >
          {/* Document preview */}
          <div
            style={{
              background: "white",
              border: "1px solid var(--ink-200)",
              borderRadius: 8,
              padding: "48px 56px",
              minHeight: 520,
              position: "relative",
              boxShadow: "var(--shadow-md)",
            }}
          >
            {/* Watermark */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%) rotate(-22deg)",
                fontSize: 72,
                fontWeight: 900,
                color: "rgba(26, 68, 128, 0.06)",
                letterSpacing: "0.1em",
                userSelect: "none",
                pointerEvents: "none",
              }}
            >
              GABON CONNECT
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderBottom: "2px solid var(--ink-900)",
                paddingBottom: 14,
                marginBottom: 28,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                  }}
                >
                  RÉPUBLIQUE GABONAISE
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--ink-700)",
                    marginTop: 2,
                  }}
                >
                  Union · Travail · Justice
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    marginTop: 8,
                  }}
                >
                  Ministère de l&apos;Intérieur
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-700)" }}>
                  Direction Générale de l&apos;État Civil
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "var(--ink-600)" }}>
                  Acte n°{" "}
                  <b style={{ color: "var(--ink-900)" }}>{doc.actNumber}</b>
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-600)" }}>
                  Commune de{" "}
                  <b style={{ color: "var(--ink-900)" }}>{doc.commune}</b>
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-600)" }}>
                  Année <b style={{ color: "var(--ink-900)" }}>{doc.year}</b>
                </div>
              </div>
            </div>

            <h2
              style={{
                fontSize: 22,
                textAlign: "center",
                letterSpacing: "0.04em",
              }}
            >
              EXTRAIT D&apos;ACTE DE NAISSANCE
            </h2>
            <p
              style={{
                fontSize: 12,
                color: "var(--ink-600)",
                textAlign: "center",
                marginTop: 4,
              }}
            >
              (Copie intégrale)
            </p>

            <div
              style={{
                marginTop: 32,
                display: "grid",
                gridTemplateColumns: "180px 1fr",
                gap: "10px 16px",
                fontSize: 13.5,
              }}
            >
              {doc.meta.map((m) => (
                <Fragment key={m.label}>
                  <div style={{ color: "var(--ink-600)" }}>{m.label}</div>
                  <div style={{ fontWeight: 600 }}>{m.value}</div>
                </Fragment>
              ))}
            </div>

            <div
              style={{
                marginTop: 36,
                paddingTop: 20,
                borderTop: "1px dashed var(--ink-300)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "var(--ink-600)",
                  maxWidth: 360,
                }}
              >
                Délivré conformément aux articles 71 et suivants du Code civil
                gabonais. Pour copie certifiée conforme à l&apos;original.
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "var(--ink-600)" }}>
                  L&apos;officier d&apos;état civil
                </div>
                <div
                  style={{
                    fontFamily: "cursive",
                    fontSize: 22,
                    color: "var(--primary-700)",
                    marginTop: 8,
                    fontStyle: "italic",
                  }}
                >
                  {doc.signatory}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--ink-700)",
                    marginTop: 4,
                  }}
                >
                  {doc.signedAt}
                </div>
              </div>
            </div>
          </div>

          {/* Métadonnées probantes */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <ProbatoryBanner
              hash={doc.hash}
              timestamp={doc.timestamp}
              signature={doc.signature}
            />
            <Card>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--ink-500)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 8,
                }}
              >
                Vérification publique
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--ink-700)",
                  marginBottom: 14,
                }}
              >
                Tout tiers peut vérifier l&apos;authenticité de ce document en scannant
                le QR code ci-dessous ou via gabon.connect/v.
              </p>
              <div
                style={{
                  display: "flex",
                  gap: 14,
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    width: 100,
                    height: 100,
                    background: "var(--ink-900)",
                    borderRadius: 4,
                    position: "relative",
                    flexShrink: 0,
                  }}
                >
                  <svg width="100" height="100" viewBox="0 0 100 100">
                    {Array.from({ length: 196 }).map((_, i) => {
                      const r = Math.floor(i / 14)
                      const c = i % 14
                      const on =
                        (r * 31 + c * 17) % 7 < 3 ||
                        (r < 3 && c < 3) ||
                        (r > 10 && c < 3) ||
                        (r < 3 && c > 10)
                      return (
                        <rect
                          key={i}
                          x={c * 7 + 1}
                          y={r * 7 + 1}
                          width="6"
                          height="6"
                          fill={on ? "white" : "transparent"}
                        />
                      )
                    })}
                  </svg>
                </div>
                <div style={{ fontSize: 12 }}>
                  <div style={{ color: "var(--ink-500)" }}>Code</div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontWeight: 700,
                      fontSize: 15,
                      marginTop: 2,
                    }}
                  >
                    {doc.verificationCode}
                  </div>
                  <a
                    href="#"
                    style={{
                      fontSize: 12,
                      marginTop: 8,
                      display: "inline-block",
                    }}
                  >
                    Vérifier en ligne →
                  </a>
                </div>
              </div>
            </Card>
            <Card>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--ink-500)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 8,
                }}
              >
                Lié à
              </div>
              {linked.map((l) => {
                const isInternal = l.href.startsWith("/")
                const linkStyle = {
                  display: "flex",
                  gap: 10,
                  padding: "8px 0",
                  borderBottom: "1px solid var(--ink-150)",
                  textDecoration: "none",
                  color: "inherit",
                } as const
                const inner = (
                  <>
                    <Icon
                      name={l.icon}
                      size={16}
                      style={{ color: "var(--ink-500)", marginTop: 2 }}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{l.title}</div>
                      <div style={{ fontSize: 12, color: "var(--ink-600)" }}>
                        {l.description}
                      </div>
                    </div>
                  </>
                )
                return isInternal ? (
                  <Link key={l.title} href={l.href} style={linkStyle}>
                    {inner}
                  </Link>
                ) : (
                  <a key={l.title} href={l.href} style={linkStyle}>
                    {inner}
                  </a>
                )
              })}
            </Card>
          </div>
        </div>
      </div>
    </main>
  )
}
