# ADR-0001: Use Convex as the backend platform

- **Status**: Accepted
- **Date**: 2026-05-23

## Context

Gabon Connect is a multi-tenant administrative platform that needs to back three Next.js apps (citizen, admin, platform console). The product requirements include real-time updates (request status changes visible to both citizen and agent within seconds), strong typing across the stack, fine-grained access control, durable workflows (signature circuits, onboarding, archival), file storage for citizen documents and signed acts, and a path toward sovereign self-hosting in Gabon.

The team is small and prioritizes shipping velocity over operating a self-managed stack of Postgres + queues + WebSocket gateway + object storage. The reference project (Digitalium SAE) already uses Convex self-hosted with Postgres + MinIO and validates the deployment pattern for the Gabonese context.

## Decision

We will use **Convex** as the backend platform for all three apps in the monorepo. Schema, queries, mutations, actions, scheduled functions, file storage, and the live-query subscription model are all delegated to Convex. The hosted offering is used in development; the production path is **Convex self-hosted** (Postgres + S3-compatible storage) deployed in Gabon for sovereignty.

## Consequences

### Positive

- Single source of truth for schema and types — generated `_generated/api.d.ts` flows into every app.
- Reactive queries remove the need for a separate WebSocket/pub-sub layer for live status updates.
- Mutations are transactional by default — important for state machines (request status transitions, signature circuits).
- Server-side file storage with signed URLs covers citizen pieces and signed acts.
- Convex Components (e.g. `@convex-dev/aggregate`) provide off-the-shelf building blocks we would otherwise have to code.
- Same stack as Digitalium SAE → shared mental model and reusable patterns.

### Negative

- Vendor footprint: portability away from Convex would be a large rewrite. Mitigated by the self-hosted option.
- Less mature ecosystem than Postgres + ORM combos — fewer Stack Overflow answers, fewer third-party tools (BI, admin UIs).
- No raw SQL — complex analytical queries must be expressed in TypeScript or pushed to a downstream warehouse.
- Indexing is more limited than Postgres (no partial indexes, no GIN, no full-text search natively).

### Neutral

- All data access is funneled through generated client APIs — engineers must learn the Convex query model.
- Migrations are schema-driven; backfills are explicit Convex functions, not SQL scripts.

## Alternatives considered

### Option A — Postgres + Drizzle + tRPC + Pusher/Ably

Industry-standard stack with full SQL flexibility. Rejected because the team would need to operate Postgres, a job runner, an object store, and a real-time gateway from day one — much more ops surface for a small team. Also requires hand-rolling the reactive subscription layer that Convex gives for free.

### Option B — Firebase / Supabase

Both deliver real-time + storage + auth. Supabase is closer to Postgres (preferred for portability) but its row-level security model is harder to reason about for the kind of multi-organism, multi-role access we need. Firebase ties us to Google infrastructure, which conflicts with the sovereignty requirement. Neither has a clear self-hosting story compatible with Gabon datacenters at the operational level Digitalium SAE has already validated.

### Option C — NestJS + Postgres + WebSocket + custom

Maximum flexibility, maximum complexity. The team would be writing infrastructure code for months before delivering the first feature. Not aligned with shipping velocity.

## References

- Digitalium SAE — Convex self-hosted blueprint at `/Users/berny/Developer/digitalium-sae/docs/sae-poc-blueprint.md`
- Convex documentation — https://docs.convex.dev
