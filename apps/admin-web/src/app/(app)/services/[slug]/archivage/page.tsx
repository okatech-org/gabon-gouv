import { Icon, SectionHeading } from "@workspace/ui"

export default function ArchivagePage() {
  return (
    <div
      style={{
        padding: "24px 32px",
        maxWidth: 900,
        width: "100%",
      }}
    >
      <SectionHeading
        title="Archivage SAE"
        subtitle="Politique d'archivage des documents délivrés (DUA, sort final, replicas)."
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
          name="archive"
          size={20}
          style={{ color: "var(--ink-500)", flexShrink: 0, marginTop: 2 }}
          aria-hidden="true"
        />
        <div>
          <strong>À venir au Bloc 6 — archivage SAE complet.</strong>
          <p style={{ marginTop: 6, color: "var(--ink-600)", fontSize: 13 }}>
            Configuration de la DUA (durée d'utilité administrative), du sort
            final (conservation indéfinie, élimination), des replicas et des
            règles de versement automatique. Ces champs seront ajoutés au
            schéma à ce moment-là.
          </p>
        </div>
      </div>
    </div>
  )
}
