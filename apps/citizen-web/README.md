# citizen-web

App Next.js du portail citoyen (port 4000) — vitrine publique + espace `/mon-espace` protégé par identité numérique (citoyen.ga).

## Auth — Identité Numérique Gabonaise

Auth via [better-auth](https://www.better-auth.com) + plugin [`@idn-ga/better-auth`](https://www.npmjs.com/package/@idn-ga/better-auth).

### Variables d'environnement

```env
NEXT_PUBLIC_CONVEX_URL=https://<deploy>.convex.cloud

BETTER_AUTH_SECRET=<32+ chars random>       # défault dev fourni
BETTER_AUTH_URL=http://localhost:4000        # URL publique de cette app
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:4000

IDN_CLIENT_ID=<client_id émis par identité.ga>
IDN_CLIENT_SECRET=<client_secret correspondant>

# Overrides optionnels (defaults SDK v0.2.0 = OK pour la prod IDN) :
# IDN_ISSUER=http://localhost:3004        # pour cibler un dev local Convex IDN
# IDN_DISCOVERY_URL=…/api/auth/convex/.well-known/openid-configuration
```

LoA 2 minimum via `acr_values=eidas2`. Depuis `@idn-ga/better-auth@0.2.0` les
défauts sont corrects (issuer `https://site.identite.ga`, discovery sous
`/api/auth/convex/.well-known/openid-configuration`). Override possible via
env vars si on cible un déploiement IDN différent.

### Callback URL à whitelister côté IDN

better-auth pose le callback sous `/api/auth/oauth2/callback/{providerId}` :
- Dev : `http://localhost:4000/api/auth/oauth2/callback/idn`
- Prod (futur) : `https://gabon.connect/api/auth/oauth2/callback/idn`

### Provisioning des citoyens

Politique **stricte** : pas d'auto-création. Au callback OIDC, le `sub` retourné est
recherché dans `citizens.idnSub` ; si introuvable, l'app redirige vers
`/login?reason=not-provisioned` avec un bandeau explicatif.

Pour la démo, les 5 citoyens du seed portent des `idnSub` fictifs (`idn-sandbox-marie-obame`, etc.).
Pour qu'un vrai utilisateur IDN puisse se connecter, il faut patcher la ligne `citizens`
correspondante avec son `sub` réel — via le dashboard Convex ou une mutation admin.

### Architecture

- `src/lib/auth.ts` — config better-auth server-side (plugin `genericOAuth` + helper `idn`).
- `src/lib/auth-client.ts` — client React pour `authClient.signIn.oauth2({ providerId: "idn" })`.
- `src/app/api/auth/[...all]/route.ts` — handler unique better-auth (`/api/auth/sign-in/oauth2`, `/api/auth/callback/idn`, `/api/auth/sign-out`, etc.).
- `src/middleware.ts` — gate `/mon-espace/*` sur présence du cookie better-auth.
- `src/lib/current-citizen.ts` — `requireCurrentSession()` server helper (redirige vers `/login`).
- `src/lib/convex.ts` — `ConvexHttpClient` singleton.

### Pattern de mutation

Server action :
1. `requireCurrentSession()` → récupère `idnSub` depuis la session better-auth.
2. `convex.mutation(api.citizen.<domain>.<action>, { idnSub, ... })`.
3. Convex `requireCitizen(ctx, idnSub)` lookup `citizens.idnSub` → throw si non provisionné.
4. `revalidatePath()` côté Next.js, `redirect()` si besoin.

## Démarrage

```bash
# Terminal 1 — Convex backend
bun run dev:convex

# Terminal 2 — citizen-web
bun run dev:citizen   # http://localhost:4000
```

## Tests

Voir `packages/backend/convex/citizen/mutations.test.ts` (12 tests : auth, submit, cancel, message).
