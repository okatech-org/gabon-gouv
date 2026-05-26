# Tests E2E Playwright (Phase Trous F)

Smoke tests minimaux pour les 3 apps Next.js du monorepo.

## Setup (1ère fois)

```bash
# Installe le navigateur Chromium pour Playwright (~120 Mo)
bun playwright install chromium
```

## Exécution

Les 3 serveurs Next.js doivent tourner avant d'exécuter les tests :

```bash
# Terminal 1 : démarrer les 3 apps + Convex
bun run dev:convex      # backend Convex
bun run dev:citizen     # port 3000
bun run dev:admin       # port 3001
bun run dev:platform    # port 3002

# Terminal 2 : lancer les tests
bun run test:e2e                    # tous les smoke tests
bun run test:e2e -- --project=admin # uniquement admin
bun run test:e2e -- --headed        # avec navigateur visible
```

## Périmètre v1

Les tests v1 vérifient uniquement que les pages publiques se chargent
sans 500 et que les landmarks RGAA sont présents. Pas de scénarios
end-to-end complexes (login complet, soumission de demandes, etc.) —
ceux-ci nécessitent un seed Convex contrôlé et viendront en v2.

## Structure

- `citizen-*.spec.ts` → port 3000 (vitrine + espace citoyen)
- `admin-*.spec.ts` → port 3001 (back-office admin)
- `platform-*.spec.ts` → port 3002 (console super-admin Digitalium)

La séparation par préfixe permet à `testMatch` dans `playwright.config.ts`
de cibler le bon `baseURL` par projet.
