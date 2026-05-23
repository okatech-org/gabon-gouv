# ADR-0002: Three-app monorepo with shared design system

- **Status**: Accepted
- **Date**: 2026-05-23

## Context

Gabon Connect serves three audiences with sharply different needs:

- **Citizens** — public-facing, low-frequency users, mobile-first, need a marketing-quality landing page, a service catalog, deposit wizards, and a personal dashboard.
- **Agents** — daily operators inside an administration, need a dense, keyboard-friendly back-office with queues, dossiers, signature workflows, archives.
- **Platform admins** — Digitalium operators, need a super-admin console to onboard organizations, supervise the platform, read KPIs.

These audiences must not see each other's UI, and a security incident or downtime in one should not cascade to the others. They also have very different update cadences: the citizen vitrine evolves with communication needs; the admin app changes with each new organism that onboards; the platform console moves with infrastructure.

## Decision

We will ship **three independent Next.js applications** in a single monorepo (`apps/citizen-web`, `apps/admin-web`, `apps/platform-web`), each deployed under its own domain (`gabon.connect`, `admin.connect`, `console.connect`). They share a **design system package** (`@workspace/ui`) and a **backend package** (`@workspace/backend` — Convex). Mocks for non-wired apps live in `@workspace/mocks`.

## Consequences

### Positive

- Clear separation of concerns — citizen code never imports admin code.
- Independent deployments — a hotfix on the citizen app does not redeploy admin.
- Different domains let us scope cookies, CSP, and DNS-level rate limiting per audience.
- The design system enforces visual consistency (Gabonese institutional identity, RGAA accessibility) without coupling the apps.
- Easier to give different teams ownership of different apps over time.

### Negative

- Three Next.js builds, three sets of build configs, three sets of env vars.
- Cross-app navigation requires full page loads (different origins) — a citizen who is also an agent must log in twice. Acceptable since these are distinct personas.
- A breaking change in `@workspace/ui` impacts all three apps simultaneously. Mitigated by careful versioning of component contracts.

### Neutral

- Convex is shared by all three apps, so backend changes do impact everyone — the schema is the contract.
- Turborepo handles task orchestration and remote caching.

## Alternatives considered

### Option A — single Next.js app with role-based routing

Reject for the same reasons as in Context: blast radius, security boundary, deployment cadence, and team ownership all argue for separation.

### Option B — three independent repositories

Loses the shared design system, mocks, and Convex code-generation. Requires manual sync of types between repos. Engineering velocity drops without enough benefit since all three apps are owned by the same small team today.

### Option C — Microfrontends (Module Federation)

Adds runtime complexity (host shell, remote loading, version skew) for benefits we do not need at this stage. The three apps do not share UI at runtime.

## References

- `README.md` at the repo root — app/domain mapping
- `apps/*` — the three apps
- `packages/ui` — shared design system
