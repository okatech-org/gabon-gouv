# Déploiement — Gabon Connect

Production : **backend Convex** + **3 apps Next.js sur Google Cloud Run** (images
buildées via **Cloud Build**, orchestré par GitHub Actions `.github/workflows/deploy.yml`).

> ⚠️ Le projet GCP `gabon-diplomatie` est **partagé** avec d'autres projets de
> l'utilisateur. Tous les services Cloud Run de Gabon Connect sont donc préfixés
> **`gouv-`** et les secrets aussi (`gouv-*`) pour éviter toute collision.

## Infrastructure provisionnée

| Élément | Valeur |
| --- | --- |
| Projet GCP | `gabon-diplomatie` (n° `602661385553`) — **partagé** |
| Facturation | `Okatech Revolut` (`0104CA-696677-7F0F56`) |
| Région | `europe-west1` |
| Dépôt d'images | `europe-west1-docker.pkg.dev/gabon-diplomatie/gabon-connect` |
| SA déploiement (CI) | `gh-deploy@gabon-diplomatie.iam.gserviceaccount.com` |
| SA runtime | `gabon-connect-run@gabon-diplomatie.iam.gserviceaccount.com` |
| WIF provider | `…/workloadIdentityPools/github-pool/providers/github-gabon-gouv` (repo `okatech-org/gabon-gouv`) |
| Convex prod | `adept-frog-715` → `https://adept-frog-715.eu-west-1.convex.cloud` |

Services Cloud Run (préfixe `gouv-`) :

- `gouv-citizen-web` → `https://gouv-citizen-web-602661385553.europe-west1.run.app`
- `gouv-admin-web` → `https://gouv-admin-web-602661385553.europe-west1.run.app`
- `gouv-platform-web` → `https://gouv-platform-web-602661385553.europe-west1.run.app`

## Pipeline GitHub Actions

Sur push `main` : `changes` (path-filter) → `deploy-convex` → `deploy-{citizen,admin,platform}`
(Cloud Build + `gcloud run deploy`). Les noms de service viennent des variables
`CLOUD_RUN_SERVICE_*` (donc `gouv-*`).

### Dépendance « Convex doit passer »

Chaque app : `needs: [changes, deploy-convex]` +
`if: always() && needs.changes.outputs.<scope>=='true' && needs.deploy-convex.result != 'failure' && … != 'cancelled'`.
→ Convex échoue ⇒ **toutes les apps sont bloquées** ; Convex sauté (backend non modifié) ⇒ apps déployées.

## Variables & secrets GitHub (configurés)

Variables : `GCP_PROJECT_ID`, `GCP_REGION`, `GCP_AR_REPO`, `GCP_WIF_PROVIDER`,
`GCP_DEPLOY_SA`, `GCP_RUNTIME_SA`, `CLOUD_RUN_SERVICE_{CITIZEN,ADMIN,PLATFORM}`
(= `gouv-*`), `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_BETTER_AUTH_URL`,
`NEXT_PUBLIC_CITIZEN_WEB_URL`, `BETTER_AUTH_URL`, `CITIZEN_AUTH_ISSUER`.

Secret : `CONVEX_DEPLOY_KEY`.

## Secrets serveur (Google Secret Manager, préfixe `gouv-`)

Montés sur `gouv-citizen-web` via `--set-secrets` (clé container = clé Secret Manager) :

| Var container | Secret Manager | État |
| --- | --- | --- |
| `BETTER_AUTH_SECRET` | `gouv-BETTER_AUTH_SECRET` | ✅ généré |
| `CITIZEN_JWT_JWK` | `gouv-CITIZEN_JWT_JWK` | ✅ généré (RS256 stable) |
| `IDN_CLIENT_ID` | `gouv-IDN_CLIENT_ID` | ✅ **vrai** (depuis .env.local) |
| `IDN_CLIENT_SECRET` | `gouv-IDN_CLIENT_SECRET` | ✅ **vrai** (depuis .env.local) |

> `IDN_ISSUER` / `IDN_DISCOVERY_URL` non définis (defaults du plugin `@idn-ga/better-auth`).
> Redirect à déclarer chez identité.ga :
> `https://gouv-citizen-web-602661385553.europe-west1.run.app/api/auth/oauth2/callback/idn`.

## Auth citoyen ↔ Convex

citizen-web signe un JWT RS256 (`gouv-CITIZEN_JWT_JWK`), `iss = CITIZEN_AUTH_ISSUER`
(= URL `gouv-citizen-web`), `aud = "convex"`, JWKS sur `/.well-known/jwks.json`.
Convex (`convex/auth.config.ts`) valide via `domain = CITIZEN_AUTH_ISSUER` (env posée
sur la prod Convex) + `applicationID = "convex"`. ✅ Configuré et vérifié.

## Reste à faire

1. **Données prod Convex** : `adept-frog-715` est vierge → seeder le catalogue.
2. **Facturation Convex** : paiement d'abonnement échoué (bandeau dashboard) — régulariser.
3. **Nettoyage** : les services non préfixés `admin-web` / `platform-web` (créés par
   erreur lors du 1er essai) peuvent être supprimés ; révision `citizen-web-00322`
   (mienne, 0% trafic) sur le service `citizen-web` d'un autre projet, supprimable.
4. **Domaines personnalisés** (optionnel) : mapper via Cloud Run + mettre à jour les URLs.

## Build local (optionnel, Docker requis)

```bash
docker build --build-arg APP=citizen-web \
  --build-arg NEXT_PUBLIC_CONVEX_URL=https://adept-frog-715.eu-west-1.convex.cloud \
  -t citizen-web .
docker run --rm -p 8080:8080 -e PORT=8080 citizen-web
```
