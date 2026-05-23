# ADR-0006: Permissions enforced in code, not in the database

- **Status**: Accepted
- **Date**: 2026-05-23

## Context

Gabon Connect has multiple actors with overlapping access rules:

- Citizens see only their own dossier and the public service catalog.
- Agents see requests assigned to their organism; some roles (chef de service, officier signataire) can take signature actions; admins of an organism can manage their services and team.
- Platform admins see everything cross-organism.
- Dossier 360° access (A4) requires explicit grants from another organism — agent of DGI can read a citizen's tax-related data, agent of Ministry of Justice can read a "B3" extract, etc.

Two architectural approaches: encode the rules as **data** (a `permissions` table queried at every call) or as **code** (a centralized helper called from every query/mutation).

## Decision

We will enforce permissions in **code**, centralized in a `convex/lib/permissions.ts` module exposing a `can(actor, action, subject)` helper. Each query and mutation begins with an authorization check that uses this helper or one of its derived guards (e.g. `requireAgentRole`, `requireDossierAccess`). The data layer (`dossierAccessGrants` table) stores **inputs** to the rules (who has been granted what), but the rules themselves are TypeScript.

```ts
// convex/lib/permissions.ts
export type Actor =
  | { kind: "citizen"; citizenId: Id<"citizens"> }
  | { kind: "agent"; agentId: Id<"agents">; organismId: Id<"organisms">; role: AgentRole }
  | { kind: "platform_admin"; userId: Id<"users"> }
  | { kind: "system" }

export type Action =
  | "request.read"
  | "request.assign"
  | "request.sign"
  | "document.issue"
  | "archive.eliminate"
  // …

export function can(actor: Actor, action: Action, subject?: unknown): boolean { /* … */ }
```

## Consequences

### Positive

- Rules are versioned with the code — a permission change ships as a normal PR with a clear diff.
- Rules can express arbitrary logic (composite conditions, cross-table lookups, time-based grants) without contorting a data model.
- Type safety — actions are a string union, not arbitrary strings.
- Easier to test — pure functions with deterministic inputs.

### Negative

- Cannot give a non-developer (e.g. a security officer) a UI to tweak permissions. Acceptable for v1; the platform admin team is the security team.
- Forgetting to call the helper means a public mutation. Mitigated by a code review checklist and by wrapping common patterns in higher-order helpers (`agentMutation`, `citizenMutation`, …) that bake in the check.
- Refactoring rules touches many call sites if not structured carefully. Mitigated by keeping the rule logic in `lib/permissions.ts` and only the call shape at call sites.

### Neutral

- Some inputs to the rules **do** live in the database: `dossierAccessGrants`, `agents.role`, `agents.organismId`. These are facts, not rules.

## Alternatives considered

### Option A — RBAC table + middleware

A `permissions` table with `(actorRole, action, scope)` rows and a generic middleware. Heavier to set up, harder to read, and any non-trivial rule (e.g. "agent can sign IF assigned AND not the same agent who deposited") leaks back into code anyway. Adds complexity without solving the hard cases.

### Option B — Convex row-level security (not native)

Convex does not have RLS like Postgres. Building it would be a project of its own.

### Option C — OPA / Cedar policy engine

Powerful, declarative. Overkill at this scale and adds a runtime dependency. Reconsider if we ever expose permission editing to non-developers.

## References

- Mockup A4 (`AdminCitizenFolder`) — habilitations panel
- Mockup P3 (`PlatformOnboarding`) — referent roles assignment
