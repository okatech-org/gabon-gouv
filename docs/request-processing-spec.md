# Traitement d'une demande — spécification fonctionnelle exhaustive

> Document de réflexion préalable au Bloc 3 de `critical-flows.md`.
> Pendant : `service-entity-spec.md` (Bloc 1) côté catalogue.
>
> Objectif : avant de coder, lister **toutes les transitions d'état d'une demande**,
> **tous les acteurs** qui agissent dessus, **toutes les sous-entités** créées
> au passage (pièces, vérifications, circuits, documents, archives), et **tous
> les manques** à combler pour qu'une demande puisse aller de `submitted` à
> `issued` avec un vrai PDF téléchargeable par le citoyen.
>
> Une fois validé : on dérive les mutations à compléter, les queries à créer,
> et les écrans UI à brancher.

---

## 0. Définition et périmètre

Une **demande** = un dossier instruit par un organisme, qui aboutit (si tout
va bien) à un **document délivré** au citoyen.

Cycle métier nominal :

```
submitted → in_instruction → (waiting_pieces ⇄ in_instruction) → prepared
       → to_sign → (circuit signature) → issued
```

Cycle d'échec possible à n'importe quelle étape :

```
… → rejected     (motif structuré + libre)
… → cancelled    (citoyen retire — non couvert ici)
```

Hors scope de ce document :
- **Création de la demande** côté citoyen → couvert par Bloc 2 (déjà fait).
- **Vérification publique du document** par QR/code → Bloc 4 (spec à venir).
- **Archivage SAE** au sens DUA/élimination → Bloc 6. *Note transitoire :
  aujourd'hui `signAndIssue` crée déjà une entrée `archives`, il faudra
  décider qui porte la responsabilité (cf. § 11).*

---

## 1. Acteurs et leurs interactions

### 1.1 Agent organisme (côté admin-web)

| Rôle (ADR-0006) | Interactions sur une demande |
|---|---|
| `agent_instructeur` | Lit, valide/rejette les pièces, ajoute des vérifs manuelles, écrit la note interne, demande une pièce complémentaire au citoyen, prépare le document. Ne signe pas. |
| `agent_superviseur` | Lecture seule. Voit la queue, peut consulter mais pas agir. (À clarifier : peut-il assigner ?) |
| `chef_service` | Tout ce que fait l'instructeur + assigner, transférer, valider l'étape « chef » du circuit, rejeter la demande. |
| `officier_signataire` | Reçoit les demandes au statut `to_sign`, approuve/refuse son étape du circuit, déclenche l'émission finale. |
| `admin_organisme` | Tout, et accès au bouton « rejeter » et « émission directe » (raccourci sans circuit pour services simples — à décider § 11). |
| `admin_technique` | Lecture seule pour debug ; ne touche pas au métier. |

### 1.2 Citoyen (côté citizen-web)

- **Voit** son statut en temps réel (subscription Convex) sur `/mon-espace/demandes/[ref]`.
- **Reçoit** des notifications à chaque transition (canal email/push/SMS — Bloc Notifications).
- **Répond** aux demandes de pièces complémentaires (re-upload).
- **Lit** les messages de l'agent et y répond (déjà branché — `requestMessages`).
- **Télécharge** le PDF émis et y trouve son code de vérification + QR.

### 1.3 Plateforme (super-admin Digitalium)

- **Pas d'action métier** sur une demande individuelle.
- **Voit** les agrégats nationaux (déjà branché).
- **Audit** : visibilité globale des transitions critiques (issued, rejected, revoked).

### 1.4 Comité métier / DGAN

