# CLAUDE.md — Gabon Connect (gabon-gouv)

Guide pour les agents qui travaillent sur ce monorepo.

## Vue d'ensemble

Plateforme administrative gabonaise composée de **3 apps Next.js indépendantes** qui partagent un design system et un backend :

- **`apps/citizen-web`** — espace citoyen, vitrine publique + dashboard (port 3000, futur domaine `gabon.connect`)
- **`apps/admin-web`** — back-office des administrations (port 3001, futur `admin.connect`)
- **`apps/platform-web`** — console super-admin Digitalium (port 3002, futur `console.connect`)

Chaque app aura son nom de domaine en prod pour des raisons de sécurité et d'isolation.

## Packages partagés

- **`@workspace/ui`** — design system : tokens CSS, composants TypeScript (Icon, Button, Badge, Card, Table, Frame, AppHeader, Sidebar, etc.). Inline styles préservés depuis les maquettes pour fidélité 1:1.
- **`@workspace/mocks`** — données moquées exposées par domaine (`@workspace/mocks/citizen`, `/admin`, `/platform`). Fonctions `get*` async. **Jamais de constante en dur dans un écran** — toujours via mock.
- **`@workspace/backend`** — Convex initialisé, schema minimal, pas de fonctions métier encore.
- **`@workspace/tsconfig`** — bases TS (`base.json`, `nextjs.json`).

## Identité graphique

- Bleu institutionnel USWDS-like (`--primary-500: #1a4480`)
- Filet tricolore Gabon (vert `#009e60`, jaune `#fcd116`, bleu `#3a75c4`) via `<RepublicBar />`
- Typo Marianne (DSFR) + JetBrains Mono
- Tokens dans `packages/ui/src/styles/tokens.css`

## Workflow

```bash
bun install
bun run dev:citizen   # ou dev:admin / dev:platform
```

## Règles d'or

1. **Pas de données en dur** dans les écrans : tout passe par `@workspace/mocks`.
2. **Fidélité aux maquettes** : les sources de vérité sont dans `designs/project/screens/*.jsx`. Inline styles préservés.
3. **Une responsabilité par app** : ne pas mélanger logique citoyen / admin / plateforme.
4. **Server components par défaut**, client components uniquement quand `useState` / interactivité requise.
5. **Pas de Tailwind dans les écrans portés** — la palette/tokens vient des variables CSS de `@workspace/ui/tokens.css`.
