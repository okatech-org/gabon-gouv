import { Icon, SectionHeading } from "@workspace/ui"

export default function SignaturePage() {
  return (
    <div
      style={{
        padding: "24px 32px",
        maxWidth: 900,
        width: "100%",
      }}
    >
      <SectionHeading
        title="Circuit de signature"
        subtitle="Qui signe les documents générés par ce service, et dans quel ordre."
        level={2}
      />
      <div
        style={{
          marginTop: 16,
          padding: 24,
          background: "var(--ink-50)",
          border: "1px dashed var(--ink-300)",
          borderRadius: 8,
          color: "var(--ink-700)",
          fontSize: 14,
          display: "flex",
          gap: 12,
          alignItems: "flex-start",
        }}
      >
        <Icon
          name="shieldCheck"
          size={20}
          style={{ color: "var(--ink-500)", flexShrink: 0, marginTop: 2 }}
          aria-hidden="true"
        />
        <div>
          <strong>À venir au Bloc 3 — traitement des demandes.</strong>
          <p style={{ marginTop: 6, color: "var(--ink-600)", fontSize: 13 }}>
            Configuration du circuit par défaut : rôles signataires, ordre des
            signatures, signataires de secours. Le champ
            <code
              style={{
                fontSize: 12,
                background: "white",
                padding: "1px 6px",
                borderRadius: 3,
                margin: "0 4px",
              }}
            >
              defaultSignatureCircuitTemplate
            </code>
            est déjà prévu côté schéma.
          </p>
        </div>
      </div>
    </div>
  )
}