- **Pas d'intervention** sur une demande individuelle au Bloc 3.
- Interventions au Bloc 6 (bordereaux d'élimination).

---

## 2. Interactions avec les autres entités

```
                  ┌─────────────────────┐
                  │      requests       │ ← Bloc 2 (déjà branché)
                  └──────────┬──────────┘
              ┌──────────────┼──────────────┬──────────────┐
              ▼              ▼              ▼              ▼
    ┌──────────────┐ ┌──────────────┐ ┌────────────┐ ┌──────────────┐
    │    pieces    │ │verifications │ │requestEvts │ │requestMessages│
    │  (uploaded)  │ │  (auto+manu) │ │ (timeline) │ │ (citoyen↔ag) │
    └──────┬───────┘ └──────────────┘ └────────────┘ └──────────────┘
           │ par requirementId
           ▼
    ┌──────────────┐
    │serviceRequire│ → règles d'origine
    └──────────────┘

    À signAndIssue/prepareDocument :
                  │
                  ▼
       ┌─────────────────────┐
       │      documents      │
       └──────────┬──────────┘
                  │ par signatureCircuitId
                  ▼
       ┌─────────────────────┐
       │ signatureCircuits   │
       └──────────┬──────────┘
                  │ 1:N
                  ▼
       ┌─────────────────────┐
       │signatureCircuitSteps│
       └─────────────────────┘
```

### 2.1 `requests` ↔ `pieces` (1:N central)

- Toute pièce uploadée par le citoyen porte `requirementId` (template d'origine).
- L'agent décide pièce par pièce : `validated` ou `rejected` (avec motif).
- Quand toutes les `required` pieces passent en `validated` → la demande
  **devrait** quitter `waiting_pieces` automatiquement (déjà géré dans
  `validatePiece`).
- **Manque** : aucune UI agent pour cliquer valider/rejeter (mutations OK,
  boutons absents). Et le viewer PDF/image est inerte.

### 2.2 `requests` ↔ `verifications` (1:N)

- Vérifications **automatiques** : identité IDN, doublon, OCR cohérence,
  match registre (kinds enum déjà prêts).
- Vérifications **manuelles** : l'instructeur peut en ajouter (« visite
  domiciliaire faite »).
- **Manque** : aucune mutation `addVerification` / `setVerificationStatus`.
  Aujourd'hui les vérifs n'existent que via seed.
- **Décision proposée** : pour v1, on génère un set de vérifs **stub** à
  `submitRequest` (identity = ok automatique si IDN sub présent, autres en
  `pending`). Mutation `setVerificationStatus(verificationId, status, evidence?)`
  pour bascule manuelle. Aucune intégration tierce.

### 2.3 `requests` ↔ `requestEvents` (1:N, timeline)

- Déjà branché. Chaque mutation insère un event (sauf `updateInternalNote`
  par choix de discrétion).
- **À ajouter** : events pour `validatePiece` et `rejectPiece` (déjà fait),
  `setVerificationStatus`, `approveSignatureStep`, `refuseSignatureStep`
  (à vérifier — buildés dans `lib/signatureCircuit.ts`), `issueDocument`,
  `revokeDocument`.

### 2.4 `requests` ↔ `requestMessages` (1:N)

- Déjà branché (ADR-0010). `sendMessageToCitizen` existe. Pas d'évolution
  attendue au Bloc 3.

### 2.5 `requests` ↔ `documents` (1:1 en nominal, 1:0 si rejected)

- Une demande émise produit **un** document. Si refondu (révocation +
  ré-émission), nouveaux `documents` sont créés (l'ancien reste `revoked`).
- `documents.requestId` (FK obligatoire).
- **Manques** :
  - `pdfStorageKey` jamais rempli (rendu PDF inexistant).
  - `sha256` aujourd'hui aléatoire dans `signAndIssue`. Doit être calculé
    sur les bytes du PDF.
  - `templateId` + `templateVersion` jamais remplis. Doivent être snapshot
    au moment de la génération.
  - `verificationCode` rempli par `prepareDocument` mais **pas** par
    `signAndIssue` (incohérence à résoudre).
  - `status` enum (`draft`/`prepared`/`signed`/`issued`/`revoked`) jamais
    patché par `signAndIssue` (qui passe direct du néant à un doc « émis »
    sans status).

### 2.6 `requests` ↔ `signatureCircuits` (0..1)

- Aujourd'hui : `prepareDocument` crée un circuit pour le document, mais
  `signAndIssue` court-circuite (un seul appel = émission directe sans
  passage par le circuit).
- **Question canonique** (§ 11) : on tranche pour un seul flow, ou on garde
  les deux ?
- **Décision proposée** : conserver les deux *avec un sens clair* :
  - `prepareDocument` → ouvre le circuit (instructeur a déjà validé sa
    propre étape implicitement, on attend chef + officier).
  - `signAndIssue` devient **réservé au cas « service à signature simple »**
    (config `services.defaultSignatureCircuitTemplate` vide ou 1 étape).
    Pour un service multi-étapes, l'UI n'affiche pas le bouton "signer
    direct" ; on doit passer par prepare + circuit.
  - L'**émission finale** (= patch `request.status=issued` + génération PDF +
    notif citoyen) est encapsulée dans un helper `finalizeIssuance(ctx, docId)`
    appelé soit par `signAndIssue`, soit par `approveSignatureStep` quand le
    circuit termine sur la dernière étape.

### 2.7 `requests` ↔ `archives` (1:1 si issued)

- Aujourd'hui : `signAndIssue` crée une entrée `archives` automatiquement.
- **Décision proposée pour Bloc 3** : on **garde** ce comportement (auto
  archive à issued), mais on documente que le **versement réel SAE** (DUA,
  bordereaux, élimination) est Bloc 6. L'entrée créée à Bloc 3 est juste un
  squelette `status=active` avec sha256.

### 2.8 `requests` ↔ `notifications` (futur — pas dans Bloc 3)

- À chaque transition critique : `submitted`, `waiting_pieces`, `to_sign`,
  `issued`, `rejected` → notification au citoyen.
- **Hors scope Bloc 3** (provider à choisir). On insère seulement les
  `notifications` côté DB ; l'envoi réel attendra.

---

## 3. Cycle de vie d'une demande — diagramme détaillé

```
                                  rejectRequest(motif)
                          ┌───────────────────────────────┐
                          ▼                               │
   submitted ──assignRequest──▶ in_instruction ◄──┐       │
       │                              │            │       │
       │                              │ requestPiece (chaque pièce manquante)
       │                              ▼            │       │
       │                       waiting_pieces      │       │
       │                              │ (toutes pieces validées) │       │
       │                              └────────────┘       │
       │                              │                       │
       │                              ▼ prepareDocument       │
       │                          prepared (= document existe, circuit ouvert)
       │                              │                       │
       │                              ▼                       │
       │                          to_sign                     │
       │                              │                       │
       │                              ▼ dernière approveStep  │
       │                          issued ──┐                  │
       │                                   │                  │
       │                                   ├─▶ création doc │
       │                                   ├─▶ génération PDF │
       │                                   ├─▶ entrée archive │
       │                                   └─▶ notif citoyen  │
       │                                                       │
       └──────────────────────────────────────────────────────┘
```

### 3.1 Précondition à `prepareDocument`

- Toutes les pièces `required` au statut `validated` (déjà checké).
- Toutes les `verifications` au statut `ok` ou `not_applicable` (à ajouter).
- Le service a au moins 1 template `active` pour la variante choisie (à checker).
- Un chef de service et un officier signataire de l'organisme existent
  (à checker dans la mutation).

### 3.2 Précondition à `signAndIssue` (raccourci 1 étape)

- Même check pièces + vérifs.
- Service configuré avec `defaultSignatureCircuitTemplate` vide ou 1 étape
  (= pas de circuit multi-niveaux).
- L'agent appelant a `role IN (officier_signataire, admin_organisme)`.

### 3.3 Émission finale — atomique

Quel que soit le chemin (prepare→circuit ou signAndIssue direct), l'émission
finale doit :

1. Générer le PDF (template + payload demande + données citoyen).
2. Calculer `sha256` sur les bytes du PDF.
3. Stocker le PDF (`ctx.storage.store`) → `pdfStorageKey`.
4. Demander un horodatage qualifié (RFC 3161 ou stub) → `qualifiedTimestamp`.
5. Générer un `verificationCode` court (format `GC-XX-NNNN`, vérif unicité).
6. Patcher `documents` : `status=issued`, `pdfStorageKey`, `sha256`,
   `verificationCode`, `qualifiedTimestamp`, `issuedAt`, `templateId`,
   `templateVersion` (snapshot).
7. Patcher `requests` : `status=issued`, `progressPct=100`, `issuedAt`.
8. Insérer `requestEvents` kind=`signature` puis `delivery`.
9. Insérer `archives` (squelette Bloc 3, complétion Bloc 6).
10. Insérer `notifications` pour le citoyen (envoi réel = futur).

### 3.4 Révocation (Bloc 4 — hors scope)

`revokeDocument(documentId, reason)` patche `documents.status=revoked` +
`revokedAt` + `revocationReason`. Ne touche pas à la demande (qui reste
`issued` historiquement). Crée un `requestEvents` kind=`status_change`.

---

## 4. Fonctionnalités attendues par écran

### 4.1 Liste `/demandes` (existant, à enrichir)

- Tabs statut : Toutes / À traiter (in_instruction) / En attente pièces
  (waiting_pieces) / À signer (to_sign) / Émises / Refusées
- Filtre `assigned` : toutes / mes dossiers / non assignées
- Recherche : ref, NIP, nom citoyen, service
- Colonnes : ref, citoyen, service, déposée, échéance, agent, statut,
  pièces (`validated/total`)
- **Manques** : aucun bouton d'action en bulk pour l'instant ; gardé en
  hors-scope.

### 4.2 Page détail `/demandes/[ref]` (existant, à enrichir massivement)

Layout actuel : 2 colonnes, principal à gauche (timeline + pièces + note),
sidebar à droite (citoyen + actions).

**À ajouter / brancher** :

- **Pièces** : sur chaque ligne, deux boutons :
  - « Voir » → ouvre Dialog modal avec iframe PDF (via `ctx.storage.getUrl`)
    ou `<img>` pour les types image. Bouton « Télécharger » dans le Dialog.
  - Si statut = `uploaded` : boutons « Valider » + « Rejeter » (Dialog
    motif pour reject). Calling `validatePiece` / `rejectPiece`.
  - Si statut = `validated` ou `rejected` : badge + lecture seule.
  - Si statut = `missing` : juste « Demandée le … ».
- **OCR / type détecté** : si `ocrConfidence` < 80% → badge orange « OCR à
  vérifier ». Si `detectedDocType` ≠ template attendu → badge rouge « Type
  inattendu ». (Aujourd'hui ces champs ne sont jamais remplis → on bosse
  en mode "stub" : tous les uploads ont `ocrConfidence=null`, OK.)
- **Picker d'assignation** : combobox sur agents de l'organisme.
  Calling `assignRequest`. Quand non-assigné, gros bouton « M'assigner ».
- **Vérifications** : panel dédié sous la timeline avec liste des `verifications`
  ordonnées. Pour les statuts `pending`, bouton « Marquer OK » / « Marquer KO ».
- **Circuit signature** : panel uniquement visible si `request.status IN
  (prepared, to_sign)`. Affiche les steps avec :
  - n° + rôle requis + agent assigné (snapshot)
  - statut (pending / current / approved / refused)
  - timestamp décision + commentaire
  - si current step = agent connecté : boutons « Approuver » / « Refuser »
- **Préparer l'acte** : bouton visible si `request.status = in_instruction`
  ET pièces+vérifs OK. Ouvre Dialog avec sélection chef + officier.
  Calling `prepareDocument`. Après succès → switch panel circuit visible.
- **Signer & émettre (direct)** : visible uniquement si configuration
  service le permet (cf. § 3.2). Reste tel quel.
- **Notifications temps-réel** : via subscription Convex sur `requests` →
  toast « Mise à jour : pièce validée par X » + badge sidebar.

### 4.3 Page `/signatures` (à créer)

- Tabs : « À approuver (moi) » / « Mes décisions récentes »
- Liste : carte par circuit step en attente, montre la demande liée,
  le doc à signer (preview iframe PDF), action approve / refuse +
  champ commentaire.
- Query backend nouvelle : `listMySignatures(token, scope?: "pending"|"recent")`.

### 4.4 Page `/generation/[ref]` (existant — à refondre)

Aujourd'hui : éditeur de template visuel (mocké).

**Choix** : on **garde l'esprit preview**, mais on **utilise les données
réelles** :

- Charge le template `active` de la variante choisie (déjà en DB).
- Charge les données : payload demande, profil citoyen, snapshot organisme.
- Substitue `{{variables}}` → rendu HTML.
- Bouton « Aperçu PDF » → action server qui appelle le renderer PDF et
  renvoie le blob (juste pour visu, sans persistence).
- Bouton « Signer et émettre » → appelle la mutation finale (cf. § 3.3).

Cette page devient le **dernier checkpoint** avant émission : l'agent voit
le PDF qui sera émis, vérifie, signe.

### 4.5 Page citoyen `/mon-espace/demandes/[ref]` (existant — à enrichir)

- Bouton « Télécharger le PDF » fonctionnel (storage getUrl, type
  `application/pdf`, `download` attribute).
- Bloc « Vérifier l'authenticité » → lien vers `/verifier/[code]` (Bloc 4).
- Subscription temps-réel sur le statut (toast à chaque transition).

---

## 5. Permissions à ajouter / vérifier (ADR-0006)

Actions existantes (à vérifier câblage) :

```ts
"piece.validate"           // chef_service, agent_instructeur, admin_organisme
"piece.reject"             // idem
"request.reject"           // chef_service, admin_organisme
"document.prepare"         // chef_service, agent_instructeur, admin_organisme
"correspondence.send"      // existe
```

Nouvelles actions à câbler :

```ts
"verification.update"      // agent_instructeur, chef_service, admin_organisme
"request.assign"           // chef_service, admin_organisme (et "me" pour tous ?)
"signature.approve"        // dépend du step, vérifié à l'assignee
"signature.refuse"         // idem
"document.issue"           // officier_signataire, admin_organisme
"document.revoke"          // admin_organisme (Bloc 4)
```

`signature.approve/refuse` est **dynamique** : on vérifie que l'agent
appelant est l'`assigneeAgentId` du step `current`, pas un rôle statique.

---

## 6. Modèle de données — deltas proposés

### `requests` (rien à ajouter au Bloc 3)

Le schema existant suffit.

### `documents` (rien à ajouter — tout existe)

- `pdfStorageKey` ✅ déjà optional dans le schema
- `verificationCode` ✅ déjà optional
- `templateId` / `templateVersion` ✅ déjà optionals
- `status` ✅ enum complet

Mais **toutes les mutations doivent les remplir systématiquement** (audit
de cohérence à faire).

### `pieces` (rien à ajouter)

`ocrConfidence` / `detectedDocType` / `ocrExtractedFields` déjà prêts pour
quand on branchera l'OCR.

### `verifications` (rien à ajouter)

Tous les champs nécessaires existent. Il faut juste les mutations.

### `services` — ajout optionnel

```ts
services.defaultSignatureCircuitTemplate?: {
  steps: { roleRequired: AgentRole, order: number }[]
}
```

Déjà proposé dans `service-entity-spec.md` § 6. À ajouter ici **si pas
encore fait** (à vérifier). Utile pour driver `prepareDocument` sans avoir
à demander à l'agent les chef+officier à chaque fois.

### Index supplémentaires

```ts
signatureCircuitSteps.index("by_assignee_status", ["assigneeAgentId", "status"])
// déjà présent — utilisé pour listMySignatures
```

---

## 7. Mutations Convex à écrire ou refondre (Bloc 3)

| Mutation | Statut actuel | À faire |
|---|---|---|
| `assignRequest` | ✅ existe | Ajouter audit log (aujourd'hui juste requestEvents). Vérifier permission `request.assign`. |
| `validatePiece` | ✅ existe | OK, ajouter audit log. |
| `rejectPiece` | ✅ existe | OK, ajouter audit log. |
| `requestPiece` | ✅ existe | OK. |
| `rejectRequest` | ✅ existe | OK. |
| `setVerificationStatus` | 🔴 à créer | `(verificationId, status, evidence?)`. Permission `verification.update`. |
| `addVerification` | 🔴 à créer (optionnel v1) | Pour vérifs manuelles ajoutées par l'instructeur. |
| `prepareDocument` | 🟡 existe | Refondre : utiliser le `defaultSignatureCircuitTemplate` du service au lieu d'exiger chef+officier en args. Remplir `templateId`/`templateVersion`/`verificationCode`. |
| `signAndIssue` | 🟡 existe | Refondre : ne plus créer le sha256 random, appeler `finalizeIssuance` (cf. § 3.3). Strict sur préconditions. |
| `approveSignatureStep` | ✅ existe | À auditer : doit appeler `finalizeIssuance` si c'était la dernière étape. |
| `refuseSignatureStep` | ✅ existe | OK, mais doit aussi patcher `request.status=rejected` ? À décider (probablement back to `in_instruction` + insert event + ne pas finaliser). |
| `finalizeIssuance` (helper interne) | 🔴 à créer | Logique commune § 3.3, appelée par signAndIssue et par dernière approveSignatureStep. |
| `revokeDocument` | 🔴 à créer (Bloc 4) | Hors scope Bloc 3 — mentionné pour mémoire. |

---

## 8. Queries Convex à écrire ou refondre

| Query | Statut | À faire |
|---|---|---|
| `admin.requests.listQueue` | ✅ existe | OK, possiblement enrichir filtre par `dueAt`. |
| `admin.requests.getInstruction` | ✅ existe | **Enrichir** : retourner aussi les `pieces.storageKey` (pour viewer) et la liste `documents` rattachés (s'il en existe) + le `signatureCircuit` actif avec ses steps. |
| `admin.requests.getPieceViewUrl` | 🔴 à créer | `(pieceId)` → URL signée Convex `ctx.storage.getUrl`. Vérifie permission organisme. |
| `admin.signatures.listMine` | 🔴 à créer | `(scope?: "pending" | "recent")` → liste des `signatureCircuitSteps` assignées à moi, avec subject (document) et request liée. |
| `admin.documents.getPdfUrl` | 🔴 à créer | `(documentId)` → URL signée pour le PDF émis. |
| `citizen.requests.getPdfUrl` | 🔴 à créer | Idem, version citoyen (vérifie ownership). |

---

## 9. Server actions (Next.js) à écrire ou compléter

`apps/admin-web/src/app/(app)/demandes/[ref]/actions.ts` (existe, à enrichir) :

```ts
validatePieceAction(pieceId)
rejectPieceAction(pieceId, reason)
assignRequestAction(ref, agentId?)   // refondre : sélecteur agent
setVerificationStatusAction(verificationId, status, evidence?)
prepareDocumentAction(ref)           // signature simplifiée si template service
approveSignatureStepAction(circuitId, comment?)
refuseSignatureStepAction(circuitId, comment)
```

`apps/admin-web/src/app/(app)/signatures/actions.ts` (à créer) :

```ts
approveSignatureAction(circuitId, comment?)
refuseSignatureAction(circuitId, comment)
```

`apps/citizen-web/src/app/mon-espace/demandes/[ref]/actions.ts` (à créer) :

```ts
getDocumentDownloadUrlAction(documentId)  // server action qui appelle getPdfUrl
```

---

## 10. Génération PDF — décision technique

Trois options évaluées :

| Option | Avantages | Inconvénients |
|---|---|---|
| **A. jsPDF côté Convex action V8** | Simple, pas d'infra externe, dans la transaction. | Mauvais rendu typographique. Pas de support polices custom faciles. Layout limité (positionnement absolu). Difficile pour les actes administratifs avec en-têtes officiels, signatures embarquées, etc. |
| **B. Convex action Node + @react-pdf/renderer** | Bonne qualité de rendu (React → PDF), pas d'infra externe, polices custom OK. Idiomatique React. | Lourd (50+ MB de deps Node). Démarrage Convex Node plus lent. Mais probablement OK. |
| **C. Microservice puppeteer/playwright externe** | Rendu pixel-perfect (HTML→PDF), peut utiliser tout le CSS. | Infra à déployer ailleurs. Sécurité (rendu d'HTML externe). Surcoût. |

**Décision proposée : option B** (`@react-pdf/renderer` dans une Convex
action Node). Les templates sont définis en composants React-PDF par
variante (mappés sur les `documentTemplates` qui contiennent le HTML/markdown
de base, mais le rendu final passe par un composant). Si plus tard on
veut du WYSIWYG → option C en remplacement.

**Conséquences** :
- Activer Convex Node runtime (action séparée, pas V8).
- Créer `convex/lib/pdfRenderer.ts` (action Node).
- Mapper chaque `service.slug + variant.key` à un composant React-PDF.
- Pour v1, on peut faire UN composant générique « acte officiel » avec
  en-tête tricolore + payload templated. Granularité par service au fur
  et à mesure.

---

## 11. Décisions verrouillées

Validées avec l'utilisateur le 2026-05-26.

1. ✅ **Cycle canonique** : on garde **les deux** chemins (`signAndIssue`
   raccourci ET `prepareDocument` + circuit) avec sémantique claire :
   - `signAndIssue` réservé aux services à signature simple
     (`services.defaultSignatureCircuitTemplate` vide ou 1 étape).
   - Services multi-étapes : passage obligé par `prepareDocument` +
     `approveSignatureStep` jusqu'à la dernière qui déclenche
     `finalizeIssuance`.

2. ✅ **`finalizeIssuance` crée une entrée `archives` squelette** :
   `status=active`, sha256 calculé, complétion (DUA, sort final, bordereaux)
   au Bloc 6.

3. ✅ **`refuseSignatureStep`** : retour à `in_instruction` + insert
   `requestEvents` + notification au chef. Pas direct à `rejected`
   (laissé à l'instructeur via `rejectRequest`).

4. ✅ **Horodatage qualifié RFC 3161** : stub `new Date().toISOString()`
   pour v1, helper `signQualifiedTimestamp(bytes)` extrait pour brancher
   un TSA réel plus tard (Convex action Node).

5. ✅ **OCR / `detectedDocType`** : stub. Champs schema laissés vides,
   badges UI conditionnés à `ocrConfidence != null` (jamais affichés v1).

6. ✅ **Notifications** : insertion en table `notifications` dès Bloc 3
   pour chaque transition critique (submitted, waiting_pieces, to_sign,
   issued, rejected). **Envoi réel** (email/SMS/push) = Bloc à part.

7. ✅ **Vérifications stub à `submitRequest`** : insertion automatique
   d'un set fixe (identity = `ok` si IDN sub présent, data_consistency = `pending`,
   duplicate_detection = `pending`). Permet à l'UI agent d'avoir du contenu.

8. ✅ **Page `/signatures`** : codée dès Bloc 3. Sans elle, l'officier
   signataire n'a pas d'écran d'entrée pour son travail.

### Décisions techniques additionnelles

9. ✅ **Renderer PDF** : `@react-pdf/renderer` dans une Convex action
   Node (option B § 10). Composant générique « acte officiel » v1 pour
   tous les services, granularité par service plus tard.

---

## 12. Plan de séquencage pour le Bloc 3

1. **Schema** : vérifier `services.defaultSignatureCircuitTemplate` (ajouter
   si absent) — sinon rien à faire.
2. **Permissions** : ajouter les 4 nouvelles actions dans `lib/permissions.ts`.
3. **Refonte `signAndIssue` + `approveSignatureStep`** : extraire
   `finalizeIssuance` helper. Remplir tous les champs `documents.*`.
4. **Refonte `prepareDocument`** : utiliser le template circuit du service.
5. **Mutations vérifications** : `setVerificationStatus` (+ stub à submit).
6. **Query `getInstruction` enrichie** : pieces storageKey, documents,
   circuit actif.
7. **Query `getPieceViewUrl` / `getPdfUrl`** : URLs signées storage.
8. **Query `listMySignatures`**.
9. **Action PDF** : Convex action Node + `@react-pdf/renderer`, composant
   générique « acte officiel » v1.
10. **Tests backend** : couvrir le flow complet `submitted → issued` via
    les deux chemins (raccourci + circuit). Cibler 100% des nouvelles
    mutations. Objectif 150+ tests verts.
11. **UI page demande** : viewer pièces (Dialog + iframe), boutons
    valider/rejeter par pièce, picker assignation, panel vérifs, panel
    circuit.
12. **UI page `/signatures`** : liste « en attente » + preview + actions.
13. **UI page `/generation/[ref]` refondue** : preview HTML/PDF des
    données réelles, bouton signer-et-émettre.
14. **UI citoyen** : bouton télécharger PDF fonctionnel + bandeau « vérifier
    l'authenticité » (placeholder pour Bloc 4).
15. **Notifications** : insertion dans table `notifications` à chaque
    transition (envoi reporté).
16. **Audit RGAA** : Dialogs (focus trap), buttons (libellés explicites),
    viewer PDF (alternative texte / `aria-label`), radios circuit.

---

**Validation requise avant de coder** :
- [ ] Les décisions § 11 sont tranchées
- [ ] Le choix de génération PDF (§ 10) est confirmé
- [ ] La structure de page détail demande (§ 4.2) est validée UX
- [ ] La création d'une page `/signatures` séparée vs intégration en panel
      sur `/demandes/[ref]` est validée
