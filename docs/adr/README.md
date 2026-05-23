# Architecture Decision Records

This directory contains the Architecture Decision Records (ADRs) for Gabon Connect.

An ADR captures a single architecturally significant decision: its context, the alternatives that were considered, the decision itself, and its consequences. ADRs are immutable once accepted — superseded decisions get a new ADR that references the old one rather than rewriting history.

## Format

Each ADR follows a lightweight variant of the [Michael Nygard format](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions):

- **Status** — Proposed · Accepted · Deprecated · Superseded by ADR-XXXX
- **Date** — when the decision was accepted
- **Context** — the forces at play (technical, organizational, regulatory)
- **Decision** — what we agreed to do, in one or two sentences
- **Consequences** — positive, negative, and neutral outcomes
- **Alternatives considered** — what else was on the table and why we did not pick it

Files are named `NNNN-kebab-case-title.md` where `NNNN` is a zero-padded sequence number.

## Index

| #    | Title                                                                            | Status   |
| ---- | -------------------------------------------------------------------------------- | -------- |
| 0001 | [Use Convex as the backend platform](0001-convex-as-backend.md)                  | Accepted |
| 0002 | [Three-app monorepo with shared design system](0002-three-app-monorepo.md)       | Accepted |
| 0003 | [Schema validators as exported tuples, types and validators](0003-schema-validators-pattern.md) | Accepted |
| 0004 | [Schema modularization by domain](0004-schema-modularization.md)                 | Accepted |
| 0005 | [Service variants as a child table of services](0005-service-variants.md)        | Accepted |
| 0006 | [Permissions enforced in code, not in the database](0006-permissions-in-code.md) | Accepted |
| 0007 | [Aggregated statistics via the Convex aggregate component](0007-stats-aggregate-component.md) | Accepted |
| 0008 | [Unified notifications table with recipient discriminator](0008-unified-notifications.md) | Accepted |
| 0009 | [Polymorphic signature circuits](0009-polymorphic-signature-circuits.md)         | Accepted |
| 0010 | [Citizen↔agent messages separated from inter-admin correspondence](0010-messages-vs-correspondence.md) | Accepted |
| 0011 | [Lazy creation of registry entries](0011-lazy-registry-entries.md)               | Accepted |
| 0012 | [Audit log separated from team activity feed](0012-audit-log-separation.md)      | Accepted |
| 0013 | [Testing strategy — Vitest, convex-test, RTL](0013-testing-strategy.md)           | Accepted |

## Writing a new ADR

1. Copy [`_template.md`](_template.md) to the next free number.
2. Fill in the sections. Keep the body short — usually under 200 lines.
3. List the alternatives you actually considered, not strawmen.
4. Set status to **Proposed** until the team approves it; then flip to **Accepted** and freeze it.
5. If a later decision overturns this one, do not rewrite — create a new ADR and set the old one to **Superseded by ADR-XXXX**.
