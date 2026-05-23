"use client"

import { Icon } from "./icon"
import { RepublicBar } from "./republic-bar"
import { Logo } from "./logo"
import { Avatar } from "./avatar"

export interface AppHeaderProps {
  org?: string
  user?: string
  role?: string
}

export const AppHeader = ({ org, user, role }: AppHeaderProps) => (
  <header
    style={{
      borderBottom: "1px solid var(--ink-200)",
      background: "white",
      position: "relative",
      zIndex: 5,
    }}
  >
    <RepublicBar />
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        height: 60,
        gap: 24,
      }}
    >
      <Logo />
      {org && (
        <>
          <div style={{ width: 1, height: 28, background: "var(--ink-200)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="building" size={16} style={{ color: "var(--ink-500)" }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-800)" }}>
              {org}
            </span>
            <Icon name="chevronDown" size={14} style={{ color: "var(--ink-500)" }} />
          </div>
        </>
      )}
      <div style={{ flex: 1 }} />
      {user && (
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            aria-label="Notifications"
            style={{
              background: "transparent",
              border: "none",
              padding: 6,
              color: "var(--ink-600)",
              position: "relative",
            }}
          >
            <Icon name="bell" size={18} />
            <span
              style={{
                position: "absolute",
                top: 4,
                right: 4,
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--danger-500)",
              }}
            />
          </button>
          <button
            aria-label="Aide"
            style={{
              background: "transparent",
              border: "none",
              padding: 6,
              color: "var(--ink-600)",
            }}
          >
            <Icon name="helpCircle" size={18} />
          </button>
          <div style={{ width: 1, height: 28, background: "var(--ink-200)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Avatar name={user} tone="primary" size={30} />
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-900)" }}>
                {user}
              </span>
              {role && (
                <span style={{ fontSize: 11, color: "var(--ink-600)" }}>{role}</span>
              )}
            </div>
            <Icon name="chevronDown" size={14} style={{ color: "var(--ink-500)" }} />
          </div>
        </div>
      )}
    </div>
  </header>
)
