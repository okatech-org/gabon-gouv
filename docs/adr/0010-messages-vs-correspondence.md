# ADR-0010: Citizen↔agent messages separated from inter-admin correspondence

- **Status**: Accepted
- **Date**: 2026-05-23

## Context

Two messaging surfaces appear in the mockups:

- **Citizen↔Agent on a request** (C5 "Échanges avec l'administration") — informal, scoped to one request, asymmetric (the citizen and one agent at a time), no signature, plain text, attachments allowed. The agent and the citizen each see a chat thread anchored to a `requestId`.
- **Inter-administration correspondence** (A6) — formal, official, between organisms (not individuals), routed through a S/MIME-signed circuit, with confidentiality levels, archival policies, deadline, urgency, multi-step validation. Modeled as the existing `correspondences` table.

These two surfaces share the noun "message" but almost nothing else: different participants (individual vs organism), different audit level (informal vs probative), different storage retention (citizen messages may be purged after the request closes; correspondences are archived under their own retention rules), different signing (none vs S/MIME), different schemas (read receipts, urgency, confidentiality, signature circuits are correspondence-only).

## Decision

We will keep two tables:

- **`requestMessages`** — `(requestId, fromKind: 'citizen'|'agent', fromCitizenId?|fromAgentId?, body, attachmentIds[], readAtByCounterparty, sentAt)`. One thread per request. No signature, no confidentiality levels.
- **`correspondences`** + `correspondenceMessages` + `correspondenceReads` (already exist) — unchanged, with a signature circuit per ADR-0009.

Cross-references are allowed (a correspondence can `linkedRequestId` for context) but the records are not merged.

## Consequences

### Positive

- Each surface has a tight schema — no optional fields that mean nothing in the other context.
- Different retention/archival policies are easy to express (one table, one rule).
- Permissions are simpler — `requestMessages` is read by the citizen + assigned agents; `correspondences` is read by agents of the involved organisms.
- The UI never has to filter on a `kind` field to know which mode to render.

### Negative

- Two tables to maintain when adding a feature that touches both (e.g. "mark as urgent"). Acceptable; the features rarely overlap.
- Engineers must remember which surface they are touching. Mitigated by clear domain file naming (`schema/requests.ts` vs `schema/correspondence.ts`).

### Neutral

- A future "universal messaging" view (admin sees every conversation they participate in) can union the two tables in a query helper.

## Alternatives considered

### Option A — single `messages` table with discriminator

The discriminator would be `scope: 'request' | 'correspondence'`. Every query would need to filter; the schema would be a superset full of optionals; the indexes would be wider than needed. Worse — the access rules diverge sharply (one is bilateral, one is multi-organism), so the helpers would branch on the discriminator anyway. Loses on every axis.

### Option B — only `correspondences`, model citizen↔agent as an intra-organism correspondence

Forces the citizen to be modeled as an "organism", which breaks the rest of the data model. Rejected.

## References

- Mockups — C5 (`CitizenTracking` "Échanges avec l'administration"), A6 (`AdminCorrespondence`)
- ADR-0009 — signature circuits, used by `correspondences` only
