import type { CSSProperties, ReactNode } from "react"

export interface FrameProps {
  width?: number
  height?: number
  children?: ReactNode
  style?: CSSProperties
}

export const Frame = ({ width = 1440, height = 900, children, style }: FrameProps) => (
  <div
    style={{
      width,
      minHeight: height,
      height: "auto",
      background: "var(--ink-100)",
      overflow: "hidden",
      position: "relative",
      fontFamily: "var(--font-sans)",
      color: "var(--ink-900)",
      ...style,
    }}
  >
    {children}
  </div>
)
