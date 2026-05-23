export interface DonutProps {
  value: number
  label: string
  color?: string
}

export const Donut = ({ value, label, color = "var(--primary-500)" }: DonutProps) => {
  const r = 56
  const c = 2 * Math.PI * r
  const off = c - (value / 100) * c
  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      <circle cx="70" cy="70" r={r} fill="none" stroke="var(--ink-150)" strokeWidth="14" />
      <circle
        cx="70"
        cy="70"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="14"
        strokeDasharray={c}
        strokeDashoffset={off}
        strokeLinecap="round"
        transform="rotate(-90 70 70)"
      />
      <text
        x="70"
        y="74"
        textAnchor="middle"
        fontSize="22"
        fontWeight="700"
        fill="var(--ink-900)"
      >
        {label}
      </text>
    </svg>
  )
}
