"use client"

import {
  forwardRef,
  type CSSProperties,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react"
import { Icon, type IconName } from "./icon"

/* ---------- Field wrapper ---------- */

export interface FieldProps {
  label?: ReactNode
  hint?: ReactNode
  error?: ReactNode
  required?: boolean
  children?: ReactNode
  htmlFor?: string
}

export const Field = ({ label, hint, error, required, children, htmlFor }: FieldProps) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    {label && (
      <label
        htmlFor={htmlFor}
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "var(--ink-800)",
          letterSpacing: "0.01em",
        }}
      >
        {label}
        {required && <span style={{ color: "var(--danger-500)", marginLeft: 4 }}>*</span>}
      </label>
    )}
    {children}
    {hint && !error && <span style={{ fontSize: 12, color: "var(--ink-500)" }}>{hint}</span>}
    {error && (
      <span
        style={{
          fontSize: 12,
          color: "var(--danger-500)",
          display: "flex",
          gap: 4,
          alignItems: "center",
        }}
      >
        <Icon name="alertCircle" size={12} />
        {error}
      </span>
    )}
  </div>
)

const INPUT_BASE: CSSProperties = {
  fontFamily: "inherit",
  fontSize: 14,
  color: "var(--ink-900)",
  padding: "8px 12px",
  minHeight: 38,
  background: "white",
  border: "1px solid var(--ink-300)",
  borderRadius: 6,
  outline: "none",
  width: "100%",
  transition: "border-color .12s, box-shadow .12s",
}

/* ---------- TextInput ---------- */

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: IconName
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { icon, style, ...rest },
  ref,
) {
  return (
    <div style={{ position: "relative" }}>
      {icon && (
        <span
          style={{
            position: "absolute",
            left: 12,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--ink-500)",
          }}
        >
          <Icon name={icon} size={16} />
        </span>
      )}
      <input
        ref={ref}
        {...rest}
        style={{ ...INPUT_BASE, paddingLeft: icon ? 36 : 12, ...style }}
      />
    </div>
  )
})

/* ---------- TextArea ---------- */

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function TextArea({ style, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        {...rest}
        style={{ ...INPUT_BASE, minHeight: 100, resize: "vertical", ...style }}
      />
    )
  },
)

/* ---------- Select ---------- */

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  children?: ReactNode
}

export const Select = ({ children, style, ...rest }: SelectProps) => (
  <div style={{ position: "relative" }}>
    <select
      {...rest}
      style={{ ...INPUT_BASE, appearance: "none", paddingRight: 36, ...style }}
    >
      {children}
    </select>
    <span
      style={{
        position: "absolute",
        right: 12,
        top: "50%",
        transform: "translateY(-50%)",
        color: "var(--ink-500)",
        pointerEvents: "none",
      }}
    >
      <Icon name="chevronDown" size={16} />
    </span>
  </div>
)

/* ---------- Checkbox ---------- */

export interface CheckboxProps {
  checked?: boolean
  onChange?: (next: boolean) => void
  label?: ReactNode
  id?: string
  style?: CSSProperties
}

export const Checkbox = ({ checked, onChange, label, id, style }: CheckboxProps) => (
  <label
    htmlFor={id}
    style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", ...style }}
  >
    <span
      style={{
        width: 18,
        height: 18,
        marginTop: 2,
        borderRadius: 3,
        border: `1.5px solid ${checked ? "var(--primary-500)" : "var(--ink-400)"}`,
        background: checked ? "var(--primary-500)" : "white",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        transition: "border-color .1s, background .1s",
      }}
    >
      {checked && <Icon name="check" size={12} stroke={3} style={{ color: "white" }} />}
    </span>
    <input
      type="checkbox"
      id={id}
      checked={Boolean(checked)}
      onChange={(e) => onChange?.(e.target.checked)}
      readOnly={!onChange}
      style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
    />
    {label && (
      <span style={{ fontSize: 14, color: "var(--ink-800)", lineHeight: 1.4 }}>{label}</span>
    )}
  </label>
)

/* ---------- Radio ---------- */

export interface RadioProps {
  checked?: boolean
  onChange?: (next: boolean) => void
  label?: ReactNode
  id?: string
  hint?: ReactNode
  name?: string
  value?: string
}

export const Radio = ({ checked, onChange, label, id, hint, name, value }: RadioProps) => (
  <label
    htmlFor={id}
    style={{
      display: "flex",
      alignItems: "flex-start",
      gap: 10,
      cursor: "pointer",
      padding: "10px 12px",
      borderRadius: 6,
      border: `1px solid ${checked ? "var(--primary-500)" : "var(--ink-200)"}`,
      background: checked ? "var(--primary-50)" : "white",
      transition: "border-color .12s, background .12s",
    }}
  >
    <span
      style={{
        width: 18,
        height: 18,
        marginTop: 2,
        borderRadius: "50%",
        flexShrink: 0,
        border: `1.5px solid ${checked ? "var(--primary-500)" : "var(--ink-400)"}`,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "white",
      }}
    >
      {checked && (
        <span
          style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--primary-500)" }}
        />
      )}
    </span>
    <input
      type="radio"
      id={id}
      name={name}
      value={value}
      checked={Boolean(checked)}
      onChange={(e) => onChange?.(e.target.checked)}
      readOnly={!onChange}
      style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
    />
    <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-900)" }}>{label}</span>
      {hint && <span style={{ fontSize: 13, color: "var(--ink-600)" }}>{hint}</span>}
    </span>
  </label>
)

/* ---------- Toggle ---------- */

export interface ToggleProps {
  checked?: boolean
  onChange?: (next: boolean) => void
  label?: ReactNode
}

export const Toggle = ({ checked, onChange, label }: ToggleProps) => (
  <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
    <span
      style={{
        width: 36,
        height: 20,
        borderRadius: 999,
        background: checked ? "var(--primary-500)" : "var(--ink-300)",
        position: "relative",
        transition: "background .15s",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: checked ? 18 : 2,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "white",
          transition: "left .15s",
          boxShadow: "0 1px 2px rgba(0,0,0,.2)",
        }}
      />
    </span>
    <input
      type="checkbox"
      checked={Boolean(checked)}
      onChange={(e) => onChange?.(e.target.checked)}
      readOnly={!onChange}
      style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
    />
    {label && <span style={{ fontSize: 14, color: "var(--ink-800)" }}>{label}</span>}
  </label>
)
