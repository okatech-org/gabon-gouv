# ADR-0009: Polymorphic signature circuits

- **Status**: Accepted
- **Date**: 2026-05-23

## Context

Three distinct workflows in Gabon Connect share the same shape:

- **Document issuance** (A3 sidebar, A5) — Agent instructeur → Chef de service → Officier signataire. Each step has a status (done / active / pending) and the act is sealed only when all steps complete.
- **Inter-administration correspondence validation** (A6 right panel) — Same three-step circuit before a correspondence leaves the organism.
- **Onboarding convention signing** (P3) — Gabon Connect platform admin signs, then the new organism's DG signs.

In each case we need: ordered steps, an assignee per step, a status, a decision timestamp, optional rejection comment, and the ability to reroute a step.

## Decision

We will model these as a single **polymorphic `signatureCircuits`** table linked to its subject by `(subjectKind, subjectId)`:

```ts
signatureCircuits: {
  subjectKind: "document" | "correspondence" | "convention",
  subjectId: string,            // typed-id by convention, validated at call sites
  status: "pending" | "active" | "completed" | "refused" | "cancelled",
  startedAt: number,
  completedAt: optional(number),
}

signatureCircuitSteps: {
  circuitId: Id<"signatureCircuits">,
  order: number,
  assigneeAgentId: Id<"agents">,
  assigneeRole: AgentRole,       // snapshot of role at step creation
  status: "pending" | "active" | "done" | "refused" | "skipped",
  decidedAt: optional(number),
  comment: optional(string),
}
```

Step state transitions are managed by a small state machine in `convex/lib/signatureCircuit.ts`. When the last `done` step closes a circuit, a trigger fires the subject-specific completion logic (issue a document, send a correspondence, activate an organism).

## Consequences

### Positive

- One state machine, one set of mutations, one set of indices — works for all three subjects.
- Auditable — every step's actor, time, and comment is stored.
- Easy to extend to a fourth subject (e.g. "service catalog publication validation") without new tables.
- The polymorphic ID is typed via the `subjectKind` literal — the call sites are responsible for narrowing.

### Negative

- The polymorphic FK is not enforced at the database level (Convex does not constrain `string` to an `Id<"X">` based on another field). Mitigated by always going through helpers that take the typed subject and construct the row.
- Slightly more indirection — querying "is this document signed?" requires a join on the circuit. Cached via a `documents.signatureCircuitId` and `documents.status` denormalization where read frequency is high.

### Neutral

- The circuit *template* (who signs what) can be configured per service or per organism later. Initially we hard-code the three-step circuit for documents and correspondence and a two-step circuit for conventions.

## Alternatives considered

### Option A — Three separate circuit tables (one per subject)

Triples the maintenance burden, triples the mutation surface. The state machine logic would be copy-pasted three times. Rejected.

### Option B — A generic workflow engine (Convex Workflow DevKit, BullMQ-style)

Overkill for short, human-driven step sequences. We will reach for a workflow engine when we need long-running, retry-prone, side-effectful orchestrations (e.g. async OCR pipelines, external API integrations). The signature circuit is not that.

### Option C — Embedding steps as an array on the subject row

Loses indexability of "all steps assigned to me where I have not yet decided". That query is needed for an agent's signature inbox. Rejected.

## References

- Mockups — A3 (`AdminInstruction` Pipeline steps + "Valider & signer"), A6 (`AdminCorrespondence` Circuit de validation sidebar), P3 (`PlatformOnboarding` Signataires)
- Convex Workflow DevKit — https://workflow.dev (for the option B comparison)
