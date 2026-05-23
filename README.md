# Gabon Connect — Guichet unique administratif

Plateforme administrative unifiée de la République Gabonaise. Trois applications, une identité graphique commune, un socle partagé.

## Applications

| App | Domaine cible | Port dev | Public |
| --- | --- | --- | --- |
| `apps/citizen-web` | `gabon.connect` | `4000` | Citoyens : vitrine + dashboard, catalogue de services, dépôt, suivi, documents reçus |
| `apps/admin-web` | `admin.connect` | `4001` | Administrations : file d'instruction, dossier 360°, génération d'actes, correspondance, SAE |
| `apps/platform-web` | `console.connect` | `4002` | Digitalium : supervision multi-organismes, onboarding, statistiques d'impact |

Chaque app est déployée sur un domaine distinct (séparation pour sécurité et UX).

## Stack

- **Monorepo** : Bun workspaces + Turbo
- **Framework** : Next.js 15 (App Router) + React 19 + TypeScript
- **UI** : composants institutionnels inspirés USWDS/DSFR, identité Gabon (filet tricolore, Marianne)
- **Backend** : Convex (initialisé dans `packages/backend`, non utilisé dans cette itération)
- **Données** : moquées via `packages/mocks` (un fichier par domaine)

## Structure

```
apps/
  citizen-web/         # Application Citoyen — gabon.connect
  admin-web/           # Application Administration — admin.connect
  platform-web/        # Application Plateforme — console.connect
packages/
  ui/                  # Design system partagé (tokens.css + composants)
  mocks/               # Données moquées par domaine (citizen, admin, platform)
  backend/             # Convex (schema + fonctions, prêt pour itérations futures)
  tsconfig/            # Configurations TS partagées
designs/               # Maquettes hi-fi sources (référence)
```

## Démarrage

```bash
# 1. Installer les dépendances
bun install

# 2. Lancer une app en dev
bun run dev:citizen     # http://localhost:4000
bun run dev:admin       # http://localhost:4001
bun run dev:platform    # http://localhost:4002

# Ou tout en parallèle (turbo)
bun run dev

# Convex (optionnel pour les prochaines itérations)
bun run dev:convex
```

## Itération actuelle

- ✅ **21 écrans hi-fi** portés depuis les maquettes
- ✅ **Données moquées** servies via fonctions async (préparation à un backend Convex)
- ✅ **Design system partagé** (`@workspace/ui`)
- ⏳ Backend Convex prêt mais pas câblé — viendra avec les features
- ⏳ Pas de responsive — chaque page reproduit la maquette à largeur fixe (`Frame width={1440}`)

## Conventions

- **Données** : pas de constante en dur dans un écran. Tout passe par une fonction `get*` de `@workspace/mocks`.
- **Style** : `inline styles` préservés depuis les maquettes pour fidélité 1:1. Les tokens (`var(--primary-500)`, etc.) viennent de `@workspace/ui/tokens.css`.
- **Composants** : importer depuis `@workspace/ui` ; pas de duplication entre apps.
