# ADR-0012: Audit log separated from team activity feed

- **Status**: Accepted
- **Date**: 2026-05-23

## Context

Two related but distinct requirements compete for the same surface:

- **Team activity feed (A1, P1)** — short, human-readable, filterable, presented in a "live" widget. "P. MOUSSAVOU signed Act EC-LBV-2026-04812 — 12 min ago". Cosmetic, useful for situational awareness, no legal weight. Can be pruned or reformatted.
- **Probative audit log (NF Z42-013)** — append-only, sealed daily, contains every state-changing event with actor, subject, time, hash chain. Required for the SAE certification. Never edited, never deleted, exportable for audit. The A7 archive screen lists "186 472 lignes · scellement quotidien".

A naive design would use one table and try to satisfy both. The result tends to be either: an audit log too pretty for legal use (presentation logic leaks in) or an activity feed too rigid to update (cannot reformat without breaking the seal).

## Decision

We will keep two tables:

- **`auditLog`** — immutable, append-only, chained by daily seal. Schema is minimal and stable: `(actorKind, actorId, verb, subjectKind, subjectId, organismId?, occurredAt, payloadHash, dailySealId?)`. Once a row enters a sealed batch, it cannot be edited (enforced at the mutation layer). Backfills are forbidden.
- **`teamActivities`** — UI-facing, indexed by organism and time, allowed to evolve. Schema is presentation-friendly: `(verb: string, subjectKind, subjectId, actorId, actorDisplayName, message: localized string, organismId, occurredAt, link?)`. Can be deleted, edited, reformatted.

Both are written by the same domain helpers (e.g. `mutations/request.assign(...)` writes to both) — the helpers are the single source of "what happened". `auditLog` is the legally meaningful record; `teamActivities` is the friendly view.

## Consequences

### Positive

- The legal-evidence surface (`auditLog`) has a stable schema and a sealing pipeline that can be certified.
- The UI surface (`teamActivities`) can be redesigned without touching the audit pipeline.
- Different retention policies — `teamActivities` may be purged after 12 months, `auditLog` is kept for the full archival lifetime.
- Different access patterns — `auditLog` is rarely queried (audit only), `teamActivities` is queried on every dashboard load. Separating them simplifies both indexes.

### Negative

- Two writes per event. Negligible cost (a few microseconds, same transaction).
- Risk of divergence — one helper updated and the other forgotten. Mitigated by writing both inside a single helper function and code review.

### Neutral

- Platform-wide alerts (`platformAlerts` from ADR-0008) are again a different surface — they are *actionable*, while `teamActivities` is *informational*. We do not conflate them.

## Alternatives considered

### Option A — single `events` table with a `sealed: boolean` flag

Tempting. Rejected because the schemas drift apart over time — once we add a presentation field (`displayMessage`, `iconKey`), it does not belong in the immutable record. The flag-based approach also confuses the access-control model.

### Option B — derive the activity feed from the audit log at query time

Avoids duplication. Loses the ability to evolve the feed presentation (renaming verbs, reordering events, hiding noisy ones) without touching the immutable record. Worse: requires expensive joins at every query to look up actor display names and subject details.

## References

- Mockups — A1 (`AdminDashboard` "Activité de l'équipe"), P1 (`PlatformSupervision` "Activité plateforme"), A7 (`AdminArchives` "Journal d'événements scellé · 186 472 lignes · scellement quotidien")
- NF Z42-013 — French standard for the long-term archival of electronic documents (referenced in A7)
- Digitalium SAE — `packages/backend/convex/auditLog.ts` (already implements daily sealing)
