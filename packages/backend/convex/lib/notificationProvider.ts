/**
 * NotificationProvider — distribution unifiée des notifications
 * (Phase Trous A, miroir de `saeProvider.ts` Bloc 6 Option C).
 *
 * **Principe** : tout site qui veut notifier un destinataire (citoyen, agent,
 * platform admin) appelle `notify(ctx, args)`. Cette fonction :
 *
 *   1. Insère **toujours** une entrée in-app dans la table `notifications`
 *      (sert de boîte unifiée + audit + UI badges).
 *   2. Lit les préférences du destinataire (`notificationPreferences`) et,
 *      pour chaque canal externe activé (`email`, `sms`), pousse une entrée
 *      dans `notificationOutbox` (status="pending") que des workers Node
 *      videront en appelant les providers réels (Resend, Twilio, etc.).
 *
 * **V1** : aucun envoi externe effectif — l'outbox accumule les entrées,
 * les providers Email/Sms sont des skeletons qui logent un warn. C'est
 * exactement le même schéma que `DigitaliumSaeProvider` : architecture
 * prête, dispatch réel branché plus tard.
 *
 * **Pourquoi pas un provider unique** ? On veut pouvoir composer (in-app
 * + email + sms) et muter les canaux indépendamment selon le contexte
 * (alertes critiques toujours par tous les canaux, etc.).
 */

import type { Doc, Id } from "../_generated/dataModel"
import type { MutationCtx, QueryCtx } from "../_generated/server"
import type {
  NotificationChannel,
  NotificationKind,
  NotificationRecipientKind,
  NotificationSeverity,
} from "./enums"

/* ============================================================
   Types
   ============================================================ */

export interface NotifyArgs {
  recipientKind: NotificationRecipientKind
  recipientId: string
  kind: NotificationKind
  severity: NotificationSeverity
  title: string
  body?: string
  linkTo?: string
  // Métadonnées libres (persistées sur la notif in-app)
  metadata?: Record<string, unknown>
  // Liens forts pour les compteurs/index existants
  linkedRequestId?: Id<"requests">
  linkedOrganismId?: Id<"organisms">
  linkedComponentId?: Id<"infrastructureComponents">
  // Override des canaux. Si undefined : on suit les préférences du destinataire.
  // Si fourni : on force ce sous-ensemble (utile pour `security_alert` → email forcé).
  forceChannels?: NotificationChannel[]
}

export interface NotifyResult {
  notificationId: Id<"notifications">
  outboxIds: Id<"notificationOutbox">[]
  channels: NotificationChannel[]
}

/* ============================================================
   Préférences — résolution
   ============================================================ */

interface ResolvedPreferences {
  email: boolean
  sms: boolean
  muteKinds: NotificationKind[]
  emailAddress?: string
  smsAddress?: string
}

const DEFAULT_PREFERENCES: ResolvedPreferences = {
  email: false,
  sms: false,
  muteKinds: [],
}

/**
 * Lit les préférences + l'adresse email/téléphone du destinataire selon
 * son `recipientKind`. Si l'enregistrement n'existe pas, on retombe sur
 * les défauts (in-app uniquement).
 */
async function resolvePreferences(
  ctx: QueryCtx | MutationCtx,
  recipientKind: NotificationRecipientKind,
  recipientId: string,
): Promise<ResolvedPreferences> {
  if (recipientKind === "citizen") {
    const citizen = (await ctx.db.get(
      recipientId as Id<"citizens">,
    )) as Doc<"citizens"> | null
    if (!citizen) return DEFAULT_PREFERENCES
    return {
      email: citizen.notificationPreferences?.email ?? false,
      sms: citizen.notificationPreferences?.sms ?? false,
      muteKinds: citizen.notificationPreferences?.muteKinds ?? [],
      emailAddress: citizen.email,
      smsAddress: citizen.phone,
    }
  }
  if (recipientKind === "agent") {
    const agent = (await ctx.db.get(
      recipientId as Id<"agents">,
    )) as Doc<"agents"> | null
    if (!agent) return DEFAULT_PREFERENCES
    return {
      email: agent.notificationPreferences?.email ?? false,
      sms: agent.notificationPreferences?.sms ?? false,
      muteKinds: agent.notificationPreferences?.muteKinds ?? [],
      emailAddress: agent.email,
      smsAddress: undefined, // agents n'ont pas de téléphone en v1
    }
  }
  // platform_admin : pas de canaux externes v1
  return DEFAULT_PREFERENCES
}

/* ============================================================
   notify() — point d'entrée unique
   ============================================================ */

/**
 * Émet une notification multi-canal pour un destinataire donné.
 *
 * Toujours insert in-app. Pour chaque canal externe activé (et non muté
 * pour ce `kind`), insert dans `notificationOutbox` status="pending".
 *
 * Retourne l'ID de la notif in-app + les IDs outbox + la liste effective
 * des canaux empruntés (pour tests/observabilité).
 */
