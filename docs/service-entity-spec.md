# Entité Service — spécification fonctionnelle exhaustive

> Document de réflexion préalable au Bloc 1 de `critical-flows.md`.
> Objectif : avant de coder, lister **toutes les interactions** qu'une entité Service entretient
> avec le reste du système, **tous les acteurs** qui la manipulent, et **toutes les fonctionnalités**
> attendues sur son cycle de vie complet.
>
> Une fois ce document validé, on en dérive : le modèle de données définitif, les permissions,
> les queries/mutations Convex, et les écrans UI.

---

## 0. Définition

Un **Service** = une démarche administrative qu'un **organisme** propose au catalogue Gabon Connect.

Exemples : « Acte de naissance », « Passeport biométrique », « Certificat de résidence ».

Un service possède :
- une **identité publique** (titre, description, catégorie, image, FAQ)
- des **variantes** (copie intégrale, extrait avec filiation, etc. — ADR-0005)
- des **pièces requises** par variante
- un ou plusieurs **templates de documents** générés en sortie
- un **circuit de signature** par défaut (qui signe le document délivré)
- des **règles métier** (frais, délai, public éligible, mode de délivrance)
- un **cycle de vie** (brouillon → publié → archivé) avec versionnage

---

## 1. Acteurs et leurs interactions avec un Service

### 1.1 Agent organisme (côté admin-web)

| Rôle (ADR-0006) | Interactions sur le service |
|---|---|
| `admin_organisme` | CRUD complet, publication, archivage, validation des templates |
| `chef_service` | Édition métier (frais, délai, description), création/édition variantes & pièces, **pas** de publication |
| `agent_superviseur` | Lecture seule sur la fiche service, lecture des stats |
| `agent_instructeur` | Lecture seule (sait quels services existent, ne configure rien) |
| `officier_signataire` | Lecture + édition du circuit de signature affecté à ce service |
| `admin_technique` | Configuration des intégrations (autofill API tierce, webhooks) |

### 1.2 Citoyen (côté citizen-web)

- **Consomme** la fiche publique du service
- **Démarre** un dépôt → crée une `request` rattachée à `serviceId` + optionnellement `serviceVariantId`
- **Suit** ses dépôts → `requests.serviceId` join sur `services`
- **Reçoit** un document généré par le template du service

### 1.3 Plateforme (super-admin Digitalium)

- **Supervise** le catalogue cross-org sur `/catalogue` (déjà branché)
- **Valide** lors de l'onboarding qu'un organisme a au moins 1 service publié pour basculer en `active`
- **Audit** : visibilité sur tous les changements de cycle de vie (audit log)
- **Statistiques** : agrégats nationaux par catégorie/province (déjà branché)

### 1.4 Comité métier (hors application pour l'instant)

- **Valide** les templates de documents (`documentTemplates.validatedByComite`) — pour l'instant
  case à cocher manuelle par `admin_organisme`. Plus tard : workflow de validation séparé.

---

## 2. Interactions avec les autres entités du système

```
                     ┌─────────────────────┐
                     │     organisms       │   1 organisme = N services
                     └──────────┬──────────┘
                                │ 1:N
                                ▼
                     ┌─────────────────────┐
                     │      services       │
                     └──────────┬──────────┘
                  ┌─────────────┼─────────────┐
            1:N   │             │ 1:N         │ 1:N
                  ▼             ▼             ▼
       ┌──────────────┐ ┌─────────────────┐ ┌──────────────────┐
       │serviceVariants│ │serviceRequire-  │ │documentTemplates │
       │              │ │ments             │ │(par variante)    │
       └──────┬───────┘ └─────────────────┘ └─────────┬────────┘
              │ 1:N                                    │ 1:N
              ▼                                        ▼
       ┌──────────────┐                       ┌───────────────────┐
       │   requests   │                       │documentTemplate-  │
       └──────────────┘                       │Variables          │
                                              └───────────────────┘
```

### 2.1 `services` ↔ `organisms` (N:1, obligatoire)

- Un service appartient à **un et un seul** organisme producteur (FK `services.organismId`).
- Suspension d'un organisme (`organisms.status = "suspended"`) → **tous ses services doivent
  être indisponibles** côté citoyen (filtrage dans `citizen/catalog.ts`). À confirmer / implémenter.
