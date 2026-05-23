# ADR-0013: Testing strategy — Vitest, convex-test, React Testing Library

- **Status**: Accepted
- **Date**: 2026-05-23

## Context

Gabon Connect ships business-critical logic on Convex (signature circuits, permissions, request lifecycle, audit log, archives with legal value) and a design system used by three front-end apps. Bugs in any of these layers have real-world consequences for citizens and agents.

We need an automated test layer that:

- Catches regressions in pure helpers (`lib/permissions`, `lib/signatureCircuit`, `lib/admin-nav`).
- Verifies that mutations transition state machines correctly (signature circuits, request statuses, piece validations).
- Confirms that Convex aggregates (ADR-0007) stay in sync with the underlying tables when mutations fire.
- Runs in seconds, not minutes — fast enough to live in pre-commit / CI without slowing down development.
- Doesn't require a running Convex deployment, a database, or browser drivers.

The team is small and ships quickly. We prefer a test layer that gives 80% of the safety with 20% of the operational overhead — accepting that end-to-end testing (Playwright against the real stack) comes later.

## Decision

Three concentric layers, each with the lightest tool that does the job.

### 1. Test runner — Vitest

All three packages that need tests (`packages/backend`, `packages/ui`, `apps/admin-web`) use **Vitest** with per-package `vitest.config.ts`. The root `package.json` exposes `bun run test:once` which fans out via Turborepo. Test files are colocated with sources as `*.test.ts(x)`.

Per-package environment:

- `packages/backend` → `environment: "edge-runtime"` (matches the Convex sandbox).
- `packages/ui` and `apps/admin-web` → `environment: "jsdom"`.

### 2. Backend — `convex-test` + `@convex-dev/aggregate/test`