export async function notify(
  ctx: MutationCtx,
  args: NotifyArgs,
): Promise<NotifyResult> {
  const now = Date.now()

  // 1. Toujours in-app
  const notificationId = await ctx.db.insert("notifications", {
    recipientKind: args.recipientKind,
    recipientId: args.recipientId,
    kind: args.kind,
    severity: args.severity,
    title: args.title,
    body: args.body,
    linkTo: args.linkTo,
    metadata: args.metadata,
    linkedOrganismId: args.linkedOrganismId,
    linkedComponentId: args.linkedComponentId,
    linkedRequestId: args.linkedRequestId,
    createdAt: now,
  })

  // 2. Canaux externes
  const prefs = await resolvePreferences(
    ctx,
    args.recipientKind,
    args.recipientId,
  )

  // Mute : on respecte muteKinds SAUF si forceChannels est explicite
  // (cas d'usage : alertes sécurité critiques).
  const forced = args.forceChannels && args.forceChannels.length > 0
  const muted = !forced && prefs.muteKinds.includes(args.kind)

  const channels: NotificationChannel[] = ["in_app"]
  const outboxIds: Id<"notificationOutbox">[] = []

  if (muted) {
    return { notificationId, outboxIds, channels }
  }

  const wantEmail = forced
    ? args.forceChannels!.includes("email")
    : prefs.email
  const wantSms = forced ? args.forceChannels!.includes("sms") : prefs.sms

  if (wantEmail && prefs.emailAddress) {
    const id = await ctx.db.insert("notificationOutbox", {
      notificationId,
      recipientKind: args.recipientKind,
      recipientId: args.recipientId,
      channel: "email",
      address: prefs.emailAddress,
      kind: args.kind,
      severity: args.severity,
      subject: args.title,
      body: args.body ?? "",
      linkTo: args.linkTo,
      status: "pending",
      attempts: 0,
      createdAt: now,
    })
    outboxIds.push(id)
    channels.push("email")
  }

  if (wantSms && prefs.smsAddress) {
    const id = await ctx.db.insert("notificationOutbox", {
      notificationId,
      recipientKind: args.recipientKind,
      recipientId: args.recipientId,
      channel: "sms",
      address: prefs.smsAddress,
      kind: args.kind,
      severity: args.severity,
      // SMS: pas de sujet séparé, on concatène
      subject: args.title,
      body: truncateSms(`${args.title}${args.body ? ` — ${args.body}` : ""}`),
      linkTo: args.linkTo,
      status: "pending",
      attempts: 0,
      createdAt: now,
    })
    outboxIds.push(id)
    channels.push("sms")
  }

  return { notificationId, outboxIds, channels }
}

/**
 * SMS doivent rester courts (160 caractères classiques, 70 si Unicode).
 * On tronque à 320 (2 SMS concaténés max) pour rester safe.
 */
function truncateSms(text: string): string {
  if (text.length <= 320) return text
  return text.slice(0, 317) + "…"
}

/* ============================================================
   Provider abstraction — skeletons pour Phase 2 (dispatch effectif)
   ============================================================ */

export interface ExternalNotificationProvider {
  readonly kind: "email" | "sms"
  readonly name: string
  /**
   * Tente d'envoyer une entrée d'outbox. Retourne `{ok:true}` ou
   * `{ok:false, error}`. NE doit PAS jeter — le caller met à jour le
   * statut outbox selon le retour.
   */
  send(
    entry: Doc<"notificationOutbox">,
  ): Promise<{ ok: true } | { ok: false; error: string }>
}

/**
 * Provider Email skeleton — v1 logue un warn et retourne `{ok:true}`
 * (l'outbox passe à `sent` mais rien n'est réellement envoyé).
 *
 * Phase 2 : remplacer par une implémentation Resend/Postmark/SendGrid
 * dans une action Node, lue depuis env (`EMAIL_PROVIDER_API_KEY`).
 */
export class StubEmailProvider implements ExternalNotificationProvider {
  readonly kind = "email" as const
  readonly name = "stub-email"

  async send(
    entry: Doc<"notificationOutbox">,
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    console.warn(
      `[NOTIF/email STUB] to=${entry.address} subject="${entry.subject}" ` +
        `body="${entry.body.slice(0, 80)}${entry.body.length > 80 ? "…" : ""}" ` +
        `link=${entry.linkTo ?? "—"}`,
    )
    return { ok: true }
  }
}

/**
 * Provider SMS skeleton — v1 logue un warn et retourne `{ok:true}`.
 * Phase 2 : Twilio ou provider gabonais (Airtel/Moov API).
 */
export class StubSmsProvider implements ExternalNotificationProvider {
  readonly kind = "sms" as const
  readonly name = "stub-sms"

  async send(
    entry: Doc<"notificationOutbox">,
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    console.warn(
      `[NOTIF/sms STUB] to=${entry.address} body="${entry.body}"`,
    )
    return { ok: true }
  }
}

/**
 * Factory : retourne le provider configuré pour un canal.
 * V1 : toujours le stub. Phase 2 : lecture depuis `process.env`.
 */
export function getExternalProvider(
  channel: "email" | "sms",
): ExternalNotificationProvider {
  if (channel === "email") return new StubEmailProvider()
  return new StubSmsProvider()
}
