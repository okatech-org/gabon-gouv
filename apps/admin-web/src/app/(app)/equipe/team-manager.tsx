"use client"

/**
 * Composant client interactif pour la page /equipe (Phase Trous B).
 *
 * - Tabs Membres / Invitations
 * - Bouton "Inviter un membre" → dialog form (modal a11y)
 * - Menu d'actions par membre (rôle, désactiver/réactiver)
 * - Menu d'actions par invitation (copier lien, révoquer)
 *
 * Tous les dialogs utilisent `useModalA11y` (RGAA Bloc 3+) :
 * focus trap, Esc, scroll lock, restauration du focus.
 *
 * Le toast en bas (region aria-live polite) annonce les succès/échecs.
 */

import { useRef, useState, useTransition } from "react"
import {
  Avatar,
  Badge,
  Button,
  Card,
  Field,
  Icon,
  Select,
  TextInput,
  useModalA11y,
  type Tone,
} from "@workspace/ui"
import {
  changeAgentRoleAction,
  disableAgentAction,
  enableAgentAction,
  inviteAgentAction,
  revokeInvitationAction,
} from "./actions"

interface Member {
  id: string
  name: string
  email: string
  nip: string
  role: string
  roleLabel: string
  function: string
  authMethod: string
  authMethodLabel: string
  active: boolean
  disabledAt?: number
  assignedCount: number
  isMe: boolean
}

interface Invitation {
  id: string
  email: string
  role: string
  roleLabel: string
  functionTitle: string
  state: "pending" | "accepted" | "revoked" | "expired"
  expiresAt: number
  createdAt: number
  acceptedAt?: number
  revokedAt?: number
  token: string
}

const ASSIGNABLE_ROLES = [
  { value: "agent_instructeur", label: "Agent instructeur" },
  { value: "agent_superviseur", label: "Agent superviseur" },
  { value: "chef_service", label: "Chef de service" },
  { value: "officier_signataire", label: "Officier signataire" },
  { value: "admin_organisme", label: "Admin organisme" },
  { value: "admin_technique", label: "Admin technique" },
]

interface Props {
  members: Member[]
  invitations: Invitation[]
  canManage: boolean
  enrollmentBaseUrl: string
}

type Tab = "members" | "invitations"

export function TeamManager({
  members,
  invitations,
  canManage,
  enrollmentBaseUrl,
}: Props) {
  const [tab, setTab] = useState<Tab>("members")
  const [toast, setToast] = useState<{
    tone: "success" | "danger"
    text: string
  } | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [roleEditMember, setRoleEditMember] = useState<Member | null>(null)

  const pendingCount = invitations.filter((i) => i.state === "pending").length

  return (
    <>
      {/* Tabs + Action invite */}
      <Card padded={false}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: 10,
            borderBottom: "1px solid var(--ink-150)",
          }}
        >
          <nav
            aria-label="Vues de l'équipe"
            style={{ display: "flex", gap: 2 }}
          >
            {(
              [
                { id: "members", label: `Membres (${members.length})` },
                {
                  id: "invitations",
                  label: `Invitations${pendingCount ? ` (${pendingCount} en attente)` : ""}`,
                },
              ] as { id: Tab; label: string }[]
            ).map((t) => {
              const active = tab === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  aria-current={active ? "page" : undefined}
                  style={{
                    padding: "8px 12px",
                    fontSize: 13,
                    fontWeight: active ? 700 : 500,
                    color: active ? "var(--primary-700)" : "var(--ink-700)",
                    background: active ? "var(--primary-50)" : "transparent",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                  }}
                >
                  {t.label}
                </button>
              )
            })}
          </nav>
          {canManage && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setInviteOpen(true)}
              icon="plus"
            >
              Inviter un membre
            </Button>
          )}
        </div>

        {tab === "members" ? (
          <MembersTable
            members={members}
            canManage={canManage}
            onChangeRoleClick={(m) => setRoleEditMember(m)}
            onActionResult={(r) => setToast(r)}
          />
        ) : (
          <InvitationsTable
            invitations={invitations}
            canManage={canManage}
            enrollmentBaseUrl={enrollmentBaseUrl}
            onActionResult={(r) => setToast(r)}
          />
        )}
      </Card>

      {inviteOpen && (
        <InviteDialog
          onClose={() => setInviteOpen(false)}
          onResult={(r) => {
            setToast(r)
            if (r.tone === "success") setInviteOpen(false)
          }}
          enrollmentBaseUrl={enrollmentBaseUrl}
        />
      )}

      {roleEditMember && (
        <ChangeRoleDialog
          member={roleEditMember}
          onClose={() => setRoleEditMember(null)}
          onResult={(r) => {
            setToast(r)
            if (r.tone === "success") setRoleEditMember(null)
          }}
        />
      )}

      {/* Persistent live region pour les annonces */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: "fixed",
          bottom: 16,
          right: 16,
          zIndex: 1100,
          pointerEvents: "none",
        }}
      >
        {toast && (
          <div
            style={{
              background:
                toast.tone === "success"
                  ? "var(--success-50)"
                  : "var(--danger-50)",
              border: `1px solid var(--${toast.tone === "success" ? "success" : "danger"}-200)`,
              color: `var(--${toast.tone === "success" ? "success" : "danger"}-700)`,
              padding: "8px 14px",
              borderRadius: 6,
              fontSize: 13.5,
              fontWeight: 500,
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              maxWidth: 380,
              pointerEvents: "auto",
            }}
          >
            {toast.text}
          </div>
        )}
      </div>
    </>
  )
}

