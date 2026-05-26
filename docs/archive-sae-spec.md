# Archivage SAE — spécification architecture hybride

> Document de référence pour le Bloc 6 de `critical-flows.md`.
> Décision : **architecture hybride** entre un archivage local minimal dans
> Gabon Connect et une future intégration avec Digitalium SAE (service
> national d'archivage souverain).
>
> Spec courte (pas de v1 maximaliste comme Bloc 5) parce que le périmètre
> local est volontairement réduit — l'archivage légal (élimination, visa
> DGAN, récolement, intégrité périodique) est délégué au SAE quand il sera
> branché.

---

## 0. Contexte et décision

### 0.1 Le constat

Trois options se présentaient :

| Option | Description | Verdict |
|---|---|---|
| **A** | Tout faire dans Gabon Connect (Bloc 6 selon spec initiale) | ❌ duplique 3-6 mois de travail déjà fait dans Digitalium SAE ; mauvaise séparation des concerns |
| **B** | Tout déléguer à Digitalium SAE via API | ❌ couplage fort à un projet « sans certitude de mise en place » ; risque inacceptable pour service public |
| **C** | Hybride : archivage local minimal + adaptateur pluggable vers Digitalium SAE | ✅ **retenue** |

### 0.2 Pourquoi C

- **Pas de pari risqué** : le SAE local fonctionne quoi qu'il arrive, le SAE national reste optionnel.
- **Pattern attendu par Digitalium SAE** : le système de connecteurs HMAC
  (`POST /api/connectors/:id/events`) est littéralement conçu pour des
  apps comme Gabon Connect.
- **Scope Bloc 6 réduit** : plus de bordereaux d'élimination, plus de visa
  DGAN, plus de cron intégrité hebdomadaire dans Gabon Connect — tout ça
  relève du SAE, pas du guichet.
- **Migration future indolore** : quand Digitalium SAE arrive, on écrit
  l'adaptateur et on bascule. Sans rien refondre.
- **Séparation des compétences** : l'archivage légal est un métier (archivistes,
  DGAN, normes archivistiques) — Gabon Connect doit rester centré sur le
  guichet citoyen + l'instruction admin.

---

## 1. Périmètre

### 1.1 Ce que Gabon Connect fait

| Capacité | Pour | Notes |
|---|---|---|
| Insertion d'une entrée `archives` à l'émission d'un acte | déjà fait au Bloc 3 (`finalizeIssuance`) | sha256 + DUA + qualifiedTimestamp |
| Insertion à l'archivage d'une corres | déjà fait au Bloc 5 (`archiveCorrespondence`) | cote `CR/REF` |
| Page de **consultation** des archives de l'organisme | nouveau Bloc 6 | recherche par cote/citoyen, filtres DUA, statut intégrité affiché (pas calculé localement) |
| **Versement effectif au SAE** via interface `SaeProvider` | nouveau Bloc 6 | local = no-op, distant = push HMAC |
| Réception **webhook** de mise à jour statut archive depuis le SAE | nouveau Bloc 6 (skeleton seulement, sans serveur SAE branché) | endpoint sécurisé, met à jour `archives.externalStatus` |

### 1.2 Ce que Gabon Connect **ne fait pas** (délégué au SAE)

- ❌ Bordereaux d'élimination (`eliminationBatches`)
- ❌ Visa DGAN sur élimination
- ❌ Exécution destruction physique
- ❌ Récolement périodique
- ❌ Vérification d'intégrité périodique (cron hebdomadaire)
- ❌ Fonds ISAD(G) hiérarchiques
- ❌ Stockage probant WORM (Gabon Connect garde son storage classique pour
  les PDF émis, le SAE rapatrie une copie + scelle)

Si l'organisme veut faire de l'archivage légal, il configure le SAE national.
Sinon, les archives restent en consultation read-only dans Gabon Connect
jusqu'à éventuelle migration future.

### 1.3 Ce que `LocalSaeProvider` fait

Implémentation no-op de l'interface (l'archive est créée dans la table
locale `archives`, c'est tout — pas de transfert physique vers ailleurs).
Suffit pour les démos, la dev, et un déploiement où le SAE national n'est
pas encore branché.

### 1.4 Ce que `DigitaliumSaeProvider` fera

Implémentation qui push les événements via connecteur HMAC (ADR-0021 de
Digitalium SAE). Voir § 4 pour le contrat d'intégration.

---

## 2. Interface `SaeProvider`

