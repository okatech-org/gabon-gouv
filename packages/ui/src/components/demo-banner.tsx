import { Icon } from "./icon"

export const DemoBanner = () => (
  <div
    style={{
      background: "var(--warning-100)",
      borderBottom: "1px solid #f0c269",
      padding: "6px 24px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      fontSize: 12,
      color: "var(--warning-600)",
      fontWeight: 600,
    }}
  >
    <Icon name="alertTriangle" size={13} />
    Environnement de démonstration — les données affichées n&apos;ont aucune valeur probante
  </div>
)
