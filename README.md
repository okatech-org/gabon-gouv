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
- **Backend** : Convex (initialisé dans `packages/backend`)
  - Schema, auth NIP simulée, seed, queries + mutations admin **écrits**
  - admin-web a un middleware de session et une page `/login`
  - Itération 1 : seul admin-web est câblé sur Convex (citizen et platform restent sur mocks)
- **Données mockées** : `packages/mocks` (un fichier par domaine) — encore utilisées par citizen-web et platform-web

## Structure

```
apps/
  citizen-web/         # Application Citoyen — gabon.connect (mocks)
  admin-web/           # Application Administration — admin.connect (Convex)
  platform-web/        # Application Plateforme — console.connect (mocks)
packages/
  ui/                  # Design system partagé (tokens.css + composants)
  mocks/               # Données moquées par domaine
  backend/             # Convex : schema, auth, seed, queries/mutations admin
  tsconfig/            # Configurations TS partagées
designs/               # Maquettes hi-fi sources (référence)
```

## Démarrage

### Première fois — bootstrap Convex

Le back-office admin nécessite Convex. À faire une seule fois :

```bash
# 1. Installer les dépendances
bun install

# 2. Démarrer Convex (login + création projet)
cd packages/backend
bunx convex dev
# Au premier lancement, ouvre le navigateur pour login Convex (gratuit).
# Choisis un nom de projet, ex: "gabon-connect-dev".
# Une fois lancé, Convex génère packages/backend/convex/_generated/.

# 3. Récupérer l'URL Convex et la mettre dans admin-web
# Convex affiche : `npx convex dev` → `Convex functions deployed to: https://xxx.convex.cloud`
# Copier dans apps/admin-web/.env.local :
echo "NEXT_PUBLIC_CONVEX_URL=https://xxx.convex.cloud" > ../../apps/admin-web/.env.local

# 4. Peupler la base avec le seed initial (une fois)
# Dans le dashboard Convex ou via CLI :
bunx convex run seed:reset
# → "Connectez-vous avec NIP 198501100001 (Yolande NGUEMA, DG État Civil)."
```

### Quotidien

```bash
# Convex (laisse tourner)
bun run dev:convex

# Apps Next.js (autre terminal)
bun run dev:citizen     # http://localhost:4000
bun run dev:admin       # http://localhost:4001  ← nécessite Convex actif
bun run dev:platform    # http://localhost:4002

# Ou tout en parallèle
bun run dev
```

### Comptes de démo

Pour `admin-web` (login via NIP) :

| NIP | Agent | Organisme | Rôle |
| --- | --- | --- | --- |
| `198501100001` | Yolande NGUEMA | DG État Civil | Agent instructeur |
| `197603100002` | Cyril NDONG | DG État Civil | Chef de service |
| `196812100003` | Patrice MOUSSAVOU | DG État Civil | Officier signataire |
| `198909100004` | Louis EYEGHE | DG État Civil | Agent instructeur |
| `197004100004` | Faustin MBOUMBA | DG Documentation | Admin organisme |

## Itération actuelle

- ✅ **21 écrans hi-fi** portés depuis les maquettes
- ✅ **Design system partagé** (`@workspace/ui`)
- ✅ **Navigation câblée** (Logo, Sidebar, top nav, cards, breadcrumbs)
- ✅ **Backend admin** : schema Convex, auth NIP, seed, queries A1-A9, mutations (assigner, demander pièce, transférer, signer & émettre)
- ✅ **admin-web** : middleware session + page /login + `/demandes` migrée sur Convex
- ⏳ Migration Convex des 8 autres pages admin (A1, A3-A9) — pattern posé sur `/demandes`
- ⏳ Citizen et platform restent sur mocks pour cette itération
- ⏳ Pas de responsive — largeur fixe `Frame width={1440}`

## Conventions

- **Données admin-web** : passent par `convex.query(api.xxx.yyy, { token })`. Le token vient de `getCurrentAgent()` qui lit le cookie de session signé.
- **Données citizen / platform** : encore via `@workspace/mocks/*` (à migrer dans une itération future).
- **Style** : `inline styles` préservés depuis les maquettes pour fidélité 1:1. Tokens via `@workspace/ui/tokens.css`.
- **Auth** : faux IdP NIP simulé (`auth.signInWithNip`). À remplacer par un vrai OAuth/OIDC quand l'IdP gabonais sera connecté.
- **Server components par défaut** ; `"use client"` uniquement quand `useState` / handlers DOM sont nécessaires.
