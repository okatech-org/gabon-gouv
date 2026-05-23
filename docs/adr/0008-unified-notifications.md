# ADR-0008: Unified notifications table with recipient discriminator

- **Status**: Accepted
- **Date**: 2026-05-23

## Context

Three audiences receive notifications:

- **Citizens** — "Notifications 4 (3 unread)" on C3, "Piece missing — passport", "Your B3 extract is ready", "Maintenance scheduled".
- **Agents** — "3 unread messages", queue items reaching their deadline, signature requests, transfer notices.
- **Platform admins** — "CNAMGS delay rising", "3 administrations in onboarding", "CDN Mvengue p95 latency high".

The shape is almost identical across audiences: title, body, link, severity, read state, creation timestamp. The differences are the recipient identity and a few specialized fields (a platform alert has an organism it refers to, a citizen notification has a request).

## Decision

We will use a single **`notifications`** table with a `recipientKind` discriminator (`citizen` / `agent` / `platform_admin`) and a `recipientId` keyed by the corresponding table. The `kind` field is a wide union covering all message types across audiences (`piece_requested`, `document_ready`, `system_maintenance`, `slo_breach`, `assignment`, …). Audience-specific payload lives in an optional `metadata` JSON field. Indexed by `(recipientKind, recipientId, readAt)` for the "unread for me" query.

Platform-wide **operational alerts** (P1 "Alerts in progress") share the same table but with `recipientKind = 'platform_admin'` and `kind` values prefixed with `infra_` / `org_slo_` / `security_`. Acknowledgement is an `acknowledgedAt` + `acknowledgedByAgentId` pair rather than a hard delete.

## Consequences

### Positive

- One query path, one read-state model, one delivery pipeline (in-app, email, push later) — much less code than three parallel systems.
- A future "notification preferences" feature (mute, route to email, digest) operates on one table.
- The "mark all as read" mutation is generic.

### Negative

- The `kind` union grows wide. Tracked via `lib/enums.ts` per ADR-0003; refactorable.
- The `metadata` field is loosely typed JSON. Mitigated by typed helpers per `kind` when constructing notifications.
- A bad query that forgets to filter by `recipientKind + recipientId` could leak cross-audience data. Mitigated by exposing only `notificationsForActor(actor)` from the data layer, never raw `db.query("notifications")`.

### Neutral

- The total row count is the sum of all audiences. Convex handles tens of millions easily. The `(recipientKind, recipientId, readAt)` index keeps reads cheap.

## Alternatives considered

### Option A — three separate tables

`citizenNotifications`, `agentNotifications`, `platformAlerts`. Triples the surface area: three sets of read mutations, three indexes, three React hooks. Diverges quickly.

### Option B — `notifications` + `platformAlerts` as two tables

The platform alert use case (acknowledge, link to organism, link to infra component) is genuinely closer to citizen/agent notifications than it is different. Keeping them together is more parsimonious. Revisit if platform alerts grow features that pollute the citizen path.

### Option C — Event bus only, no persistent rows

In-memory delivery only. Loses unread state, history, "mark as read", offline catch-up. Rejected.

## References

- Mockups — C3 (`CitizenDashboard` Messages card), A1 (`AdminDashboard` "À votre attention" + activité équipe), P1 (`PlatformSupervision` Alertes en cours)
