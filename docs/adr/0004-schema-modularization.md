# ADR-0004: Schema modularization by domain

- **Status**: Accepted
- **Date**: 2026-05-23

## Context

A flat `convex/schema.ts` works fine for small projects but becomes unmanageable once the domain grows past a dozen tables. Gabon Connect already has 14 tables and we have identified roughly 20 more to add (registry entries, document templates, signature circuits, onboarding processes, conventions, audit log, infrastructure components, recommendations, public verifications, assistant conversations, etc.). A monolithic schema file would be 1000+ lines, hard to review in PRs, hard to navigate, and would push every domain change through the same merge bottleneck.

Convex requires a single `defineSchema(...)` call that lists every table. The constraint is "all tables registered in one place", not "all tables defined in one file".

## Decision

We will keep `convex/schema.ts` as a thin **aggregator** that imports per-domain table maps and spreads them into `defineSchema`. Table definitions live in `convex/schema/<domain>.ts` files, each exporting a named map (e.g. `organismsTables`, `requestsTables`).

```ts
// convex/schema/organisms.ts
export const organismsTables = {
  organisms: defineTable({ /* … */ }),
  agents: defineTable({ /* … */ }),
  onboardingProcesses: defineTable({ /* … */ }),
}

// convex/schema.ts
import { defineSchema } from "convex/server"
import { organismsTables } from "./schema/organisms"
import { citizensTables } from "./schema/citizens"
// … one import per domain

export default defineSchema({
  ...organismsTables,
  ...citizensTables,
  // …
})
```

Initial domain split (subject to evolution):

- `organisms.ts` — organizations, agents, onboarding processes, conventions, provinces
- `citizens.ts` — citizens, civil relations, saved items, recommendations
- `services.ts` — service categories, services, variants, requirements, document templates
- `requests.ts` — drafts, requests, pieces, verifications, events, messages
- `documents.ts` — issued documents, public verifications, registry entries
- `correspondence.ts` — correspondences, messages, reads, signature circuits
- `archives.ts` — archives, elimination batches
- `notifications.ts` — notifications, platform alerts
- `audit.ts` — audit log, team activities, infrastructure components
- `auth.ts` — auth sessions, dossier access grants
- `assistant.ts` — assistant conversations, messages

## Consequences

### Positive

- PRs touch focused files — easier review, less merge friction.
- Each domain file becomes a readable spec of its slice of the model.
- A new engineer can grok one domain at a time.
- Cross-domain dependencies become visible at the import level — useful as a coupling smell detector.

### Negative

- One extra indirection when looking up where a table is defined. Mitigated by IDE go-to-definition and predictable file naming.
- The aggregator must be kept in sync (one import + one spread per new domain file). Trivial mechanically.
- Table names must remain globally unique — there is no namespacing across domain files. Acceptable; collisions would be a smell anyway.

### Neutral

- Functions (queries, mutations, actions) follow a parallel structure under `convex/<app>/<domain>.ts` (e.g. `convex/admin/requests.ts`). The two structures evolve independently.

## Alternatives considered

### Option A — single monolithic `schema.ts`

Status quo. Already rejected in Context once the table count crosses ~15.

### Option B — one file per table

Too granular for tables that have natural pairings (e.g. `correspondences` + `correspondenceMessages` + `correspondenceReads`). Forces artificial boundaries. We prefer domain-sized files.

### Option C — generate the schema from external definitions (YAML, JSON)

Adds tooling and indirection for no real benefit — Convex's TypeScript-based schema is already the right format.

## References

- Convex schema docs — https://docs.convex.dev/database/schemas
- Digitalium SAE keeps a monolithic schema.ts but isolates constants — we take the next step by also splitting tables. The domain there is larger and the choice is even more compelling here.
