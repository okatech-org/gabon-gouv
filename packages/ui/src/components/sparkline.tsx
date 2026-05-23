export interface SparklineProps {
  values: number[]
  width?: number
  height?: number
  tone?: "primary" | "success"
}

export const Sparkline = ({ values, width = 600, height = 160, tone = "primary" }: SparklineProps) => {
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const stepX = width / (values.length - 1)
  const points = values
    .map((v, i) => `${i * stepX},${height - ((v - min) / range) * (height - 20) - 10}`)
    .join(" ")
  const area = `0,${height} ${points} ${width},${height}`
  const color = tone === "primary" ? "var(--primary-500)" : "var(--success-500)"
  const gradientId = `sparkline-${tone}-${values.length}`
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: "block", maxWidth: "100%" }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon fill={`url(#${gradientId})`} points={area} />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  )
}