- Onboarding d'un organisme : on attend la création d'au moins 1 service publié pour passer en `active`.

### 2.2 `services` ↔ `serviceCategories` (N:1, recommandé)

- Catégorie pour la vitrine citoyen (8 thèmes : État civil, Documents identité, Justice, Famille, etc.).
- FK lâche par slug (`services.categorySlug → serviceCategories.slug`) — déjà en place.
- **Décision à prendre** : un service peut-il appartenir à plusieurs catégories ? (ex : « Casier judiciaire » → Justice + Documents identité). Aujourd'hui : non. Maquettes : non. → on garde 1:N.

### 2.3 `services` ↔ `serviceVariants` (1:N, recommandé)

- Une variante = un sous-cas métier d'un service (copie intégrale vs extrait, urgent vs normal).
- Chaque variante peut **surcharger** frais, délai, public éligible.
- Chaque variante a **son propre template** (`documentTemplates.serviceVariantId`).
- Un service **doit avoir au moins 1 variante** pour être publiable (la « variante par défaut » s'il n'y en a qu'une).
- ADR-0005 : la migration `services.variant` (string legacy) → `serviceVariants` est en cours.

### 2.4 `services` ↔ `serviceRequirements` (1:N)

- Pièces justificatives attendues du citoyen au dépôt.
- Aujourd'hui : `serviceRequirements.serviceId` → s'applique à toutes les variantes.
- **Question** : faut-il pouvoir définir des pièces **par variante** ? Ex : « Extrait sans filiation » ne demande pas de justificatif de filiation. → **Décision proposée** : ajouter `variantOverrides?: { variantId, required: boolean }[]` plutôt que dupliquer la table.

### 2.5 `services` ↔ `documentTemplates` (1:N via variantes)

- Un template de document est rattaché à **une variante** (pas au service directement).
- Justifie le modèle ADR-0005 : « Copie intégrale » et « Extrait avec filiation » génèrent **deux PDF différents**.
- Versionnage : `documentTemplates.version` (« v3.2 »). Plusieurs versions actives possibles ? **Décision proposée** : une seule `active` par variante, les autres en `draft` ou `deprecated`.
- Validation comité : `validatedByComite` + `validatedAt`.

### 2.6 `services` ↔ `requests` (1:N, central)

- Une demande citoyen pointe **toujours** vers un service (`requests.serviceId`).
- Et optionnellement vers une variante (`requests.serviceVariantId`) — devrait devenir obligatoire à terme.
- Stats `services.requestsLast30d` cachée + alimentée par aggregate.
- **Question rétention** : si on archive un service, que deviennent les demandes en cours ? → **Décision proposée** : impossible d'archiver tant qu'une `request` n'est pas terminée (`issued`/`rejected`/`cancelled`).

### 2.7 `services` ↔ `signatureCircuits` (indirect)

- Le service ne porte pas directement un circuit, mais sa configuration définit
  **qui sont les signataires par défaut** d'un document généré par lui.
- **Manque dans le schéma actuel** : aucun champ `defaultSignatureRoles` ni `defaultSignatureAgents` sur `services`.
- **Décision proposée** : ajouter `services.defaultSignatureCircuitTemplate?: { steps: { roleRequired: AgentRole, order: number }[] }`.

### 2.8 `services` ↔ `archives` (futur)

- Tout document délivré → règles d'archivage SAE (DUA, sort final).
- **Manque dans le schéma actuel** : aucun champ DUA/sort sur `services`.
- **Décision proposée** : ajouter `services.archivePolicy?: { dua: string, finalDisposition: FinalDisposition }`.

### 2.9 `services` ↔ `correspondences` (rare)

- Un service peut générer des correspondances inter-admin (ex : « Transcription d'acte étranger » → courrier au consulat).
- Aujourd'hui : non modélisé. Hors scope Bloc 1.

### 2.10 `services` ↔ `notifications` (déclencheurs)

- Service crée des modèles de notifications associés aux transitions de statut de la demande
  (« demande déposée », « pièce demandée », « document prêt »).
- **Question** : modèles globaux Gabon Connect, ou personnalisables par organisme/service ?
  → **Décision proposée** : globaux pour la v1, surcharge possible plus tard.

### 2.11 `services` ↔ `auditLog`

- Chaque mutation sur un service doit produire une ligne `auditLog` (`service.created`, `service.published`, `service.archived`, `service.requirement_added`, `template.activated`, etc.).
- Acteur = agent. Cible = service.

---

## 3. Cycle de vie d'un service

```
   ┌──────────┐  createService     ┌──────────┐  publishService    ┌───────────┐
   │ (vide)   │ ─────────────────► │  draft   │ ─────────────────► │ published │
   └──────────┘                    └────┬─────┘                    └─────┬─────┘
                                        │                                │
                                        │ archiveService                 │ unpublishService
                                        ▼                                ▼
                                   ┌──────────┐                    ┌──────────┐
                                   │ archived │ ◄──── archiveService│  draft   │
                                   └──────────┘                    └──────────┘
```

### 3.1 Précondition à la publication

Pour passer `draft → published`, on exige (validation côté mutation) :
- [ ] au moins 1 variante (avec `isDefault=true`)
- [ ] au moins 1 pièce requise (sauf services « sans pièce » → opt-out explicite)
- [ ] au moins 1 template de document `active` par variante
- [ ] template validé par le comité (`validatedByComite=true`)
- [ ] catégorie renseignée
- [ ] frais renseignés (peut être « Gratuit » → champ libre `fee` + `feeFcfa=0`)
- [ ] délai renseigné (`delayHours > 0`)
- [ ] description non vide
- [ ] public éligible (`whoCanApply`) non vide
- [ ] (recommandé) circuit de signature par défaut configuré

### 3.2 Précondition à l'archivage

- [ ] aucune `request` active (`status NOT IN issued, rejected, cancelled`)
- [ ] confirmation explicite (dialog avec saisie du titre du service)
- [ ] motif renseigné (champ libre + raison structurée : `replaced_by_other`, `policy_change`, `legal_obsolete`)

### 3.3 Versionnage de templates

- Un template publié peut être **modifié** → crée une nouvelle `version` en `draft`.
- L'ancienne version reste `active` jusqu'à validation comité de la nouvelle.
- Au moment de la transition : ancienne → `deprecated`, nouvelle → `active`.
- Les `requests` en cours pointent vers la version **snapshot** au moment du dépôt (déjà prévu via `documents.templateVersion`).

### 3.4 Duplication

- Bouton « Dupliquer » → crée un nouveau service en `draft` avec :
  - copie de toutes les variantes, requirements, templates (en `draft`)
  - slug suffixé `-copie-N`
  - titre suffixé « (copie) »
  - `validatedByComite=false` partout (re-validation requise)

---

## 4. Fonctionnalités attendues par écran (UI)

### 4.1 Liste `/services` (existant, à enrichir)

- Tabs statut : **Tous / Publiés / Brouillons / Archivés**
- Recherche full-text sur titre + catégorie
- Tri : demandes 30j (défaut), délai moyen, satisfaction, mise à jour
- Filtres avancés : catégorie, mode de délivrance, gratuit/payant
- Colonnes : titre, catégorie, statut, demandes 30j, délai moyen, satisfaction, coût, mise à jour
- Kebab menu par ligne :
  - Éditer
  - Dupliquer
  - Aperçu citoyen (nouvelle fenêtre)
  - Voir les demandes liées
  - Publier / Dépublier / Archiver
- Bouton header **« Créer un service »** → Dialog ou page
- Bouton header **« Dupliquer »** → quand au moins 1 ligne sélectionnée

### 4.2 Page `/services/nouveau` ou Dialog

- Étape 1 : titre, catégorie, courte description
- Étape 2 : choisir un template de service existant (« partir de zéro », « copier État civil > Acte de naissance », « importer YAML »)
- Création → redirige vers `/services/[slug]` onglet **Vue d'ensemble**

### 4.3 Page détail `/services/[slug]`

Onglets :

**Vue d'ensemble**
- Métadonnées éditables : titre, catégorie, description, public éligible, mode de délivrance, frais, délai, références légales
- Bandeau statut (draft/published/archived) + bouton de transition + bandeau « préconditions manquantes »
- Stats résumées (demandes 30j, satisfaction, délai réel vs annoncé)
- Aperçu URL publique citoyen + bouton « Aperçu citoyen »

**Variantes**
- Table avec drag-and-drop pour l'ordre
- Colonnes : label, frais override, délai override, public éligible override, défaut (radio), demandes 30j, satisfaction
- Bouton « Ajouter une variante »
- Suppression : interdite si demandes en cours

**Pièces requises**
- Table avec drag-and-drop pour l'ordre
- Colonnes : label, types acceptés (multi-select badges), required, autofill source, ordre
- Bouton « Ajouter une pièce »
- Switch « Cette pièce a-t-elle des règles par variante ? » → ouvre matrice variante × required

**Templates documents**
- Sous-onglets par variante
- Pour chaque variante : éditeur de texte riche (textarea + insertion `{{variable}}`)
- Panel latéral : liste des variables disponibles (source: request_payload, registry_entry, citizen_profile, organism_profile, system, fixed)
- Preview live PDF (rendu serveur)
- Versions historisées (v1, v2, v3) + diff
- Workflow validation comité : bouton « Soumettre à validation » → cocher après validation hors-app

**Aperçu citoyen**
- iframe sur `/services/[slug]` (citizen-web)
- Permet de voir le rendu vitrine en l'état actuel

**Stats**
- Graph demandes 30j (jour par jour)
- Top variantes
- Satisfaction (histogramme 1-5)
- Délai réel moyen par étape (dépôt → instruction → signature → délivrance)

**Circuit de signature** (futur Bloc 3)
- Définir qui signe par défaut (rôle + ordre)

**Archivage SAE** (futur Bloc 6)
- DUA + sort final + replicas

### 4.4 Page publique citoyen `/services/[slug]` (existant, à enrichir)

- Hero (titre, catégorie, délai, coût, mode)
- Section « Quel acte choisir ? » → cartes variantes (CTA radio implicite)
- Section « Pièces à fournir » avec badges autofill
- FAQ (3-5 questions, ouvertes en accordéon)
- CTA sticky « Commencer la démarche » (4 étapes · 5 min)
- « Sauvegarder pour plus tard » → crée brouillon
- Démarches connexes (liens vers autres services de l'organisme)
- Statistiques sociales (« 184 demandes ce mois »)

---

## 5. Permissions à ajouter (ADR-0006)

Nouvelles actions à câbler dans `lib/permissions.ts` :

```ts
"service.read"              // tous les rôles de l'organisme
"service.create"            // chef_service, admin_organisme
"service.update"            // chef_service, admin_organisme
"service.publish"           // admin_organisme
"service.unpublish"         // admin_organisme
"service.archive"           // admin_organisme
"service.duplicate"         // chef_service, admin_organisme
"service.variant.crud"      // chef_service, admin_organisme
"service.requirement.crud"  // chef_service, admin_organisme
"service.template.update"   // chef_service, admin_organisme
"service.template.validate" // admin_organisme (en attendant comité)
"service.template.activate" // admin_organisme
"service.read_stats"        // tous les rôles de l'organisme
```

Toutes ces actions doivent passer par `requireSameOrganism(actor, service.organismId)`.

---

## 6. Modèle de données — deltas proposés

### `services` (ajouts)

```ts
services: defineTable({
  // ... existants
  whoCanApply: v.optional(v.string()),         // déjà là
  legalReferences: v.optional(v.array(v.string())),  // déjà là

  // NOUVEAUX
  longDescription: v.optional(v.string()),     // markdown pour fiche publique
  imageStorageKey: v.optional(v.string()),     // hero image vitrine
  faqStorageKey: v.optional(v.string()),       // JSON: [{q, a}]
  archivedAt: v.optional(v.number()),
  archivedByAgentId: v.optional(v.id("agents")),
  archivedReason: v.optional(v.string()),
  archivedReasonKind: v.optional(literals("replaced_by_other", "policy_change", "legal_obsolete", "other")),
  publishedAt: v.optional(v.number()),
  publishedByAgentId: v.optional(v.id("agents")),
  defaultSignatureCircuitTemplate: v.optional(v.object({
    steps: v.array(v.object({
      roleRequired: agentRoleValidator,
      order: v.number(),
    })),
  })),
  // Note: pas de archivePolicy ici — reporté au Bloc 6 (migration à ce moment-là).
})
```

### `serviceRequirements` (ajout pour variantes)

```ts
serviceRequirements: defineTable({
  // ... existants
  variantOverrides: v.optional(v.array(v.object({
    variantId: v.id("serviceVariants"),
    required: v.boolean(),
    acceptedDocTypes: v.optional(v.array(pieceDocTypeValidator)),
  }))),
})
```

### Index supplémentaires

```ts
services.index("by_organism_updatedAt", ["organismId", "_creationTime"])  // pour tri
services.index("by_category_status", ["categorySlug", "status"])           // pour vitrine citoyen
```

---

## 7. Mutations Convex à écrire (Bloc 1)

| Mutation | Permission | Effet | Audit verb |
|---|---|---|---|
| `createService` | `service.create` | insert service `draft`, slug auto, crée 1 variante par défaut | `service.created` |
| `updateService` | `service.update` | patch champs métier (interdit `status`, `organismId`) | `service.updated` |
| `publishService` | `service.publish` | vérifie préconditions, patch `status=published`, `publishedAt`, `publishedByAgentId` | `service.published` |
| `unpublishService` | `service.unpublish` | patch `status=draft` | `service.unpublished` |
| `archiveService` | `service.archive` | vérifie aucune demande active, patch `status=archived` + champs `archived*` | `service.archived` |
| `duplicateService` | `service.duplicate` | clone service + variantes + requirements + templates en `draft` | `service.duplicated` |
| `addVariant` | `service.variant.crud` | insert serviceVariant | `service.variant_added` |
| `updateVariant` | `service.variant.crud` | patch (sauf serviceId) | `service.variant_updated` |
| `reorderVariants` | `service.variant.crud` | batch update `order` | `service.variants_reordered` |
| `setDefaultVariant` | `service.variant.crud` | passe une variante en `isDefault=true`, les autres à false | `service.default_variant_set` |
| `deleteVariant` | `service.variant.crud` | refusé si requests, sinon delete | `service.variant_deleted` |
| `addRequirement` | `service.requirement.crud` | insert serviceRequirement | `service.requirement_added` |
| `updateRequirement` | `service.requirement.crud` | patch | `service.requirement_updated` |
| `reorderRequirements` | `service.requirement.crud` | batch update `order` | `service.requirements_reordered` |
| `deleteRequirement` | `service.requirement.crud` | delete | `service.requirement_deleted` |
| `upsertTemplate` | `service.template.update` | create or new version draft | `service.template_drafted` |
| `validateTemplate` | `service.template.validate` | `validatedByComite=true` + `validatedAt=now` | `service.template_validated` |
| `activateTemplate` | `service.template.activate` | vérifie validé, passe la version en `active`, ancienne → `deprecated` | `service.template_activated` |
| `addTemplateVariable` | `service.template.update` | insert variable | `service.template_var_added` |
| `updateTemplateVariable` | `service.template.update` | patch | `service.template_var_updated` |
| `deleteTemplateVariable` | `service.template.update` | delete | `service.template_var_deleted` |

---

## 8. Queries Convex à écrire (Bloc 1)

| Query | Permission | Retourne |
|---|---|---|
| `admin.services.list` 🟢 | `service.read` | déjà existante — enrichir avec `lastUpdatedAt`, filtres |
| `admin.services.getDetail({ slug })` | `service.read` | service + variants[] + requirements[] + templates[] + stats résumées |
| `admin.services.getPublicationChecklist({ slug })` | `service.read` | `{ ready: boolean, missing: string[] }` |
| `admin.services.previewTemplate({ templateId, sampleRequestId? })` | `service.read` | rendu HTML / PDF d'un template avec données réelles ou stub |
| `admin.services.listVersions({ templateId })` | `service.read` | historique versions |
| `admin.services.listRelatedRequests({ slug })` | `service.read` + `request.read` | demandes liées (pour vue contextuelle) |

---

## 9. Server actions (Next.js) à écrire

`apps/admin-web/src/app/(app)/services/actions.ts` :

```ts
createServiceAction
updateServiceAction
publishServiceAction
unpublishServiceAction
archiveServiceAction
duplicateServiceAction
```

`apps/admin-web/src/app/(app)/services/[slug]/actions.ts` :

```ts
addVariantAction, updateVariantAction, reorderVariantsAction, setDefaultVariantAction, deleteVariantAction
addRequirementAction, updateRequirementAction, reorderRequirementsAction, deleteRequirementAction
upsertTemplateAction, validateTemplateAction, activateTemplateAction
```

Toutes au format `ActionResult { ok, message?, data? }` (cf. admin/demandes/[ref]/actions.ts).

`revalidatePath` :
- `/services` à chaque mutation
- `/services/[slug]` pour l'onglet correspondant
- `/` (dashboard) pour reflet KPI
- Citoyen : invalidation côté citizen-web sur publish/archive (via revalidateTag ?)

---

## 10. Impacts inter-app à anticiper

| App | Impact |
|---|---|
| `citizen-web` | `/services/[slug]` page publique doit refléter le nouveau modèle (variants, requirements, FAQ). À enrichir une fois Bloc 1 backend prêt. |
| `citizen-web` wizard `/demarches/nouvelle` | étape variante dynamique + étape pièces dynamique. Cf. Bloc 2. |
| `platform-web` `/catalogue` | déjà branché en lecture cross-org. Doit afficher correctement les services nouvellement créés. À retester. |
| `platform-web` `/onboarding` | bloquer la finalisation de l'onboarding tant que l'organisme n'a pas ≥1 service publié. À ajouter. |

---

## 11. Décisions verrouillées

Validées avec l'utilisateur le 2026-05-24.

1. ✅ **Pièces par variante** → modélisées via `variantOverrides[]` sur `serviceRequirements`
   (pas de duplication de table).

2. ✅ **Slug unique global** → on garde l'index `by_slug` global. `createService` doit vérifier
   l'unicité et proposer un suffixe (`-2`, `-3`…) si collision.

3. ✅ **Validation comité v1** = simple case à cocher par `admin_organisme`. Workflow réel
   (tiers validateur, commentaires, retour) → reporté.

4. ✅ **Multilangue** → reporté. Tout en français pour l'instant, pas de table `localeOverrides`.

5. ✅ **Génération PDF** → on commence par un rendu **HTML** (route Next.js, preview iframe).
   Le vrai PDF est traité au Bloc 3.

6. ✅ **Catégories** → restent plates. Pas de hiérarchie « État civil > Naissance ».

7. ✅ **Archivage SAE** → **on attend le Bloc 6**. Pas de champ `archivePolicy?` sur `services`
   maintenant. Quand on en aura besoin, on fera une migration.

---

## 12. Plan de séquencage pour le Bloc 1

1. **Schema deltas** + régénération types (`bunx convex dev`)
2. **Permissions** : étendre `lib/permissions.ts` avec les 12 nouvelles actions
3. **Mutations services** (create, update, publish, unpublish, archive, duplicate) + tests
4. **Mutations variants** + tests
5. **Mutations requirements** + tests
6. **Mutations templates** + tests
7. **Queries détail + checklist publication**
8. **UI : enrichir liste `/services`** (tabs, kebab, recherche)
9. **UI : Dialog création de service**
10. **UI : page `/services/[slug]` onglet Vue d'ensemble**
11. **UI : onglet Variantes**
12. **UI : onglet Pièces requises**
13. **UI : onglet Templates** (éditeur + preview HTML)
14. **UI : onglet Aperçu citoyen** (iframe)
15. **UI : onglet Stats** (réutilise queries demandes)
16. **Seed** : enrichir avec exemples de services en `draft` pour démo
17. **Audit RGAA** sur tous les nouveaux écrans

---

**Validation requise avant de coder** :
- [x] Les décisions en attente (section 11) sont tranchées (2026-05-24)
- [ ] Le modèle de données (deltas section 6) est OK
- [ ] La liste des permissions (section 5) est complète
- [ ] La liste des mutations (section 7) couvre les cas
- [ ] La structure des onglets (section 4.3) est validée UX
