"use client"

import { useEffect, useRef, useState } from "react"
import { Icon } from "./icon"
import { RepublicBar } from "./republic-bar"
import { Logo } from "./logo"
import { Avatar } from "./avatar"

export interface UserMenuItem {
  label: string
  href?: string
  onClick?: () => void
  icon?: Parameters<typeof Icon>[0]["name"]
  variant?: "default" | "danger"
}

export interface AppHeaderProps {
  org?: string
  user?: string
  role?: string
  /** href de la page liste des notifications. Si fourni → la cloche
   *  devient un lien. Sinon le bouton est inerte (fallback historique). */
  notificationsHref?: string
  /** Nombre de notifications non lues. Affiche un pastille rouge si > 0. */
  unreadCount?: number
  /** href de la page d'aide. Si fourni → le bouton "?" devient un lien. */
  helpHref?: string
  /** Items du menu utilisateur (Mon compte, Déconnexion, etc.). Si vide,
   *  l'avatar reste statique (pas de menu). */
  userMenuItems?: UserMenuItem[]
}

export const AppHeader = ({
  org,
  user,
  role,
  notificationsHref,
  unreadCount = 0,
  helpHref,
  userMenuItems,
}: AppHeaderProps) => (
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
            <span
              style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-800)" }}
            >
              {org}
            </span>
          </div>
        </>
      )}
      <div style={{ flex: 1 }} />
      {user && (
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <NotificationsBell
            href={notificationsHref}
            unreadCount={unreadCount}
          />
          <HelpButton href={helpHref} />
          <div
            style={{ width: 1, height: 28, background: "var(--ink-200)" }}
            aria-hidden="true"
          />
          <UserMenu user={user} role={role} items={userMenuItems} />
        </div>
      )}
    </div>
  </header>
)

/* ============================================================
   Sous-composants
   ============================================================ */

function NotificationsBell({
  href,
  unreadCount,
}: {
  href?: string
  unreadCount: number
}) {
  const labelBase = "Notifications"
  const label =
    unreadCount > 0
      ? `${labelBase} (${unreadCount} non lue${unreadCount > 1 ? "s" : ""})`
      : labelBase
  const content = (
    <>
      <Icon name="bell" size={18} />
      {unreadCount > 0 && (
        <span
          aria-hidden="true"
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
      )}
    </>
  )
  const baseStyle = {
    background: "transparent",
    border: "none",
    padding: 6,
    color: "var(--ink-600)",
    position: "relative" as const,
    cursor: href ? ("pointer" as const) : "default",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  }
  if (href) {
    return (
      <a href={href} aria-label={label} style={baseStyle}>
        {content}
      </a>
    )
  }
  return (
    <button type="button" aria-label={label} style={baseStyle} disabled>
      {content}
    </button>
  )
}

function HelpButton({ href }: { href?: string }) {
  const baseStyle = {
    background: "transparent",
    border: "none",
    padding: 6,
    color: "var(--ink-600)",
    cursor: href ? ("pointer" as const) : "default",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  }
  if (href) {
    return (
      <a href={href} aria-label="Aide" style={baseStyle}>
        <Icon name="helpCircle" size={18} />
      </a>
    )
  }
  return (
    <button type="button" aria-label="Aide" style={baseStyle} disabled>
      <Icon name="helpCircle" size={18} />
    </button>
  )
}

function UserMenu({
  user,
  role,
  items,
}: {
  user: string
  role?: string
  items?: UserMenuItem[]
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const interactive = items && items.length > 0

  // Click outside + Escape pour fermer
  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDocClick)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDocClick)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  const triggerContent = (
    <>
      <Avatar name={user} tone="primary" size={30} />
      <div
        style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}
      >
        <span
          style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-900)" }}
        >
          {user}
        </span>
        {role && (
          <span style={{ fontSize: 11, color: "var(--ink-600)" }}>{role}</span>
        )}
      </div>
      {interactive && (
        <Icon
          name="chevronDown"
          size={14}
          style={{
            color: "var(--ink-500)",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform .15s",
          }}
          aria-hidden="true"
        />
      )}
    </>
  )

  if (!interactive) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {triggerContent}
      </div>
    )
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Menu de ${user}`}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "transparent",
          border: "none",
          padding: "4px 6px",
          borderRadius: 6,
          cursor: "pointer",
        }}
      >
        {triggerContent}
      </button>
      {open && (
        <ul
          role="menu"
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: 6,
            background: "white",
            border: "1px solid var(--ink-200)",
            borderRadius: 8,
            boxShadow: "0 6px 24px rgba(0,0,0,0.10)",
            minWidth: 220,
            padding: 4,
            listStyle: "none",
            zIndex: 100,
          }}
        >
          {items!.map((item, i) => {
            const isDanger = item.variant === "danger"
            const itemStyle = {
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
              padding: "10px 12px",
              fontSize: 13.5,
              fontWeight: 500,
              color: isDanger ? "var(--danger-700)" : "var(--ink-800)",
              background: "transparent",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              textAlign: "left" as const,
              textDecoration: "none",
            }
            const inner = (
              <>
                {item.icon && (
                  <Icon
                    name={item.icon}
                    size={14}
                    aria-hidden="true"
                    style={{
                      color: isDanger ? "var(--danger-600)" : "var(--ink-500)",
                    }}
                  />
                )}
                {item.label}
              </>
            )
            return (
              <li key={i} role="none">
                {item.href ? (
                  <a
                    href={item.href}
                    role="menuitem"
                    style={itemStyle}
                    onClick={() => setOpen(false)}
                  >
                    {inner}
                  </a>
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    style={itemStyle}
                    onClick={() => {
                      item.onClick?.()
                      setOpen(false)
                    }}
                  >
                    {inner}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