```ts
// packages/backend/convex/lib/saeProvider.ts

import type { Doc, Id } from "../_generated/dataModel"
import type { MutationCtx, QueryCtx } from "../_generated/server"

/**
 * Contrat d'un fournisseur de SAE pour Gabon Connect.
 *
 * Volontairement minimaliste : Gabon Connect ne fait que **verser** et
 * **consulter**. L'élimination, le récolement et l'intégrité sont du
 * ressort du SAE national.
 */
export interface SaeProvider {
  /**
   * Verse une entrée d'archive au SAE. L'archive locale est créée dans
   * tous les cas (idempotent via index by_linked_document). L'implémentation
   * peut en plus envoyer l'archive à un service externe et stocker un
   * `externalId` de référence.
   */
  verse(
    ctx: MutationCtx,
    args: {
      organismId: Id<"organisms">
      cote: string
      description: string
      sha256: string
      qualifiedTimestamp?: string
      duaCode: string
      duaExpiresAt?: number
      linkedDocumentId?: Id<"documents">
      linkedRequestId?: Id<"requests">
      linkedCorrespondenceId?: Id<"correspondences">
    },
  ): Promise<{ archiveId: Id<"archives">; externalId?: string }>

  /**
   * Renvoie le statut d'une archive identifiée par sa cote.
   * - Implémentation locale : lit la table `archives` directe.
   * - Implémentation distante : peut interroger le SAE pour avoir le
   *   statut authoritative (utile si le SAE a éliminé l'archive sans
   *   notifier Gabon Connect).
   */
  getStatus(
    ctx: QueryCtx,
    args: { cote: string },
  ): Promise<{ status: "active" | "destroyed" | "pending" | "unknown" } | null>

  /** Identifiant lisible du provider (pour les logs + UI). */
  readonly kind: "local" | "digitalium" | "noop"
}

/**
 * Factory : renvoie le provider configuré pour un organisme donné.
 *
 * V1 : retourne toujours `LocalSaeProvider`. Quand on aura le branchement
 * Digitalium SAE, on lira la config (`organisms.saeConfig`) pour décider :
 *   - "local" → LocalSaeProvider
 *   - "digitalium" → DigitaliumSaeProvider(creds)
 */
export async function getSaeProvider(
  ctx: QueryCtx | MutationCtx,
  organismId: Id<"organisms">,
): Promise<SaeProvider>
```

---

## 3. Schema deltas

Aucun changement bloquant. Petites additions optionnelles à `archives` pour
préparer la migration future :

```ts
archives: defineTable({
  // ... existants
  // Lien vers le SAE externe (rempli par DigitaliumSaeProvider, vide pour
  // LocalSaeProvider).
  externalSaeId: v.optional(v.string()),
  externalSaeKind: v.optional(v.string()), // "digitalium" | "vitam" | …
  // Statut authoritative remonté depuis le SAE (peut être en retard sur
  // archives.status local pendant la propagation).
  externalStatus: v.optional(v.string()),
  externalStatusUpdatedAt: v.optional(v.number()),
})
```

Et au niveau organisme :

```ts
organisms: defineTable({
  // ... existants
  saeConfig: v.optional(
    v.object({
      provider: v.union(v.literal("local"), v.literal("digitalium")),
      // Si digitalium :
      digitaliumConnectorId: v.optional(v.string()),
      // Le signing secret reste côté Convex env vars, pas en DB.
    }),
  ),
})
```

---

## 4. Contrat d'intégration `DigitaliumSaeProvider` (skeleton)

Quand Digitalium SAE sera déployé :

### 4.1 Côté Gabon Connect (push)

```http
POST {DIGITALIUM_SAE_BASE_URL}/api/connectors/{connectorId}/events
Content-Type: application/json
X-Event-Id: {uuid-idempotent}
X-Digitalium-Signature: sha256={hmac-sha256-hex}

{
  "kind": "versement",
  "organismExternalRef": "<organismId>",
  "cote": "GA/EC/2026/04812",
  "description": "Acte de naissance · OBAME Marie",
  "sha256": "abc...",
  "qualifiedTimestamp": "2026-05-26T...",
  "duaCode": "30y",
  "duaExpiresAt": 1841000000000,
  "linkedDocumentRef": "EC-LBV-2026-04812",
  "verificationCode": "GC-EC-4242"
}
```

- HMAC-SHA256 calculé sur `${eventId}.${rawBody}` avec le `signingSecret`
  du connecteur (stocké en env Convex côté Gabon Connect).
- Réponse 202 Accepted attendue → on enregistre `externalSaeId` (renvoyé
  par le SAE) sur l'`archives`.

### 4.2 Côté SAE (webhook retour vers Gabon Connect)

Endpoint à exposer plus tard :

```http
POST https://api.gabon.connect/api/sae-webhook
Content-Type: application/json
X-SAE-Signature: sha256={hmac}

{
  "kind": "archive_status_changed",
  "externalSaeId": "vrs_xxx",
  "newStatus": "destroyed",
  "destroyedAt": 1841000000000
}
```

