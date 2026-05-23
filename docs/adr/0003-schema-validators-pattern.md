# ADR-0003: Schema validators as exported tuples, types and validators

- **Status**: Accepted
- **Date**: 2026-05-23

## Context

Convex schemas express enumerations with inline literal unions:

```ts
status: v.union(
  v.literal("submitted"),
  v.literal("in_instruction"),
  v.literal("issued"),
)
```

The same set of values is needed in many other places: query/mutation argument validators, action validators, helper functions, the React layer (filter dropdowns, badges), the seed script, and test fixtures. Rewriting the union every time is verbose, drift-prone (the schema diverges silently from the UI), and the values are not iterable at runtime.

The reference project (Digitalium SAE) solves this with a clean three-export pattern in `convex/lib/constants.ts` using `convex-helpers`. We will adopt the same pattern.

## Decision

For every enumeration in the domain, we will export three artifacts from `packages/backend/convex/lib/enums.ts` (or a domain-specific file once it grows):

```ts
import { literals } from "convex-helpers/validators"

export const REQUEST_STATUSES = [
  "draft",
  "submitted",
  "in_instruction",
  // …
] as const
export type RequestStatus = (typeof REQUEST_STATUSES)[number]
export const requestStatusValidator = literals(...REQUEST_STATUSES)
```

Naming convention:

- **Tuple**: `SCREAMING_SNAKE_CASE`, plural — runtime values for iteration, UI dropdowns, seeds (`REQUEST_STATUSES`).
- **Type**: `PascalCase`, singular — for function signatures, React props (`RequestStatus`).
- **Validator**: `camelCase`, singular, suffix `Validator` — for `defineTable`, query/mutation args (`requestStatusValidator`).

Composed object validators (addresses, monetary amounts, geo-coordinates) live next door in `lib/validators.ts` and follow the same camelCase + `Validator` suffix.

Convex functions must reference these constants — they never inline `v.union(v.literal(...), ...)` for values that exist as enums in the codebase.

## Consequences

### Positive

- Single source of truth — adding a status value is one line, picked up everywhere.
- Iterable at runtime — UI can render a filter dropdown without hardcoding the list.
- Typed everywhere — React components receive the union type, not `string`.
- Self-documenting — `lib/enums.ts` becomes a readable catalog of the domain's state spaces.
- Matches Digitalium SAE conventions — engineers moving between projects see the same shape.

### Negative

- One indirection: reading the schema you have to follow the import to see the values. Mitigated by IDE go-to-definition.
- New dependency: `convex-helpers`. Small, widely used, maintained by the Convex team. Acceptable.

### Neutral

- The tuple `as const` requires `as const satisfies readonly string[]` if we want stricter checks; we will not add the `satisfies` clause unless we have a concrete reason.

## Alternatives considered

### Option A — TypeScript enums

`enum RequestStatus { Draft = "draft", ... }`. Convex does not accept TS enums in validators — they are not first-class values — so we would still need a separate validator. Adds bridge code, no gain.

### Option B — Inline unions everywhere

Status quo when starting from `defineSchema` templates. Already rejected in Context: drift-prone, not iterable.

### Option C — JSON schema or Zod outside Convex

Convex has its own validator system that powers the typed client and the database constraints. Mixing systems would mean writing every enum twice (Convex + Zod). Not worth it.

## References

- Digitalium SAE — `/Users/berny/Developer/digitalium-sae/packages/backend/convex/lib/constants.ts`
- `convex-helpers` — https://www.npmjs.com/package/convex-helpers
