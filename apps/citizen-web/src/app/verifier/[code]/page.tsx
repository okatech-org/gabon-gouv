import Link from "next/link"
import { headers } from "next/headers"
import { Badge, Icon, Logo, RepublicBar } from "@workspace/ui"
import { api } from "@workspace/backend/generated"
import { convex } from "@/lib/convex"

/**
 * Vérification publique d'un acte délivré (Bloc 4).
 *
 * Page **sans authentification** — accessible par n'importe quel destinataire
 * d'un acte (banquier, employeur, consulat, etc.) qui scanne le QR ou tape
 * le code de vérification dans son navigateur.
 *
 * 3 états d'affichage selon le résultat :
 *   - `valid` : badge vert + carte récap (numéro, titre, organisme, date,
 *     bénéficiaire, empreinte courte). Aucune PII détaillée (pas de date de
 *     naissance, pas d'adresse).
 *   - `revoked` : badge rouge + motif + carte récap dégradée (raye le doc).
 *   - `unknown` : empty state, le code n'existe pas dans le registre.
 *
 * RGAA :
 *   - `<main id="main">` avec lang fr (hérité du root).
 *   - hiérarchie h1 → h2 cohérente.
 *   - `role="status"` pour le résultat (annonce par AT à l'arrivée).
 *   - statut signalé par texte + icône + couleur (jamais que la couleur).
 */
export default async function VerifyPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params

  // Hash de l'IP pour audit anti-brute-force (pas de stockage PII brute).
  const hdrs = await headers()
  const ipRaw =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    hdrs.get("x-real-ip") ??
    null
  const userAgent = hdrs.get("user-agent") ?? undefined
  const verifierIpHash = ipRaw ? await sha256Hex(ipRaw) : undefined

  const result = await convex.mutation(api.public.verify.verifyByCode, {
    code,
    verifierIpHash,
    userAgent,
  })

  return (
    <div style={{ minHeight: "100vh", background: "white" }}>
      <RepublicBar />
      <header
        style={{
          borderBottom: "1px solid var(--ink-200)",
          padding: "16px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        <Link
          href="/"
          aria-label="Gabon Connect — accueil"
          style={{ display: "inline-flex" }}
        >
          <Logo />
        </Link>
        <nav aria-label="Navigation principale">
          <ul
            style={{
              display: "flex",
              gap: 18,
              listStyle: "none",
              margin: 0,
              padding: 0,
              fontSize: 14,
            }}
          >
            <li>
              <Link href="/" style={{ color: "var(--ink-700)" }}>
                Accueil
              </Link>
            </li>
            <li>
              <Link href="/aide" style={{ color: "var(--ink-700)" }}>
                Aide
              </Link>
            </li>
          </ul>
        </nav>
      </header>

      <main
        id="main"
        tabIndex={-1}
        style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px" }}
      >
        <p
          style={{
            fontSize: 12,
            color: "var(--ink-500)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            margin: 0,
          }}
        >
          Vérification publique d&apos;un acte
        </p>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            margin: "8px 0 4px",
            color: "var(--ink-900)",
          }}
        >
          Code{" "}
          <span style={{ fontFamily: "var(--font-mono)" }}>{code}</span>
        </h1>
        <p style={{ fontSize: 14, color: "var(--ink-600)", margin: 0 }}>
          Cette page atteste de l&apos;authenticité d&apos;un acte délivré par
          la République Gabonaise via Gabon Connect.
        </p>

        <div style={{ marginTop: 32 }}>
          {result.outcome === "valid" && result.document && (
            <ValidPanel doc={result.document} />
          )}
          {result.outcome === "revoked" && result.document && (
            <RevokedPanel doc={result.document} />
          )}
          {result.outcome === "unknown" && <UnknownPanel code={code} />}
        </div>

        <FAQ />
      </main>

      <footer
        style={{
          borderTop: "1px solid var(--ink-200)",
          padding: "24px",
          textAlign: "center",
          fontSize: 12,
          color: "var(--ink-500)",
          marginTop: 64,
        }}
      >
        Gabon Connect — République Gabonaise · Union · Travail · Justice
      </footer>
    </div>
  )
}