Met à jour `archives.externalStatus`. **Pas implémenté en V1** — skeleton
seulement.

---

## 5. UI

### 5.1 Page `/archives` (refonte légère de l'existante)

Tabs : **Toutes** / **Actives** / **À surveiller** (DUA expirée mais pas
encore versée au SAE)

Pour chaque ligne :
- cote (mono)
- description (sujet)
- sha256 court
- DUA + date d'expiration calculée
- statut local (active / archived / destroyed)
- **statut externe** si présent (badge "SAE national : actif" / "SAE
  national : éliminé")
- bouton **« Voir le détail »** → page `/archives/[cote]` (consultation
  seulement)

### 5.2 Banner contextuel

Si `organisms.saeConfig` absent ou `provider === "local"` :

> ⚠️ **SAE national non configuré**. Les archives de votre organisme
> restent dans Gabon Connect en consultation uniquement. L'élimination,
> le récolement et l'intégrité périodique nécessitent le SAE national.
> [Configurer le SAE →]

(Le bouton mène vers `/parametres/sae` qui sera implémentée quand le SAE
sera réellement branchable — pour v1, lien désactivé avec tooltip
« Disponible quand le SAE national sera déployé ».)

### 5.3 Page de détail `/archives/[cote]`

Lecture seule. Affiche :
- Tous les champs (cote, description, dates, dua, sort, sha256, qualified
  timestamp)
- Documents liés (lien vers `/demandes/[ref]` si linkedRequestId)
- Statut externe + dernière mise à jour si présent
- Historique audit (entries d'audit log pour cette cote)

---

## 6. Mutations / Queries

| Endpoint | Type | Effet |
|---|---|---|
| `admin.archives.listForOrg({ scope?, search?, limit? })` | Query | Liste les archives de l'organisme, filtres scope (`all`/`active`/`dua_expired`) + search sur cote/description |
| `admin.archives.getDetail({ cote })` | Query | Détail complet d'une archive |
| `admin.archives.getStats` | Query | { total, active, archived, duaExpired } pour badges page |
| `admin.archives.verse({ ... })` | Mutation | Wrap de `getSaeProvider(orgId).verse(...)`. Permission `archive.verse` |

La mutation `verseToSAE` existante (Bloc 3) est conservée et refactorée
pour passer par `getSaeProvider`.

---

## 7. Plan d'implémentation

### Phase 1 — Backend
1. Créer `lib/saeProvider.ts` avec interface + LocalSaeProvider + factory
2. Ajouter (optionnel) les champs `externalSaeId`, `externalStatus` à
   `archives` et `saeConfig` à `organisms` (en optional pour rétrocompat)
3. Créer `admin/archives.ts` avec listForOrg + getDetail + getStats
4. Refactorer la mutation existante `verseToSAE` (Bloc 3) pour passer par
   le provider (pour l'instant ça revient à `LocalSaeProvider.verse`)

### Phase 2 — UI
1. Refondre la page `/archives` (existait en mockup) :
   - tabs scopes
   - search bar
   - banner "SAE national pas connecté"
   - liste avec colonnes finalisées
2. Créer page `/archives/[cote]` consultation
3. Pas de page `/archives/bordereaux/*` (hors scope Bloc 6 Option C)

### Phase 3 — Tests + clôture
1. Tests LocalSaeProvider (verse idempotent, getStatus)
2. Tests `admin/archives.*` queries
3. Mise à jour `critical-flows.md` Bloc 6

### Phase 4 — Futur (quand Digitalium SAE arrive)
1. Implémenter `DigitaliumSaeProvider` (push HMAC)
2. Page `/parametres/sae` pour configurer le connecteur
3. Webhook receiver `/api/sae-webhook`
4. Migration des archives locales existantes vers SAE (script one-shot)

---

## 8. Décisions techniques

1. ✅ **Pas d'enrichissement schema massif** : les champs `externalSaeId`,
   `externalStatus`, `saeConfig` sont **optionnels** et ne cassent rien.
2. ✅ **`getSaeProvider` est async** : permet de lire la config dynamique
   par organisme sans bloquer l'interface.
3. ✅ **L'archive locale est toujours créée**, même quand le SAE distant
   est branché. C'est un index local de référence + audit cross-app.
4. ✅ **Pas de retry interne** pour les push HMAC v1 : le SAE de Digitalium
   gère son propre retry / dead-letter côté serveur (ADR-0021).
5. ✅ **Pas d'authentification croisée v1** : pour l'instant Gabon Connect
   est un connecteur HMAC standard, pas un client OIDC du SAE.

---

**Validation requise avant de coder** :
- [x] Option C retenue par l'utilisateur (2026-05-26)
- [x] Interface SaeProvider validée
- [x] Périmètre Bloc 6 réduit à la consultation + verse pluggable
