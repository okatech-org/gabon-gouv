# ADR-0005: Service variants as a child table of services

- **Status**: Accepted
- **Date**: 2026-05-23

## Context

A given administrative service ("Acte de naissance") often has multiple delivery variants ("copie intégrale", "extrait avec filiation", "extrait sans filiation"). The mockups expose this in two contradictory ways:

- **Citizen service page (C2)** renders **one** service with **three cards** inside it; the citizen picks the variant within the same flow.
- **Admin catalog (A8)** lists two separate rows ("Acte de naissance · copie intégrale" and "Acte de naissance · extrait") with their own delay, satisfaction, and request count.
- **Generation screen (A5)** picks a template per variant ("Copie intégrale v3.2", "Extrait avec filiation v3.2", "Extrait sans filiation v3.2").

We must pick a single backend model that supports all three views.

## Decision

We will model variants as a **child table**:

- `services` — the parent (slug, title, category, description, legal references, target audience, FAQ, …).
- `serviceVariants` — child rows (`serviceId`, `key`, `label`, `description`, `whoCanApply`, `defaultVariant: boolean`, `feeOverride`, `delayOverrideHours`).

A `requests` row references the chosen variant via `serviceVariantId` (in addition to `serviceId` for fast joins on the parent).

`documentTemplates` are keyed on `serviceVariantId`, not on `serviceId` — different variants produce different documents.

## Consequences

### Positive

- The citizen page (C2) renders the parent + its variants in a single query.
- Admin catalog (A8) can pivot stats either at the variant level (current mock) or aggregate up to the parent — both are easy.
- Adding a new variant ("Extrait plurilingue") does not duplicate the FAQ, the legal reference, or the description.
- Variants can share or override pricing and delay independently.

### Negative

- One more table to maintain. The relationship is straightforward.
- Migrations: if we ever realize a "variant" is actually a different service, we have to detach it. Acceptable; the inverse (merging two services into one with variants) is harder, so we err on the side of parent + variants.

### Neutral

- Service categories (`serviceCategories`) remain attached to the parent service, not the variant.
- Search and filtering can operate at either level — we will expose the right granularity per surface.

## Alternatives considered

### Option A — one row per variant in `services`, no parent

Simplest. Matches the admin catalog mock directly. Rejected because the citizen page would need a join key ("services grouped by base title") that is brittle and breaks if titles change. Also forces duplicating FAQ and legal text.

### Option B — JSON `variants` array inside `services`

Reduces table count by one but loses indexability — we cannot query "all requests for the 'extrait avec filiation' variant" efficiently, cannot count requests per variant without scanning the parent payload, and Convex does not index inside arrays. Stats become painful.

### Option C — Variants as a free-form `kind` string on `requests`

Even worse for stats and integrity. No referential constraint, no description, no documentTemplate linkage.

## References

- Mockups — `designs/project/screens/citizen.jsx` (C2 `CitizenServiceDetail`) and `designs/project/screens/admin.jsx` (A8 `AdminServices`, A5 `AdminGeneration`)