We use [`convex-test`](https://docs.convex.dev/testing/convex-test) — a pure-JS mock of the Convex backend — wired to the real schema and the real function modules via `import.meta.glob("./**/*.ts")` + `import.meta.glob("./_generated/*.js")`. The setup module lives at `convex/test.setup.ts`.

The aggregate component must be registered explicitly on every test instance. We centralize this in `convex/lib/test-helpers.ts` with a `registerAggregates(t)` helper that loops over the 13 declared trees. Tests that exercise mutations writing to aggregated tables (`requests`, `documents`, `archives`, `organisms`, `citizens`, `notifications`) must call this helper.

When seeding fixture data via `t.run`, we wrap `ctx.db` with `triggers.wrapDB` so that the seed inserts fire the same triggers that production mutations do — otherwise the aggregates stay at zero and the assertions against them are meaningless. The pattern:

```ts
const seeded = await t.run(async (rawCtx) => {
  const ctx = { ...rawCtx, db: triggers.wrapDB(rawCtx).db }
  // ctx.db.insert(...) — fires aggregate triggers
})
```

### 3. UI — React Testing Library on `jsdom`

For presentation components in `@workspace/ui` (Badge, Progress, StatCard, …) and pure helpers in app packages, we use **@testing-library/react** mounted on `jsdom`. We test:

- The rendered output (text, styles, structure) for components that have no Next.js dependencies.
- The pure helper functions (`buildAdminNav(badges)`) directly.

We deliberately **do not** unit-test Next.js server components, components that use `next/link` or `usePathname`, or wired pages — those need either explicit Next mocks (high maintenance) or end-to-end Playwright (separate stack). They are out of scope for the unit layer.

### 4. Naming and discovery

- Tests live next to their subjects: `permissions.ts` ↔ `permissions.test.ts`.
- Vitest configs `include` only `*.test.{ts,tsx}` files; the globs that load Convex modules in `test.setup.ts` are deliberately scoped to NOT include the test files themselves (they exclude `*.test.ts` patterns implicitly via the `./**/*.ts` glob since vitest excludes test files by default at the runner level).

## Consequences

### Positive

- **Fast feedback** — 76 tests run in ~630ms via Turbo's parallel execution.
- **No infrastructure** — no Convex deployment, no Postgres, no Chrome required for unit tests. Anyone can `git clone && bun install && bun test:once`.
- **Real schema, real validators** — `convex-test` uses the actual `defineSchema`, so a schema mismatch breaks a test instead of breaking production.
- **Aggregate triggers covered** — the `triggers.wrapDB` pattern means the trigger machinery (ADR-0007) is exercised by every fixture, not just by hand-written mutations.
- **Per-package isolation** — each package owns its `vitest.config.ts`; touching one doesn't ripple to the others.

### Negative

- **Server-component coverage gap** — Next.js `app/` server components (e.g. `(app)/layout.tsx`) are not tested at the unit level. We accept this — they're thin orchestration layers, and the queries they call are tested independently.
- **No real-DB tests** — `convex-test` is a JS mock. Bugs that only surface against the real Postgres-backed Convex (transaction semantics, index quirks) would slip through. Mitigated by the dev environment validating the schema on every `convex dev --once`.
- **Aggregate registration must be kept in sync** — adding a new aggregate in `convex.config.ts` requires updating `lib/test-helpers.ts`. Mechanical, but easy to forget. A typecheck would not catch it; we will add a lint pass or a smoke test against the registered list.
- **Mock fatigue risk** — once we start writing tests for components with heavy Next deps, the mock surface grows quickly. We will resist this and reach for Playwright instead.

### Neutral

- The choice of `edge-runtime` for backend tests matches the Convex sandbox closely but not 100% (no `setImmediate`, slight `fetch` differences). Worth being aware of for any code that touches edge-incompatible APIs.

## Alternatives considered

### Option A — Local self-hosted Convex backend for tests

[Documented by Convex](https://stack.convex.dev/testing-with-local-oss-backend). Provides real DB semantics. Rejected for the unit layer because of startup cost (Docker, MinIO, Keycloak) and slow feedback loop. The right tool for integration tests in CI, not for `bun test` while developing.

### Option B — Jest

Older, slower, requires Babel for ESM, less aligned with the Vite ecosystem we already use through Next.js. Convex's recommended testing library targets Vitest first. No reason to deviate.

### Option C — Playwright for everything

Excellent for end-to-end, overkill for `can(actor, action)`. We will adopt Playwright when we need to verify multi-page flows (citizen wizard → admin instruction → signature → archive), but it complements rather than replaces the unit layer.

### Option D — No tests, rely on TypeScript + manual QA

The path of least resistance, also the path most likely to break in production. The state machines (signature circuits, request lifecycle) have too many transitions to verify by hand on every change.

## Coverage scope today

| Layer | Files tested | Files NOT tested (deliberate) |
|---|---|---|
| Pure helpers | `lib/permissions`, `lib/signatureCircuit`, `lib/admin-nav` | — |
| Auth | `auth.ts` (signIn, currentAgent, signOut) | `lib/current-agent.ts` (server-only wrapper) |
| Admin mutations | `assignRequest`, `requestPiece`, `validatePiece`, `rejectPiece`, `rejectRequest`, `prepareDocument` + full circuit, `sendCorrespondence`, `verseToSAE` | `transferRequest`, `updateInternalNote`, `signAndIssue` (legacy, kept for compat), `markCorrespondenceRead`, `replyCorrespondence` |
| Admin queries | `dashboard.getDashboard`, `dashboard.getSidebarCounts` (indirectly via mutation tests) | `requests.listQueue`, `requests.getInstruction`, `archives.*`, `correspondence.*`, `citizens.getFolder`, `directory.list`, `services.list` |
| Citizen / Platform backend | — (mocks-only apps for now) | All — apps still wired to `@workspace/mocks`. |
| UI components | `Badge` | All other 20+ components. |
| Server components | — | `app/**/layout.tsx`, `app/**/page.tsx`. |

Expansion strategy: write tests as we touch code. New mutations get tests in the same PR. Existing untested code is fair game when modified.

## References

- [Testing | Convex Developer Hub](https://docs.convex.dev/testing)
- [convex-test | Convex Developer Hub](https://docs.convex.dev/testing/convex-test)
- [`get-convex/convex-test`](https://github.com/get-convex/convex-test)
- [Testing patterns for peace of mind](https://stack.convex.dev/testing-patterns)
- [Running tests using a local open-source backend](https://stack.convex.dev/testing-with-local-oss-backend)
- ADR-0007 — Aggregated statistics via the Convex aggregate component
- `packages/backend/convex/lib/test-helpers.ts` — aggregate registration helper
- `packages/backend/convex/test.setup.ts` — module loader for `convex-test`
