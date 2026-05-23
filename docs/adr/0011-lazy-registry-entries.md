# ADR-0011: Lazy creation of registry entries

- **Status**: Accepted
- **Date**: 2026-05-23

## Context

When the agent instructs a birth certificate request (A3), they must confirm the source act in the **registre des naissances** — for the mockup citizen, this is "acte n° 04812 du registre EC-LBV-1992-N, page 218". The registry is the legal source of truth for civil-status acts and predates the platform by decades. There are millions of historical entries across all communes and years, most never queried via Gabon Connect.

Two extreme approaches:

- Digitize and index the entire civil-status registry upfront. Massive operation, out of scope for the platform, and most rows would never be touched.
- Treat the registry as an opaque external system referenced by free text. Loses the linkage between Gabon Connect documents and the original act.

## Decision

We will create a **`registryEntries`** table populated **on demand**. When an agent confirms a source act for a request, the row is created (or upserted) with the metadata they confirmed: `registerCode` (e.g. `EC-LBV-1992-N`), `actNumber`, `pageNumber`, `orderNumber`, `year`, `commune`, `province`, `transcription` (the text of the act), `marginalMentions[]`, `verifiedAt`, `verifiedByAgentId`. The `requests` and `documents` rows reference the entry by `registryEntryId`.

Subsequent requests touching the same source act benefit from the existing entry — no re-keying, no risk of typos, and a clear cross-reference ("4 documents have been issued from registry entry EC-LBV-1992-N #04812").

## Consequences

### Positive

- No mass-digitization project required to ship.
- The corpus of `registryEntries` reflects the actually-used subset of the historical registry — useful both for product analytics and as a long-term migration to a fully digital civil-status registry.
- Cross-references are first-class — fraud detection ("two different citizens claiming the same source act") becomes a simple query.
- Marginal mentions (death, divorce, name change) can be added to an existing entry and propagated to all derived documents.

### Negative

- The first request touching a source act pays a manual data-entry cost. Acceptable — it is the agent's existing job.
- An entry created from a single request may have partial or inaccurate data until it is referenced again and corrected. Mitigated by an `accuracyLevel` field (`partial` / `verified` / `attested`) and by surface UI to flag corrections.
- We rely on agent discipline to confirm matches rather than typing the source act anew each time. Mitigated by a "search existing entries" UI step before allowing creation.

### Neutral

- The relationship between `registryEntries` and the eventual digital civil-status registry (if it materializes) is unknown today. The model can absorb it via an external reference field if needed.

## Alternatives considered

### Option A — full pre-population from communal archives

Out of scope; not the platform's mandate; would multiply the project timeline.

### Option B — store registry metadata as a JSON blob on `requests` / `documents`

Loses cross-reference. Two documents from the same source act would store the source twice with no guarantee of consistency. Marginal mentions become impossible to maintain. Rejected.

## References

- Mockup A3 (`AdminInstruction` "Acte source au registre" card + "Confirmer correspondance" button)
- Mockup A5 (`AdminGeneration` variable inspector — variables sourced from registry)