/* ============================================================
   Panels par outcome
   ============================================================ */

interface DocSafe {
  actNumber: string
  title: string
  organismName: string
  issuedAt: number
  revokedAt?: number
  revocationReason?: string
  sha256Short: string
  beneficiaryName: string
}

function ValidPanel({ doc }: { doc: DocSafe }) {
  return (
    <section
      role="status"
      aria-live="polite"
      aria-labelledby="result-heading"
      style={panelStyle("var(--success-500)", "var(--success-50)")}
    >
      <h2
        id="result-heading"
        style={{
          fontSize: 22,
          fontWeight: 700,
          margin: 0,
          color: "var(--success-700)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <Icon name="check" size={22} aria-hidden="true" />
        Acte authentique et valide
      </h2>
      <p
        style={{
          fontSize: 14,
          color: "var(--ink-700)",
          margin: "8px 0 24px",
        }}
      >
        Ce document a bien été émis par les services de l&apos;État gabonais.
        Il n&apos;a pas été révoqué.
      </p>
      <DocDetails doc={doc} />
    </section>
  )
}

function RevokedPanel({ doc }: { doc: DocSafe }) {
  return (
    <section
      role="status"
      aria-live="polite"
      aria-labelledby="result-heading"
      style={panelStyle("var(--danger-500)", "var(--danger-50)")}
    >
      <h2
        id="result-heading"
        style={{
          fontSize: 22,
          fontWeight: 700,
          margin: 0,
          color: "var(--danger-700)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <Icon name="alertTriangle" size={22} aria-hidden="true" />
        Acte révoqué
      </h2>
      <p
        style={{
          fontSize: 14,
          color: "var(--ink-700)",
          margin: "8px 0 16px",
        }}
      >
        Cet acte a été révoqué par l&apos;organisme émetteur. Il n&apos;est
        plus valide.
      </p>
      {doc.revocationReason && (
        <p
          style={{
            fontSize: 13,
            padding: 12,
            background: "white",
            border: "1px solid var(--danger-200)",
            borderRadius: 6,
            color: "var(--ink-700)",
            margin: "0 0 16px",
            fontStyle: "italic",
          }}
        >
          <strong>Motif :</strong> {doc.revocationReason}
        </p>
      )}
      {doc.revokedAt && (
        <p style={{ fontSize: 12, color: "var(--ink-600)", margin: "0 0 16px" }}>
          Révoqué le {formatDate(doc.revokedAt)}.
        </p>
      )}
      <DocDetails doc={doc} dimmed />
    </section>
  )
}

function UnknownPanel({ code }: { code: string }) {
  return (
    <section
      role="status"
      aria-live="polite"
      aria-labelledby="result-heading"
      style={panelStyle("var(--ink-400)", "var(--ink-50)")}
    >
      <h2
        id="result-heading"
        style={{
          fontSize: 22,
          fontWeight: 700,
          margin: 0,
          color: "var(--ink-800)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <Icon name="x" size={22} aria-hidden="true" />
        Code inconnu
      </h2>
      <p
        style={{
          fontSize: 14,
          color: "var(--ink-700)",
          margin: "8px 0 16px",
        }}
      >
        Le code <strong style={{ fontFamily: "var(--font-mono)" }}>{code}</strong>{" "}
        ne correspond à aucun acte enregistré dans nos services. Vérifiez la
        saisie ou contactez l&apos;organisme émetteur.
      </p>
      <p style={{ fontSize: 13, color: "var(--ink-600)", margin: 0 }}>
        Format attendu :{" "}
        <span style={{ fontFamily: "var(--font-mono)" }}>GC-XX-NNNN</span>{" "}
        (où XX est un code à 2 lettres et NNNN un numéro à 4 chiffres).
      </p>
    </section>
  )
}

function DocDetails({ doc, dimmed }: { doc: DocSafe; dimmed?: boolean }) {
  const rows: Array<[string, string]> = [
    ["Numéro d'acte", doc.actNumber],
    ["Type", doc.title],
    ["Organisme émetteur", doc.organismName],
    ["Bénéficiaire", doc.beneficiaryName],
    ["Date d'émission", formatDate(doc.issuedAt)],
    ["Empreinte SHA-256", `${doc.sha256Short}…`],
  ]
  return (
    <dl
      style={{
        margin: 0,
        display: "grid",
        gridTemplateColumns: "minmax(160px, max-content) 1fr",
        gap: "10px 24px",
        fontSize: 14,
        background: "white",
        padding: 16,
        borderRadius: 8,
        border: "1px solid var(--ink-200)",
        opacity: dimmed ? 0.7 : 1,
      }}
    >
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: "contents" }}>
          <dt style={{ color: "var(--ink-500)" }}>{k}</dt>
          <dd
            style={{
              margin: 0,
              fontWeight: 600,
              color: "var(--ink-900)",
              fontFamily: k === "Empreinte SHA-256" ? "var(--font-mono)" : "inherit",
            }}
          >
            {v}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function FAQ() {
  return (
    <section
      aria-labelledby="faq-heading"
      style={{ marginTop: 48 }}
    >
      <h2 id="faq-heading" style={{ fontSize: 18, fontWeight: 700 }}>
        Questions fréquentes
      </h2>
      <details
        style={{
          marginTop: 12,
          padding: 12,
          border: "1px solid var(--ink-200)",
          borderRadius: 6,
        }}
      >
        <summary style={{ cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
          Pourquoi certaines informations ne sont pas affichées ?
        </summary>
        <p style={{ marginTop: 8, fontSize: 13, color: "var(--ink-700)" }}>
          Pour des raisons de confidentialité (RGPD), seules les informations
          strictement nécessaires à la vérification d&apos;authenticité sont
          affichées. La date et le lieu de naissance, l&apos;adresse, ou les
          mentions marginales ne sont visibles que par le titulaire de
          l&apos;acte ou par les autorités habilitées.
        </p>
      </details>
      <details
        style={{
          marginTop: 8,
          padding: 12,
          border: "1px solid var(--ink-200)",
          borderRadius: 6,
        }}
      >
        <summary style={{ cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
          Comment puis-je être sûr que cette page est officielle ?
        </summary>
        <p style={{ marginTop: 8, fontSize: 13, color: "var(--ink-700)" }}>
          Cette page est hébergée sur le domaine{" "}
          <span style={{ fontFamily: "var(--font-mono)" }}>gabon.connect</span>{" "}
          (vérifiez l&apos;URL dans votre navigateur). Le service est opéré
          par la République Gabonaise via la Direction Générale des Affaires
          Numériques.
        </p>
      </details>
      <details
        style={{
          marginTop: 8,
          padding: 12,
          border: "1px solid var(--ink-200)",
          borderRadius: 6,
        }}
      >
        <summary style={{ cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
          Que faire si l&apos;acte que je vérifie est marqué « révoqué » ?
        </summary>
        <p style={{ marginTop: 8, fontSize: 13, color: "var(--ink-700)" }}>
          Un acte révoqué n&apos;a plus de valeur légale. Contactez la
          personne qui vous a remis le document pour qu&apos;elle demande
          un nouvel acte auprès de l&apos;organisme émetteur.
        </p>
      </details>
    </section>
  )
}

/* ============================================================
   Helpers
   ============================================================ */

function panelStyle(
  borderColor: string,
  bgColor: string,
): React.CSSProperties {
  return {
    border: `2px solid ${borderColor}`,
    background: bgColor,
    borderRadius: 12,
    padding: 24,
  }
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest("SHA-256", bytes)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

// Badge unused import garde
void Badge