/* ============================================================
   Tables
   ============================================================ */

function MembersTable({
  members,
  canManage,
  onChangeRoleClick,
  onActionResult,
}: {
  members: Member[]
  canManage: boolean
  onChangeRoleClick: (m: Member) => void
  onActionResult: (r: { tone: "success" | "danger"; text: string }) => void
}) {
  const [pending, startTransition] = useTransition()

  const toggleActive = (m: Member) => {
    startTransition(async () => {
      const r = m.active
        ? await disableAgentAction(m.id)
        : await enableAgentAction(m.id)
      if (r.ok) {
        onActionResult({
          tone: "success",
          text: m.active
            ? `${m.name} a été désactivé.`
            : `${m.name} a été réactivé.`,
        })
      } else {
        onActionResult({
          tone: "danger",
          text: r.message ?? "Action impossible.",
        })
      }
    })
  }

  if (members.length === 0) {
    return (
      <div
        style={{
          padding: "48px 24px",
          textAlign: "center",
          color: "var(--ink-600)",
        }}
      >
        <Icon
          name="users"
          size={36}
          style={{ color: "var(--ink-400)", marginBottom: 12 }}
          aria-hidden="true"
        />
        <p style={{ fontSize: 14 }}>Aucun membre — invitez le premier agent.</p>
      </div>
    )
  }

  return (
    <table
      style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
    >
      <caption className="sr-only">
        Liste des membres ({members.length}), avec actions de gestion
      </caption>
      <thead>
        <tr>
          <Th>Agent</Th>
          <Th>Rôle</Th>
          <Th>Fonction</Th>
          <Th>Auth</Th>
          <Th>Assignées</Th>
          <Th>Statut</Th>
          {canManage && <Th>Actions</Th>}
        </tr>
      </thead>
      <tbody>
        {members.map((m) => (
          <tr
            key={m.id}
            style={{
              borderTop: "1px solid var(--ink-100)",
              background: m.isMe ? "var(--primary-50)" : undefined,
            }}
          >
            <Td>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar name={m.name} size={32} tone="primary" />
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontWeight: 600 }}>
                    {m.name}
                    {m.isMe && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "var(--primary-600)",
                          marginLeft: 6,
                        }}
                        aria-label="C'est vous"
                      >
                        · Vous
                      </span>
                    )}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--ink-500)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {m.email}
                  </span>
                </div>
              </div>
            </Td>
            <Td>
              <Badge tone={roleTone(m.role)} size="sm">
                {m.roleLabel}
              </Badge>
            </Td>
            <Td style={{ color: "var(--ink-700)" }}>{m.function}</Td>
            <Td style={{ fontSize: 12.5, color: "var(--ink-700)" }}>
              {m.authMethodLabel}
            </Td>
            <Td
              style={{
                fontVariantNumeric: "tabular-nums",
                fontWeight: 600,
              }}
            >
              {m.assignedCount}
            </Td>
            <Td>
              {m.active ? (
                <Badge tone="success" size="sm" dot>
                  Actif
                </Badge>
              ) : (
                <Badge tone="neutral" size="sm" dot>
                  Inactif
                </Badge>
              )}
            </Td>
            {canManage && (
              <Td>
                {!m.isMe ? (
                  <div style={{ display: "flex", gap: 6 }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onChangeRoleClick(m)}
                      disabled={pending}
                      icon="shieldCheck"
                    >
                      Rôle
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActive(m)}
                      disabled={pending}
                      icon={m.active ? "minus" : "userCheck"}
                    >
                      {m.active ? "Désactiver" : "Réactiver"}
                    </Button>
                  </div>
                ) : (
                  <span
                    style={{ fontSize: 12, color: "var(--ink-500)" }}
                  >
                    —
                  </span>
                )}
              </Td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function InvitationsTable({
  invitations,
  canManage,
  enrollmentBaseUrl,
  onActionResult,
}: {
  invitations: Invitation[]
  canManage: boolean
  enrollmentBaseUrl: string
  onActionResult: (r: { tone: "success" | "danger"; text: string }) => void
}) {
  const [pending, startTransition] = useTransition()
  const [copiedId, setCopiedId] = useState<string | null>(null)

  if (invitations.length === 0) {
    return (
      <div
        style={{
          padding: "48px 24px",
          textAlign: "center",
          color: "var(--ink-600)",
        }}
      >
        <Icon
          name="mail"
          size={36}
          style={{ color: "var(--ink-400)", marginBottom: 12 }}
          aria-hidden="true"
        />
        <p style={{ fontSize: 14 }}>Aucune invitation pour le moment.</p>
      </div>
    )
  }

  const copyLink = async (inv: Invitation) => {
    const url = `${enrollmentBaseUrl}/enrolement/${inv.token}`
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(inv.id)
      onActionResult({ tone: "success", text: "Lien copié dans le presse-papiers." })
      setTimeout(() => setCopiedId(null), 2500)
    } catch {
      onActionResult({
        tone: "danger",
        text: "Impossible de copier — sélectionnez manuellement.",
      })
    }
  }

  const revoke = (inv: Invitation) => {
    if (
      !confirm(
        `Révoquer définitivement l'invitation envoyée à ${inv.email} ?`,
      )
    )
      return
    startTransition(async () => {
      const r = await revokeInvitationAction(inv.id)
      onActionResult(
        r.ok
          ? {
              tone: "success",
              text: `Invitation de ${inv.email} révoquée.`,
            }
          : {
              tone: "danger",
              text: r.message ?? "Échec de la révocation.",
            },
      )
    })
  }

  return (
    <table
      style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
    >
      <caption className="sr-only">
        Invitations en cours ({invitations.length})
      </caption>
      <thead>
        <tr>
          <Th>E-mail</Th>
          <Th>Rôle</Th>
          <Th>Statut</Th>
          <Th>Échéance</Th>
          {canManage && <Th>Actions</Th>}
        </tr>
      </thead>
      <tbody>
        {invitations.map((inv) => (
          <tr key={inv.id} style={{ borderTop: "1px solid var(--ink-100)" }}>
            <Td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
              {inv.email}
            </Td>
            <Td>
              <Badge tone={roleTone(inv.role)} size="sm">
                {inv.roleLabel}
              </Badge>
            </Td>
            <Td>
              <Badge tone={invitationTone(inv.state)} size="sm">
                {invitationLabel(inv.state)}
              </Badge>
            </Td>
            <Td style={{ fontSize: 12.5, color: "var(--ink-700)" }}>
              {inv.state === "pending"
                ? `Expire le ${new Date(inv.expiresAt).toLocaleDateString("fr-FR")}`
                : inv.state === "accepted"
                  ? `Acceptée le ${new Date(inv.acceptedAt ?? 0).toLocaleDateString("fr-FR")}`
                  : inv.state === "revoked"
                    ? `Révoquée le ${new Date(inv.revokedAt ?? 0).toLocaleDateString("fr-FR")}`
                    : "Expirée"}
            </Td>
            {canManage && (
              <Td>
                {inv.state === "pending" ? (
                  <div style={{ display: "flex", gap: 6 }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyLink(inv)}
                      icon={copiedId === inv.id ? "checkCircle" : "copy"}
                    >
                      {copiedId === inv.id ? "Copié" : "Copier lien"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => revoke(inv)}
                      disabled={pending}
                      icon="x"
                    >
                      Révoquer
                    </Button>
                  </div>
                ) : (
                  <span style={{ fontSize: 12, color: "var(--ink-500)" }}>
                    —
                  </span>
                )}
              </Td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/* ============================================================
   Dialogs
   ============================================================ */

function InviteDialog({
  onClose,
  onResult,
  enrollmentBaseUrl,
}: {
  onClose: () => void
  onResult: (r: { tone: "success" | "danger"; text: string }) => void
  enrollmentBaseUrl: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  useModalA11y({ containerRef, onClose })
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("agent_instructeur")
  const [functionTitle, setFunctionTitle] = useState("")
  const [pending, startTransition] = useTransition()
  const [createdToken, setCreatedToken] = useState<string | null>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const r = await inviteAgentAction({ email, role, functionTitle })
      if (r.ok && r.data) {
        setCreatedToken(r.data.token)
        onResult({
          tone: "success",
          text: `Invitation envoyée à ${email}. Partagez le lien ci-dessous.`,
        })
      } else {
        onResult({
          tone: "danger",
          text: r.message ?? "Échec de l'invitation.",
        })
      }
    })
  }

  return (
    <div
      style={modalBackdropStyle}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-dialog-title"
        style={modalCardStyle}
      >
        <h2 id="invite-dialog-title" style={modalTitleStyle}>
          Inviter un nouveau membre
        </h2>
        {!createdToken ? (
          <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
            <Field label="Adresse e-mail" required htmlFor="invite-email">
              <TextInput
                id="invite-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                placeholder="prenom.nom@organisme.ga"
              />
            </Field>
            <Field label="Rôle" required htmlFor="invite-role">
              <Select
                id="invite-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                {ASSIGNABLE_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Fonction (optionnel)"
              htmlFor="invite-function"
              hint="Ex: Chef de bureau, Officier d'état civil"
            >
              <TextInput
                id="invite-function"
                value={functionTitle}
                onChange={(e) => setFunctionTitle(e.target.value)}
              />
            </Field>
            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "flex-end",
                marginTop: 8,
              }}
            >
              <Button variant="ghost" type="button" onClick={onClose}>
                Annuler
              </Button>
              <Button variant="primary" type="submit" disabled={pending}>
                {pending ? "Envoi…" : "Envoyer l'invitation"}
              </Button>
            </div>
          </form>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            <p style={{ fontSize: 13.5, color: "var(--ink-700)", margin: 0 }}>
              Lien d&apos;enrôlement (valide 14 jours, à transmettre à{" "}
              <strong>{email}</strong>) :
            </p>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                background: "var(--ink-50)",
                border: "1px solid var(--ink-200)",
                padding: 10,
                borderRadius: 6,
                wordBreak: "break-all",
                userSelect: "all",
              }}
            >
              {enrollmentBaseUrl}/enrolement/{createdToken}
            </div>
            <Button
              variant="primary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    `${enrollmentBaseUrl}/enrolement/${createdToken}`,
                  )
                  onResult({ tone: "success", text: "Lien copié." })
                } catch {
                  onResult({
                    tone: "danger",
                    text: "Copie impossible — sélectionnez manuellement.",
                  })
                }
              }}
              icon="copy"
            >
              Copier le lien
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Fermer
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function ChangeRoleDialog({
  member,
  onClose,
  onResult,
}: {
  member: Member
  onClose: () => void
  onResult: (r: { tone: "success" | "danger"; text: string }) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  useModalA11y({ containerRef, onClose })
  const [role, setRole] = useState(member.role)
  const [pending, startTransition] = useTransition()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (role === member.role) {
      onResult({ tone: "danger", text: "Le rôle est déjà celui-ci." })
      return
    }
    startTransition(async () => {
      const r = await changeAgentRoleAction({
        agentId: member.id,
        newRole: role,
      })
      onResult(
        r.ok
          ? {
              tone: "success",
              text: `Rôle de ${member.name} mis à jour.`,
            }
          : {
              tone: "danger",
              text: r.message ?? "Échec du changement de rôle.",
            },
      )
    })
  }

  return (
    <div
      style={modalBackdropStyle}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="role-dialog-title"
        style={modalCardStyle}
      >
        <h2 id="role-dialog-title" style={modalTitleStyle}>
          Changer le rôle de {member.name}
        </h2>
        <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
          <Field
            label="Nouveau rôle"
            required
            htmlFor="role-select"
            hint={`Actuellement : ${member.roleLabel}`}
          >
            <Select
              id="role-select"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              autoFocus
            >
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
          </Field>
          <div
            style={{
              display: "flex",
              gap: 8,
              justifyContent: "flex-end",
            }}
          >
            <Button variant="ghost" type="button" onClick={onClose}>
              Annuler
            </Button>
            <Button variant="primary" type="submit" disabled={pending}>
              {pending ? "…" : "Confirmer"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ============================================================
   Helpers de style et de labels
   ============================================================ */

const Th = ({ children }: { children: React.ReactNode }) => (
  <th
    scope="col"
    style={{
      textAlign: "left",
      fontSize: 11,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.04em",
      color: "var(--ink-600)",
      padding: "10px 16px",
      borderBottom: "1px solid var(--ink-200)",
      background: "var(--ink-50)",
    }}
  >
    {children}
  </th>
)

const Td = ({
  children,
  style,
}: {
  children: React.ReactNode
  style?: React.CSSProperties
}) => (
  <td
    style={{
      padding: "10px 16px",
      verticalAlign: "middle",
      ...style,
    }}
  >
    {children}
  </td>
)

const modalBackdropStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  padding: 24,
}

const modalCardStyle: React.CSSProperties = {
  background: "white",
  borderRadius: 8,
  maxWidth: 480,
  width: "100%",
  padding: 24,
  boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
}

const modalTitleStyle: React.CSSProperties = {
  fontSize: 17,
  fontWeight: 700,
  marginTop: 0,
  marginBottom: 16,
  color: "var(--ink-900)",
}

function roleTone(role: string): Tone {
  switch (role) {
    case "admin_organisme":
      return "primary"
    case "officier_signataire":
      return "warning"
    case "chef_service":
      return "info"
    case "agent_superviseur":
      return "info"
    case "agent_instructeur":
      return "neutral"
    case "admin_technique":
      return "neutral"
    case "platform_admin":
      return "danger"
    default:
      return "neutral"
  }
}

function invitationTone(state: Invitation["state"]): Tone {
  switch (state) {
    case "pending":
      return "warning"
    case "accepted":
      return "success"
    case "revoked":
      return "danger"
    case "expired":
      return "neutral"
  }
}

function invitationLabel(state: Invitation["state"]): string {
  switch (state) {
    case "pending":
      return "En attente"
    case "accepted":
      return "Acceptée"
    case "revoked":
      return "Révoquée"
    case "expired":
      return "Expirée"
  }
}
