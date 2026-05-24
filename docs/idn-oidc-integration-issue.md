# OIDC discovery endpoint manquant sur identité.ga — bloque l'intégration `@idn-ga/better-auth`

**À l'attention** : équipe identité.ga (ANINF)
**De** : équipe Gabon Connect (Digitalium)
**Date** : 2026-05-24
**Sévérité** : bloquant pour la mise en service du portail citoyen

> **MAJ 2026-05-24 (après échange avec ANINF)** : confirmation que l'endpoint
> attendu est `https://site.identite.ga/api/auth/.well-known/openid-configuration`
> (Convex sépare API `api.*` et HTTP actions `site.*`). Endpoint **toujours
> 404** (`No matching routes found`) au moment de la mise à jour — déploiement
> en attente. Override posé dans `lib/auth.ts` côté Gabon Connect. Une release
> `@idn-ga/better-auth` v0.2 avec le bon `DEFAULT_ISSUER` est annoncée cette
> semaine.

## Résumé en une phrase

On a câblé Identité Numérique Gabonaise comme provider OIDC dans Gabon Connect via le plugin officiel `@idn-ga/better-auth` v0.1.1, mais **aucun host public d'identité.ga n'expose `/.well-known/openid-configuration`** — le flow OAuth ne peut pas démarrer.

## Contexte

Le portail citoyen Gabon Connect (`apps/citizen-web`, Next.js 15) doit s'authentifier via citoyen.ga. On suit la doc officielle [developers.identite.ga/docs/quickstart-better-auth](https://developers.identite.ga/docs/quickstart-better-auth) :

```ts
// apps/citizen-web/src/lib/auth.ts
import { betterAuth } from "better-auth"
import { genericOAuth } from "better-auth/plugins"
import { idn } from "@idn-ga/better-auth"

export const auth = betterAuth({
  plugins: [
    genericOAuth({
      config: [
        idn({
          clientId: process.env.IDN_CLIENT_ID!,        // gabon-gouv-Mosmiw
          clientSecret: process.env.IDN_CLIENT_SECRET!, // idn_sk_…
          acrValues: ["eidas2"],
          scopes: ["openid", "profile", "email"],
        }),
      ],
    }),
  ],
})
```

Côté client, le bouton de connexion appelle :

```ts
authClient.signIn.oauth2({ providerId: "idn", callbackURL: "/mon-espace" })
```

## Symptôme observé

`POST /api/auth/sign-in/oauth2` répond :

```json
{ "code": "INVALID_OAUTH_CONFIGURATION", "message": "Invalid OAuth configuration" }
```

Cause : better-auth ne peut pas charger le document OpenID Connect Discovery du provider.

## Diagnostic — ce qu'on a probé

### 1. Le plugin calcule le discovery URL ainsi

```ts
// node_modules/@idn-ga/better-auth/dist/index.js:24
var DEFAULT_ISSUER = "https://identite.ga"
const issuer = (options.issuer ?? DEFAULT_ISSUER).replace(/\/+$/, "")
const discoveryUrl = options.discoveryUrl ?? `${issuer}/.well-known/openid-configuration`
```

### 2. État actuel des hosts identité.ga (testé le 2026-05-24)

| Host | Path | Statut | Notes |
|---|---|---|---|
| `https://identite.ga` | `/` | 200 | Site vitrine Next.js |
| `https://identite.ga` | `/.well-known/openid-configuration` | **404** | Pas de serveur OIDC ici |
| `https://identite.ga` | `/api/auth/.well-known/openid-configuration` | **404** | Idem |
| `https://api.identite.ga` | `/` | 200 | `This Convex deployment is running.` |
| `https://api.identite.ga` | `/api/auth/.well-known/openid-configuration` | **404** | **Plugin pas (encore) actif** |
| `https://api.identite.ga` | `/api/auth/.well-known/jwks.json` | **404** | Idem |
| `https://auth.identite.ga` | `/.well-known/openid-configuration` | NXDOMAIN | Sous-domaine inexistant |
| `https://oidc.identite.ga` | `/.well-known/openid-configuration` | NXDOMAIN | Idem |

Les headers de `api.identite.ga` confirment que c'est un déploiement Convex actif :

```
HTTP/2 200
convex-usher: usher
via: 1.1 Caddy
server: cloudflare
```

### 3. Le code IDN déclare bien le routeur

Dans `identite.ga/packages/backend/convex/http.ts` :

