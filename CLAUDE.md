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
- **`@workspace/backend`** — backend Convex complet : schema modulaire (`convex/schema/*.ts`), fonctions métier par domaine (`convex/admin/`, `convex/citizen/`, `convex/platform/`), permissions centralisées (`convex/lib/permissions.ts`, ADR-0006), audit, triggers, génération PDF, dispatch SAE. C'est la **source de données unique** des 3 apps.
- **`@workspace/tsconfig`** — bases TS (`base.json`, `nextjs.json`).

> Note historique : un package `@workspace/mocks` servait de source de données pendant le prototypage. Il a été retiré une fois le backend Convex en place — toute donnée vient désormais du backend.

## Flux de données & auth

- **Rendu serveur, pas réactif.** Les écrans sont des Server Components qui appellent le backend via un client Convex côté serveur (`apps/*/src/lib/convex.ts`). Pas de `ConvexProvider` ni `useQuery` — c'est du fetch-on-render (SSR). Les mutations passent par des Server Actions (`actions.ts`).
- **Auth agents (admin/platform)** : session bearer-token maison (`convex/auth.ts` → table `authSessions`), validée par `requireAgent(ctx, token)`. Le token vit en cookie httpOnly.
- **Auth citoyen (citizen-web)** : OIDC identité.ga via `better-auth` (+ `@idn-ga/better-auth`), fallback NIP en dev. L'identité est dérivée **côté serveur Convex** via `ctx.auth.getUserIdentity()` — ne jamais passer un identifiant citoyen (`idnSub`, `userId`) en argument de fonction pour autoriser (cf. `convex/_generated/ai/guidelines.md`).
- **Autorisation** : tout passe par `can()` / `assertCan()` et les guards de `convex/lib/permissions.ts`.

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

1. **Pas de données en dur** dans les écrans : tout passe par les queries/mutations du backend Convex (`@workspace/backend`).
2. **Jamais d'identité en argument** : autoriser via `ctx.auth.getUserIdentity()` + `can()`/`assertCan()`, jamais via un `idnSub`/`userId` fourni par l'appelant.
3. **Fidélité aux maquettes** : les sources de vérité sont dans `designs/project/screens/*.jsx`. Inline styles préservés.
4. **Une responsabilité par app** : ne pas mélanger logique citoyen / admin / plateforme.
5. **Server components par défaut**, client components uniquement quand `useState` / interactivité requise.
6. **Pas de Tailwind dans les écrans portés** — la palette/tokens vient des variables CSS de `@workspace/ui/tokens.css`.
