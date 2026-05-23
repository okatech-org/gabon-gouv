# ADR-0007: Aggregated statistics via the Convex aggregate component

- **Status**: Accepted
- **Date**: 2026-05-23

## Context

Several screens display heavy aggregations:

- **A1** — KPI strip ("47 in queue", "318 processed in 7 days", "average delay 1d 18h", "satisfaction 4.6/5"), volume sparkline over 30 days, breakdown by request type.
- **A2** — pagination over 847 requests with sort and filter.
- **P1** — platform-wide KPI strip (47 organisms, 128 services, 14 218 requests over 7 days, 318 042 active citizens, 9 184 documents emitted), top organisms by volume.
- **P4** — yearly volume curve over 12 months, top 8 services, per-province breakdown, SLA respect (87%), satisfaction histogram, mobile adoption (68%).

Running these as live queries against the raw `requests`, `documents`, `archives` tables at every page render would scale poorly past tens of thousands of rows — Convex queries scan and a `count()` of millions of rows on every dashboard load is wasteful.

Two strategies: (a) maintain materialized `statsSnapshots` rows refreshed by a cron, or (b) use the off-the-shelf **`@convex-dev/aggregate`** Convex component, which maintains sorted indices and supports `count`, `sum`, `min`, `max`, and offset operations in `O(log n)`.

The Convex blog post ["Efficient count, sum, max with the aggregate component"](https://stack.convex.dev/efficient-count-sum-max-with-the-aggregate-component) walks through the pattern.

## Decision

We will use the **`@convex-dev/aggregate`** Convex component for KPIs and ordered counts. Aggregates are declared in `convex/aggregates.ts` (one per metric or per table) and wired with mutation triggers so that every insert/update/delete keeps the aggregate in sync.

Examples we will instantiate:

- `requestsByOrganismAndStatus` — for "47 in queue" per organism.
- `requestsByService` — for breakdown by type.
- `documentsIssuedByDate` — for volume curve and weekly totals.
- `archivesByDuaExpiry` — for "412 awaiting elimination".
- `satisfactionByService` — for stars per service.
- `citizensActive` — for the platform KPI.

No `statsSnapshots` table is created until we hit a metric the aggregate component cannot serve (multi-dimensional pivots, derived analytics).

## Consequences

### Positive

- Constant-time KPI reads regardless of table size.
- No cron lag — aggregates are updated transactionally with the underlying mutation.
- One mental model for all counts/sums/sorts.
- Per-namespace aggregation built in (e.g. one aggregate per organism without a separate table).

### Negative

- Every mutation that writes a tracked table must be aware of the aggregate (call `insert`, `delete`, `replace`). Forgetting one drifts the count. Mitigated by wrapping the writes in domain-level helpers and tests.
- A new tracked dimension means a new aggregate + a backfill of historical rows. Acceptable cost, well documented.
- Component bundles a small runtime — negligible overhead.

### Neutral

- Aggregates count only what they index. Multi-dimensional analytics (heatmaps, cohorts) eventually need a different tool — at that point we will revisit ADR-0007 and may introduce a downstream warehouse + ETL.

## Alternatives considered

### Option A — Live `query.collect().length` and reduce

Works at 100 rows, dies at 10 000. Already rejected in Context.

### Option B — `statsSnapshots` table + scheduled job

Adds lag (snapshots are not real-time), more code, requires backfilling on schema changes, and we would still need to track every mutation that affects the snapshot.

### Option C — External warehouse (BigQuery, ClickHouse) + ETL

The right answer eventually. Not the right answer now — the team is small, the data volume is modest, and adding a second source of truth before we have a single one is premature.

## References

- Convex aggregate component — https://www.convex.dev/components/aggregate
- Convex blog — https://stack.convex.dev/efficient-count-sum-max-with-the-aggregate-component
- Digitalium SAE — `packages/backend/convex/aggregates.ts` (already uses this pattern)