```ts
const AUTH_PATH = "/api/auth"

// Le plugin `oidcProvider` de better-auth/plugins expose automatiquement
// ses routes sous `/api/auth/oauth2/*` (authorize, token, callback) et
// le discovery sous `/api/auth/.well-known/openid-configuration`.
http.route({ pathPrefix: `${AUTH_PATH}/`, method: "GET", handler: authRequestHandler })
http.route({ pathPrefix: `${AUTH_PATH}/`, method: "POST", handler: authRequestHandler })
```

Le code est correct. Donc :
- soit le déploiement Convex sur `api.identite.ga` n'est pas à jour avec cette version
- soit le plugin `oidcProvider` n'est pas (encore) activé dans `auth.ts` côté backend IDN
- soit il y a un problème d'enregistrement de route en prod

## Ce dont on a besoin

### Minimum vital

Exposer **`https://api.identite.ga/api/auth/.well-known/openid-configuration`** servant le document JSON standard OIDC, par exemple :

```json
{
  "issuer": "https://api.identite.ga",
  "authorization_endpoint": "https://api.identite.ga/api/auth/oauth2/authorize",
  "token_endpoint": "https://api.identite.ga/api/auth/oauth2/token",
  "userinfo_endpoint": "https://api.identite.ga/api/auth/oauth2/userinfo",
  "jwks_uri": "https://api.identite.ga/api/auth/.well-known/jwks.json",
  "response_types_supported": ["code"],
  "subject_types_supported": ["public"],
  "id_token_signing_alg_values_supported": ["RS256"],
  "scopes_supported": ["openid", "profile", "email"],
  "acr_values_supported": ["eidas1", "eidas2", "eidas3"],
  "claims_supported": ["sub", "email", "email_verified", "name", "given_name", "family_name", "birthdate", "nationality", "acr", "loa", "profile_type"]
}
```

Concrètement, vérifier que dans `packages/backend/convex/auth.ts` côté IDN :
- `oidcProvider({ ... })` est bien dans `plugins: []`
- le déploiement Convex prod est à jour avec le code qui contient ce plugin
- la route `/api/auth/*` est bien enregistrée dans `http.ts` (elle l'est dans le source actuel)

### Bonus — alignement avec la doc

La doc `developers.identite.ga/docs/quickstart-better-auth` et le defaultIssuer du plugin npm (`@idn-ga/better-auth`) pointent tous deux sur `https://identite.ga` (le site vitrine), pas sur `https://api.identite.ga` (l'API Convex). À aligner :

**Option A** — recommandée : updater le plugin npm pour que `DEFAULT_ISSUER = "https://api.identite.ga"`. Une release v0.2 transparente pour les consommateurs.

**Option B** — laisser le défaut sur `https://identite.ga` et configurer un reverse-proxy / rewrite Cloudflare qui forward `identite.ga/api/auth/*` vers `api.identite.ga/api/auth/*`. Pratique pour préserver l'apparence "même domaine" mais ajoute une dépendance infra.

**Option C** — documenter explicitement dans `quickstart-better-auth` qu'il faut override `issuer: "https://api.identite.ga"`. Le moins propre mais le plus rapide à mettre en place.

### Confirmation des claims sandbox

Quand l'endpoint sera live, on a besoin que les claims retournés par `/api/auth/oauth2/userinfo` matchent la doc `IDNUser` (`/docs/core-api`) :

```ts
interface IDNUser {
  sub: string
  email: string
  email_verified: boolean
  name?: string
  given_name?: string
  family_name?: string
  birthdate?: string
  nationality?: string
  profile_type?: "citizen" | "resident" | "visitor" | "developer"
  acr?: "eidas1" | "eidas2" | "eidas3"
  loa?: 1 | 2 | 3
}
```

En particulier, on s'appuie sur `sub` comme identifiant stable côté Gabon Connect (champ `citizens.idnSub` en base, index `by_idn_sub`).

## Workaround actuel côté Gabon Connect

En attendant, on a posé l'override d'issuer dans `lib/auth.ts` pour pointer directement sur `api.identite.ga` :

```ts
idn({
  clientId: process.env.IDN_CLIENT_ID!,
  clientSecret: process.env.IDN_CLIENT_SECRET!,
  issuer: process.env.IDN_ISSUER ?? "https://api.identite.ga",
  discoveryUrl:
    process.env.IDN_DISCOVERY_URL ??
    "https://api.identite.ga/api/auth/.well-known/openid-configuration",
  acrValues: ["eidas2"],
  scopes: ["openid", "profile", "email"],
})
```

Comme ça, dès que le discovery endpoint répondra 200, le flow OIDC fonctionnera sans nouveau déploiement chez nous.

## Creds en cours d'usage (sandbox)

- `IDN_CLIENT_ID=gabon-gouv-Mosmiw`
- `IDN_CLIENT_SECRET=idn_sk_LrTnoeiasJrI88cYm_…` (fournis par votre équipe)

Si on doit ré-enregistrer le client pour un autre issuer (cf. options ci-dessus), on remplacera.

## Callback URL à autoriser

Notre app appelle l'IDP avec ce `redirect_uri` :

```
http://localhost:4000/api/auth/callback/idn    # dev
https://gabon.connect/api/auth/callback/idn    # prod (futur, sous réserve domaine)
```

Merci de vérifier que ces deux URLs sont bien dans la liste des `redirect_uris` autorisées pour `gabon-gouv-Mosmiw`.

## Contact

Berny — `iasted@me.com` — Digitalium / Gabon Connect.
