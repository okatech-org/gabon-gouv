# Entité Correspondance — spécification fonctionnelle exhaustive

> Document de réflexion préalable au Bloc 5 de `critical-flows.md`.
> Précédents du même modèle : [`service-entity-spec.md`](./service-entity-spec.md)
> (Bloc 1), [`request-processing-spec.md`](./request-processing-spec.md) (Bloc 3).
>
> **Approche** : maximaliste. On vise une implémentation complète du
> périmètre de la correspondance administrative (5 types d'acteurs,
> 6 familles de types, S/MIME, AR formel, threads cross-corres, archivage
> DUA spécifique). Pas de v1 minimaliste. Les maquettes existantes
> (`designs/project/screens/admin.jsx:652-828`) sont une référence visuelle
> mais ne contraignent pas le scope : on ajoute les écrans qui manquent.
>
> Une fois validé : on en dérive le schéma définitif, les permissions, les
> mutations/queries Convex, les écrans UI, et la grille de tests.

---

## 0. Définition

Une **correspondance administrative** = un écrit officiel qui engage
l'administration (ou l'agent qui le signe ès qualités), adressé à un
destinataire identifié, et qui s'inscrit dans une chaîne traçable
entre entités.

Elle se distingue de toutes les autres formes de communication par 4
propriétés cumulatives :

1. **Signature institutionnelle** d'une entité (pas un message anonyme).
2. **Référence unique** opposable et citable (format `CR-AAAA-NNNNN`).
3. **Finalité opérationnelle déclarée** (transmettre une décision, demander
   une pièce, attester d'un fait, coopérer).
4. **Régie par des règles** : confidentialité, délais de réponse, voies de
   recours, archivage, langue, format.

> **Image mentale** : la correspondance est le **système nerveux écrit** de
> l'administration. Les notifications informent (jetables, sans valeur
> juridique propre), les `requestMessages` (Bloc 3) sont internes à
> l'instruction d'une demande, mais c'est la correspondance qui fait
> avancer les dossiers **entre acteurs distincts** quand le canal direct ne
> suffit plus.

### 0.1 Ce que la correspondance n'est **pas**

| Pas une… | Parce que… |
|---|---|
| **Notification** | Unilatérale, jetable, sans valeur juridique propre. |
| **Conversation 1:1 citoyen↔agent** (`requestMessages`) | Vit à l'intérieur d'une demande, c'est de l'instruction. |
| **Demande de service** | Portée par un citoyen ; la corres est portée par un agent ès qualités. |
| **Email** | L'email est un canal de transport ; la corres est un objet métier qui peut emprunter divers canaux. |
| **Acte administratif** (arrêté, acte de naissance) | L'acte produit du droit ; la corres le véhicule, l'annonce, le complète. |

---

## 1. Acteurs et leurs interactions

### 1.1 Les 5 types d'interactions couverts (v1 maximaliste)

| # | Émetteur → Récepteur | Exemple | Spécificités |
|---|---|---|---|
| **A** | **Org → Org** | DG ÉC demande à DG Documentation une copie de passeport | Cas central. Multi-destinataires (To/CC/BCC). |
| **B** | **Org → Citoyen** (formelle, hors notif) | Convocation pour audition d'authenticité, décision motivée de rejet | Entité distincte des `notifications`. Citoyen peut répondre. |
| **C** | **Citoyen → Org** | Réclamation formelle, demande gracieuse, contestation | Génère un dossier de réclamation. Peut sans-demande sous-jacente. |
| **D** | **Org → Plateforme/Tutelle** | Saisine DGAN pour litige, demande d'arbitrage | Escalade. Le destinataire est l'organisme DGAN (rôle `platform_admin`). |
| **E** | **Org → externe non-administration** | Notaire, huissier, ambassade étrangère, juridiction internationale | Récepteur = `externalParties` (nouvelle table, voir § 6.3). |

### 1.2 Rôles agents (ADR-0006) et capacités

| Rôle | Interactions sur une corres |
|---|---|
| `agent_instructeur` | Crée brouillon, joint PJ, soumet pour validation (peut envoyer si circuit 1 étape) |
| `agent_superviseur` | Lecture seule + AR au nom de l'organisme |
| `chef_service` | Tout instructeur + valide étape « chef » du circuit + peut envoyer sans circuit pour corres de coopération basique |
| `officier_signataire` | Visa final du circuit pour décisions / instructions à valeur engageante |
| `admin_organisme` | Tout, + gestion modèles de lettres, + annulation/rappel de corres envoyée |
| `admin_technique` | Lecture seule pour debug |
| `platform_admin` | Lecture cross-org sur les saisines DGAN, modération |

### 1.3 Côté citoyen (citizen-web)

- **Reçoit** les corres org→citoyen sur une nouvelle page `/mon-espace/courriers/`
- **Peut répondre** à une corres org→citoyen (réponse = nouveau message dans le thread, signé par le citoyen via IDN)
- **Peut initier** une corres citoyen→org (page « Écrire à une administration »)
- **Accuse réception** explicitement (AR ≠ ouverture)
- **Voit** le thread complet avec horodatage, signatures, PJ

### 1.4 Comité métier / DGAN

- **Modère** les saisines (type D) en lecture
- **Hors scope v1** : workflow de décision sur saisine

---

## 2. Interactions avec les autres entités

```
                  ┌──────────────────────────┐
                  │    organisms / citizens  │
                  │    / externalParties     │   N émetteurs / N récepteurs
                  └────────────┬─────────────┘
                               │
                               ▼
                  ┌──────────────────────────┐
                  │     correspondences      │   référencée par CR-AAAA-NNNNN
                  └────────────┬─────────────┘
                               │
        ┌──────────┬───────────┼───────────┬──────────┬─────────────┐
        ▼          ▼           ▼           ▼          ▼             ▼
  ┌──────────┐┌──────────┐┌──────────┐┌─────────┐┌──────────┐┌────────────┐
  │recipients││ messages ││  reads   ││  acks   ││attachments││signature   │
  │(To/CC/BCC│          ││ (par ag) ││(formels)││           ││Circuits    │
  └──────────┘└──────────┘└──────────┘└─────────┘└──────────┘└────────────┘
                                                                  │
                                                                  ▼
                                                          ┌────────────────┐
                                                          │signatureCircuit│
                                                          │ Steps (Bloc 3) │
                                                          └────────────────┘

   Liens optionnels :
   - threadId    → autres correspondances de la même chaîne (parent/enfants)
   - linkedRequestIds[]   → demandes liées (multi)
   - linkedCitizenIds[]   → citoyens liés (multi)
   - linkedDocumentIds[]  → actes liés (multi)
   - linkedCorrespondenceIds[]  → autres corres référencées dans le corps
```

### 2.1 `correspondences` ↔ `organisms` / `citizens` / `externalParties`

- **Émetteur** : `senderKind` (`organism|citizen|external|platform`) + `senderId` (id polymorphe)
- **Destinataires** : table `correspondenceRecipients` (N-N polymorphe avec rôle `to|cc|bcc`)
- L'émetteur N'est PAS dans `correspondenceRecipients` (pas auto-CC).

### 2.2 `correspondences` ↔ `signatureCircuits` (Bloc 3 réutilisé)

- Le circuit est ouvert avant l'envoi pour les types qui le nécessitent
  (décision, instruction engageante, saisine).
- Type `instruction` simple ou `coopération` informelle → envoi direct sans
  circuit (selon le `kind` ET le service, voir § 4).
- `signatureCircuits.subjectKind = "correspondence"` (déjà supporté).
- Quand le circuit termine, l'envoi est déclenché automatiquement
  (`onCircuitCompleted` → patch `correspondences.status = sent`).

### 2.3 `correspondences` ↔ `correspondenceMessages` (1:N, le thread interne)

- Une corres = un objet métier ; les **messages** qu'elle contient sont les
  échanges au sein de cette corres (l'aller initial + les réponses dans le
  cadre de la même référence).
- Le 1er message est celui rédigé par l'émetteur de la corres.
- Les suivants sont les réponses des destinataires (ou de l'émetteur qui
  relance).

### 2.4 `correspondences` ↔ autres `correspondences` (thread cross-corres)

- Une corres peut **référencer une autre corres** (parent_ref), créant un
  thread étendu (ex. corres B est la réponse formelle à corres A clôturée).
- Indexé via `threadId` (UUID partagé par toutes les corres d'une même
  chaîne) + `parentCorrespondenceId` (corres directe parente).
- L'UI affiche : « Cette correspondance fait partie d'un échange de 4
  courriers depuis le 12/03/2026 » avec lien vers la racine du thread.

### 2.5 `correspondences` ↔ `correspondenceRecipients` (1:N)

- Une entrée par destinataire (To/CC/BCC).
- Polymorphe : peut pointer vers `organisms`, `citizens`, `externalParties`,
  ou un « rôle » virtuel (ex. « tous les agents officier_signataire de la
  Mairie X »).
- Tracks per-recipient : `acknowledgedAt`, `acknowledgedByAgentId`.

### 2.6 `correspondences` ↔ `correspondenceReads` (1:N par agent)

- Inchangé vs existant. Track l'ouverture (lecture) d'une corres par un
  agent donné, indépendamment de l'AR formel.
- L'AR (`correspondenceAcks`) est une **action explicite distincte**.

### 2.7 `correspondences` ↔ `correspondenceAttachments` (1:N, table dédiée)

- Refactor de `attachmentStorageKeys` (array inline) vers table.
- Champs : `attachmentId`, `correspondenceId`, `messageId?` (PJ ajoutée
  dans une réponse au lieu du courrier initial), `filename`, `mimeType`,
  `sizeBytes`, `storageKey`, `sha256` (calculé à l'upload), `signed`
  (S/MIME au niveau PJ), `kind` (`document` si lien vers un acte officiel,
  `external` sinon), `linkedDocumentId?` (FK si la PJ est un acte émis).
- Hérite du niveau de confidentialité de la corres (peut être plus
  restrictif via `confidentiality?` override).

### 2.8 `correspondences` ↔ `correspondenceAcks` (1:N — AR formels)

- **Nouvelle table** : enregistre les accusés de réception **explicites**
  (cliquer sur « Accuser réception »), distincts de l'ouverture passive.
- Champs : `correspondenceId`, `recipientId` (polymorphe), `ackedByAgentId?`
  (qui a cliqué — pour les org-recipients), `ackedAt`, `note?` (texte
  libre, ex. « bien reçu, traitement sous 5 jours »).
- Conditionne le démarrage de certains délais légaux (ex. délai de recours
  contre une décision = 60 jours **à l'AR**, pas à l'envoi).

### 2.9 `correspondences` ↔ `requests` / `citizens` / `documents` (multi liens)

- Refactor de `linkedRequestId` (singulier) vers `linkedRequestIds` (array).
- Idem pour `linkedCitizenIds` (multi), `linkedDocumentIds` (multi).
- Pour la v1, on accepte aussi de garder les champs singuliers pour
  rétrocompat (linkedRequestId, linkedCitizenId) et on ajoute les arrays
  en `extraLinkedRequestIds`, etc. — voir § 6 schema deltas.

### 2.10 `correspondences` ↔ `notifications` (déclencheurs)

- L'arrivée d'une corres dans la boîte du destinataire déclenche une
  notification (kind `correspondence_received`, severity warning si urgent).
- Pour les org-recipients : notif à **tous les agents de l'organisme** dont
  le rôle est compatible (agent_superviseur+) — pas à tout l'org.
- Pour les citizen-recipients : notif au citoyen propriétaire.
- Pour les external-recipients : email externe via provider (Bloc futur).

### 2.11 `correspondences` ↔ `archives` (DUA spécifique)

- Une corres est **archivable au SAE** (Bloc 6) avec sa propre DUA, distincte
  de celle de l'acte qu'elle accompagne éventuellement.
- DUAs typiques (à confirmer avec DGAN) :
  - corres d'instruction → 5 ans
  - corres de décision → 30 ans
  - corres de coopération → 2 ans
  - corres de saisine → 50 ans
  - corres de gestion (circulaires) → indéfini
  - corres de protocole → 1 an
- Trigger : à la clôture d'une corres (status=`closed`) OU à un cron mensuel
  pour les corres restées `sent` au-delà de leur délai de garde.

### 2.12 `correspondences` ↔ `auditLog`

- Chaque mutation produit un audit log (verb `correspondence.created`,
  `.sent`, `.acked`, `.replied`, `.recalled`, `.archived`, etc.) avec
  acteur (agent ou citoyen) et cible (corres).

---

## 3. Cycle de vie d'une correspondance

### 3.1 États possibles

```
   ┌─────────┐                                       ┌──────────┐
   │ (vide)  │ ─── createDraft ───►                  │ recalled │  rappel
   └─────────┘                                       └──────────┘
       │                                                  ▲
       ▼                                                  │ (admin only)
   ┌─────────┐                                            │
   │  draft  │ ─── soumitForSig ───►┐                     │
   └─────────┘                      ▼                     │
       │                       ┌─────────────┐            │
       │                       │pendingSign  │ ─►         │
       │                       └─────────────┘  approbation│
       │                                                  │
       │ ── send (si pas circuit) ─►┐                     │
       │                            ▼                     │
       │                       ┌─────────┐                │
       └──────────────────────►│  sent   │────────────────┤
                               └────┬────┘                │
                                    │ recipient ack       │
                                    ▼                     │
                               ┌─────────────┐            │
                               │acknowledged │            │
                               └─────────────┘            │
                                    │ recipient reply     │
                                    ▼                     │
                               ┌─────────┐                │
                               │ replied │                │
                               └────┬────┘                │
                                    │ closeManually OR    │
                                    │ inactif > N jours   │
                                    ▼                     │
                               ┌─────────┐                │
                               │ closed  │────────────────┘
                               └────┬────┘
                                    │ DUA atteinte
                                    ▼
                               ┌──────────┐
                               │ archived │
                               └──────────┘
```

### 3.2 États enum proposés (refonte vs existant)

```ts
correspondenceStatuses: [
  "draft",            // brouillon (existait)
  "pending_signature",// dans un circuit signature ouvert (refonte de "pending_validation")
  "sent",             // envoyée (existait)
  "acknowledged",     // AR formel reçu (NOUVEAU)
  "replied",          // au moins une réponse reçue (existait)
  "closed",           // clôturée (existait)
  "archived",         // versée au SAE (existait)
  "recalled",         // rappelée par l'expéditeur (NOUVEAU, admin only)
]
```

### 3.3 Préconditions à chaque transition

| Transition | Préconditions |
|---|---|
| `createDraft` | Permission `correspondence.create`. Au moins 1 destinataire valide. |
| `submitForSignature` | Sujet + corps non vides. ≥1 destinataire. Si type décision/saisine : ≥1 PJ obligatoire (configurable par `kind`). Circuit défini (par défaut ou explicite). |
| `send` (raccourci sans circuit) | Le type le permet (`coopération`, `instruction_simple`, `protocole`). L'agent a la permission directe (`correspondence.send_direct`). |
| `acknowledge` | Recipient principal (To) OU l'un des CC. Bouton sur la page corres. |
| `reply` | Le récepteur a un agent dans son organisme (org-receiver) ou est le citoyen propriétaire (citizen-receiver). |
| `close` | Manuel par admin_organisme OU automatique après N jours sans activité (cron). |
| `recall` | Admin only, **avant** le 1er AR. Insère un message système et notifie destinataires. |
| `archive` | DUA atteinte OU bouton manuel après `closed`. Crée entrée `archives`. |

### 3.4 Workflow d'envoi avec circuit

```
   draft → soumitForSignature → pending_signature
                                       │
            ┌──────────────────────────┼──────────────────────────┐
            ▼                          ▼                          ▼
       step 1 (instructeur)       step 2 (chef)              step 3 (officier)
       approve                    approve                    approve
                                                                  │
                                                                  ▼
                                                              circuit completed
                                                                  │
                                                                  ▼
                                                              onCircuitCompleted →
                                                              patch status=sent,
                                                              déclenche envoi
                                                              + notifs destinataires
```

Refus à n'importe quelle étape → `draft` + commentaire dans la timeline +
notif au préparateur.

### 3.5 Rappel (`recall`)

- Réservé à l'**émetteur** organisme (admin_organisme uniquement) ET
  **avant** le 1er AR formel reçu.
- Effet :
  - patch `correspondences.status=recalled`
  - insert message système dans le thread (« Correspondance rappelée par X
    le date pour motif Y »)
  - notif à tous les destinataires (kind `correspondence_recalled`)
  - les PJ restent visibles (audit) mais marquées « invalide »

### 3.6 Clôture automatique

- Cron mensuel : toute corres `sent`/`acknowledged`/`replied` sans activité
  depuis 90 jours passe en `closed` avec mention « clôturée automatiquement
  pour inactivité ». Configurable par `kind` (les saisines restent ouvertes
  plus longtemps).

---

## 4. Types et classification (les 6 familles)

### 4.1 Enum `correspondenceKind`

```ts
correspondenceKinds: [
  // 1. Instruction (liée à un dossier en cours)
  "instruction_request",       // demande d'élément (pièce, info, avis)
  "instruction_transmission",  // transmission de pièces pour avis
  "instruction_response",      // réponse à une demande d'instruction
  // 2. Décision (ouvre des délais de recours)
  "decision_grant",            // décision favorable motivée
  "decision_reject",           // décision défavorable motivée (recours)
  "decision_suspend",          // suspension
  // 3. Coopération (sans demande sous-jacente obligatoire)
  "cooperation_info_share",    // partage d'information
  "cooperation_data_request",  // demande d'accès à un registre/donnée
  "cooperation_fraud_alert",   // alerte fraude
  // 4. Saisine / escalade
  "escalation_tutelle",        // saisine de la tutelle
  "escalation_dispute",        // transmission d'un litige
  "escalation_incident",       // rapport d'incident
  // 5. Gestion interne (circulaires, lettres de cadrage)
  "internal_circular",         // circulaire (destinataire = N organismes)
  "internal_service_note",     // note de service
  // 6. Protocole
  "protocol_greeting",         // vœux, félicitations
  "protocol_condolences",      // condoléances
  // 7. Autre (fallback)
  "other",
]
```

### 4.2 Règles par `kind`

| `kind` | Circuit obligatoire ? | PJ obligatoire ? | DUA défaut | Délai AR (jours) | Délai réponse |
|---|---|---|---|---|---|
| `instruction_*` | non | non | 5 ans | 7 | 30 |
| `decision_*` | **oui** (chef+officier) | oui | 30 ans | 7 | — (notification) |
| `cooperation_*` | non | non | 2 ans | 14 | 30 |
| `escalation_*` | **oui** (chef+admin+officier+DGAN) | oui | 50 ans | 3 | 14 |
| `internal_*` | non | non | indéfini | — | — |
| `protocol_*` | non | non | 1 an | — | — |
| `other` | au choix | non | 5 ans | 14 | 30 |

Ces règles sont **stockées dans une table de référence** `correspondenceKindRules`
plutôt que codées en dur, pour qu'un admin technique puisse les ajuster.

### 4.3 Templates de corres par kind

- Table `correspondenceTemplates` (similaire à `documentTemplates`) :
  `(kind, slug, title, bodyTemplate, requiredFields[], variantOverrides?)`
- Variables dans le template : `{{recipient.name}}`, `{{linkedRequest.ref}}`,
  `{{linkedCitizen.name}}`, etc.
- L'admin technique peut créer/éditer les templates depuis `/parametres/correspondance`.
- Page `/correspondance/nouveau` propose les templates filtrés par `kind` choisi.

---

## 5. Fonctionnalités par écran (UI exhaustive)

### 5.1 Page principale `/correspondance` (refonte de l'écran actuel)

Layout 3 colonnes (comme la maquette) MAIS enrichi :

**Colonne 1 — Liste** :
- Search avec opérateurs avancés (`from:DGI urgent:true`)
- Tabs principaux : **Reçus / Envoyés / Brouillons / Archivés** + compteurs
- Sous-tabs sur "Reçus" : « **À traiter** (sans AR) » / « **Sans réponse** (AR fait, > délai) » / « **Tous** »
- Items avec : sender, sujet, ref, date, dot unread, urgent, count PJ, badge `kind` (couleur par famille), badge confidentialité (lock icon)
- Sélection multiple (bulk archive, bulk close)

**Colonne 2 — Thread complet** :
- Header : titre + ref + badge `kind` + urgence + confidentialité + délai restant + count participants
- Boutons header : AR (si pas encore fait), Répondre, Transférer, Archiver, Plus (rappeler, imprimer, télécharger PDF complet)
- Si thread cross-corres : bandeau « Fait partie d'un échange de N courriers » + lien
- Messages : chaque message avec avatar, expéditeur (org + agent), pour (To/CC/BCC explicite), badge S/MIME, corps HTML, PJ
- **Suggestion IA** (préservée de la maquette, branchée sur l'assistant)
- Composer en bas : textarea + select destinataires (par défaut « répondre à expéditeur ») + PJ + boutons Brouillon/Envoyer (+ « Demander visa » si circuit)

**Colonne 3 — Métadonnées** :
- Circuit de signature (si applicable) — réutilise composant Bloc 3
- Destinataires : liste To / CC / BCC avec statut per-recipient (AR ✓, lu uniquement, pas ouvert)
- Dossiers rattachés : citoyens + demandes + actes (multi-liens cliquables)
- Métadonnées : référence, kind, confidentialité, échéance AR/réponse, archivage DUA
- Historique audit : créé par / soumis le / envoyé le / 1er AR / dernière activité / clôturé le

### 5.2 Page `/correspondance/[ref]` (URL deep-link)

- Identique à 5.1 mais ouverte directement sur le thread sans dépendre de la liste
- Permet le partage d'URL entre agents

### 5.3 Page `/correspondance/nouveau`

- Wizard 3 étapes :
  1. **Type** : sélection du `kind` parmi les 6 familles (cartes visuelles)
  2. **Destinataires** :
     - Picker To (obligatoire, 1 destinataire principal)
     - Picker CC (multi)
     - Picker BCC (multi)
     - Picker types : organisme / citoyen (par NIP ou nom) / externe (texte libre + email)
     - Pour les internal_circular : sélection multi-organismes (cases à cocher)
     - Lien optionnel : « À propos de la demande / du citoyen / de l'acte »
  3. **Rédaction** :
     - Choix template (filtré par `kind`) ou texte libre
     - Sujet, corps (rich text léger ou markdown)
     - Confidentialité (default selon kind), urgent
     - Délai souhaité (override du défaut kind)
     - Pièces jointes (drag-drop, max 10 fichiers ou 25 Mo)
     - Aperçu avant envoi
- Bouton « Enregistrer brouillon » à tout moment, autosave debounced 3 s

### 5.4 Page `/correspondance/templates` (admin technique)

- Liste des templates par kind
- Éditeur de template avec variables (similaire à `documentTemplates`)
- Test de rendu avec données stub

### 5.5 Page `/correspondance/saisines` (sous-vue)

- Filtre dédié aux corres type `escalation_*` reçues ou envoyées par mon org
- Statut visa DGAN (si applicable)
- Workflow d'arbitrage (Bloc futur, juste l'affichage v1)

### 5.6 Page citoyen `/mon-espace/courriers/`

- **Boîte de réception citoyenne** des corres org→citoyen formelles
- Liste avec sender (organisme), sujet, ref, date, badge `kind`
- Click → thread complet (composant partagé avec admin, en lecture seule + bouton « Répondre » + « Accuser réception »)
- Bouton header « Écrire à une administration »

### 5.7 Page citoyen `/mon-espace/courriers/nouveau`

- Wizard simplifié pour citoyen→org :
  - Choix de l'administration destinataire (picker org)
  - Type de demande (réclamation / contestation / demande gracieuse / question)
  - Sujet, corps
  - PJ optionnelles (10 max, 10 Mo)
  - Signature implicite via session IDN

### 5.8 Composant partagé : ThreadView

- Composant React réutilisé entre admin et citoyen
- Props : `correspondence`, `messages`, `viewerRole: "agent"|"citizen"`,
  `actions: { canReply, canAck, canRecall, canArchive }`
- Rendu sémantique avec `<article>` + `<header>` + `<time>` pour chaque message

### 5.9 Badge sidebar

- Nombre de corres reçues non lues OU sans AR par mon agent
- Mise à jour live via subscription Convex

---

## 6. Permissions à ajouter (ADR-0006)

### 6.1 Refonte des permissions existantes

```ts
// Existantes (à conserver, sémantique précisée)
"correspondence.read"              // tous les agents (corres de l'org)
"correspondence.send"              // agent_instructeur+ (brouillon + soumission circuit)
"correspondence.sign_smime"        // agent_instructeur+ (signe un message)

// NOUVELLES
"correspondence.create"            // créer un brouillon (agent_instructeur+)
"correspondence.send_direct"       // envoyer sans circuit (chef_service+ pour kind autorisé)
"correspondence.acknowledge"       // accuser réception (tout agent de l'org receveur)
"correspondence.reply"             // répondre (tout agent de l'org receveur)
"correspondence.recall"            // rappeler (admin_organisme uniquement)
"correspondence.archive"           // archiver manuellement (chef_service+)
"correspondence.close"             // clôturer (chef_service+)
"correspondence.template.crud"     // gérer templates (admin_technique)
"correspondence.escalate"          // créer escalation_* (admin_organisme)
"correspondence.platform_read"     // lire toutes les escalations (platform_admin)
```

### 6.2 Côté citoyen

```ts
"correspondence.citizen.read"      // lire ses corres reçues (citoyen)
"correspondence.citizen.send"      // créer une corres citoyen→org
"correspondence.citizen.reply"     // répondre à une corres org→citoyen
"correspondence.citizen.acknowledge" // accuser réception
```

---

## 7. Modèle de données — deltas proposés

### 7.1 Refonte de `correspondences`

```ts
correspondences: defineTable({
  ref: v.string(),
  // NOUVEAU : émetteur polymorphe
  senderKind: v.union(
    v.literal("organism"),
    v.literal("citizen"),
    v.literal("external"),
    v.literal("platform"),
  ),
  senderId: v.string(), // id polymorphe — validation côté handler
  // L'organisme producteur (pour les org-senders) — gardé pour requêtes rapides
  fromOrganismId: v.optional(v.id("organisms")),
  fromCitizenId: v.optional(v.id("citizens")),

  // Méta corres
  kind: correspondenceKindValidator, // NOUVEAU (16 valeurs)
  subject: v.string(),
  body: v.string(),
  urgent: v.boolean(),
  confidentiality: confidentialityLevelValidator, // PASSE À 4 niveaux

  // DUA spécifique (Bloc 5 §11.10)
  duaCode: v.string(),                // "5y", "30y", "indef", "1y"…
  duaExpiresAt: v.optional(v.number()), // timestamp ou null si indéf
  archivePolicy: v.optional(v.string()), // texte libre rétrocompat

  // Cycle de vie
  status: correspondenceStatusValidator, // 9 valeurs (cf §3.2)
  sentAt: v.optional(v.number()),  // null tant que pas envoyé
  dueAckAt: v.optional(v.number()), // échéance AR (calculée selon kind)
  dueReplyAt: v.optional(v.number()), // échéance réponse
  closedAt: v.optional(v.number()),
  closedReason: v.optional(v.string()),
  recalledAt: v.optional(v.number()),
  recalledReason: v.optional(v.string()),

  // Thread cross-corres
  threadId: v.string(), // UUID partagé par toutes les corres d'un échange
  parentCorrespondenceId: v.optional(v.id("correspondences")),

  // Liens multi (NOUVEAU)
  linkedRequestIds: v.optional(v.array(v.id("requests"))),
  linkedCitizenIds: v.optional(v.array(v.id("citizens"))),
  linkedDocumentIds: v.optional(v.array(v.id("documents"))),
  linkedCorrespondenceIds: v.optional(v.array(v.id("correspondences"))),

  // Signature circuit (réutilisé Bloc 3)
  signatureCircuitId: v.optional(v.id("signatureCircuits")),

  // Caches d'aggrégation
  participantsCount: v.optional(v.number()),
  messagesCount: v.optional(v.number()),
  attachmentsCount: v.optional(v.number()),
})
  .index("by_ref", ["ref"])
  .index("by_thread", ["threadId"])
  .index("by_from_organism", ["fromOrganismId"])
  .index("by_from_citizen", ["fromCitizenId"])
  .index("by_kind_status", ["kind", "status"])
  // Pour la query inbox de l'org : tous les courriers reçus (joint à recipients)
  // → on garde aussi by_to_organism via correspondenceRecipients
```

### 7.2 NOUVELLE table `correspondenceRecipients`

```ts
correspondenceRecipients: defineTable({
  correspondenceId: v.id("correspondences"),
  role: v.union(
    v.literal("to"),
    v.literal("cc"),
    v.literal("bcc"),
  ),
  // Récepteur polymorphe
  recipientKind: v.union(
    v.literal("organism"),
    v.literal("citizen"),
    v.literal("external"),
    v.literal("platform"),
  ),
  recipientId: v.string(),
  // Pour les org-receivers : index dédié
  recipientOrganismId: v.optional(v.id("organisms")),
  recipientCitizenId: v.optional(v.id("citizens")),
  // Snapshot du nom au moment de l'envoi (utile pour les externals)
  recipientNameSnapshot: v.string(),
  recipientEmailSnapshot: v.optional(v.string()), // si external

  // Tracking par recipient
  notifiedAt: v.optional(v.number()),
  firstReadAt: v.optional(v.number()),
})
  .index("by_correspondence", ["correspondenceId"])
  .index("by_organism_role", ["recipientOrganismId", "role"])
  .index("by_citizen", ["recipientCitizenId"])
```

### 7.3 NOUVELLE table `correspondenceAcks` (AR formels)

```ts
correspondenceAcks: defineTable({
  correspondenceId: v.id("correspondences"),
  recipientId: v.id("correspondenceRecipients"), // FK forte vers le recipient
  ackedByAgentId: v.optional(v.id("agents")),     // si org-receiver
  ackedByCitizenId: v.optional(v.id("citizens")), // si citizen-receiver
  ackedAt: v.number(),
  note: v.optional(v.string()), // « bien reçu, traitement sous 5 j »
})
  .index("by_correspondence", ["correspondenceId"])
  .index("by_recipient", ["recipientId"])
```

### 7.4 NOUVELLE table `correspondenceAttachments` (refactor)

```ts
correspondenceAttachments: defineTable({
  correspondenceId: v.id("correspondences"),
  messageId: v.optional(v.id("correspondenceMessages")),
  filename: v.string(),
  mimeType: v.string(),
  sizeBytes: v.number(),
  storageKey: v.string(),
  sha256: v.string(), // calculé à l'upload
  kind: v.union(
    v.literal("document"),   // acte officiel (linkedDocumentId obligatoire)
    v.literal("external"),   // PDF/image quelconque
  ),
  linkedDocumentId: v.optional(v.id("documents")),
  // Surcharge confidentialité si plus restrictive que la corres
  confidentiality: v.optional(confidentialityLevelValidator),
  // S/MIME au niveau PJ
  signed: v.boolean(),
  signatureFingerprint: v.optional(v.string()),
  uploadedByAgentId: v.optional(v.id("agents")),
  uploadedByCitizenId: v.optional(v.id("citizens")),
  uploadedAt: v.number(),
})
  .index("by_correspondence", ["correspondenceId"])
  .index("by_message", ["messageId"])
  .index("by_linked_document", ["linkedDocumentId"])
```

### 7.5 Refonte `correspondenceMessages`

```ts
correspondenceMessages: defineTable({
  correspondenceId: v.id("correspondences"),
  // Émetteur du message polymorphe (peut être l'expéditeur de la corres
  // OU un destinataire qui répond OU un agent du même org qui complète)
  fromKind: v.union(
    v.literal("agent"),
    v.literal("citizen"),
    v.literal("system"), // pour les events "Corres rappelée", "AR reçu", etc.
  ),
  fromAgentId: v.optional(v.id("agents")),
  fromCitizenId: v.optional(v.id("citizens")),
  fromOrganismIdSnapshot: v.optional(v.id("organisms")), // org de l'agent au moment

  body: v.string(),
  bodyFormat: v.optional(v.union(v.literal("plain"), v.literal("markdown"))),

  // S/MIME au niveau message (existait : `signed: boolean`)
  signed: v.boolean(),
  signatureFingerprint: v.optional(v.string()),
  signatureAlgorithm: v.optional(v.string()),
  signedAt: v.optional(v.number()),

  sentAt: v.number(),
  editedAt: v.optional(v.number()), // si édition d'un brouillon avant envoi
  isSystem: v.optional(v.boolean()), // si message généré par le système
}).index("by_correspondence", ["correspondenceId"])
```

### 7.6 NOUVELLES tables `externalParties` + `correspondenceTemplates` + `correspondenceKindRules`

```ts
// Partenaires externes (notaires, ambassades, etc.)
externalParties: defineTable({
  kind: v.union(
    v.literal("notary"),
    v.literal("bailiff"),
    v.literal("embassy"),
    v.literal("court"),
    v.literal("private_org"),
    v.literal("other"),
  ),
  name: v.string(),
  email: v.optional(v.string()),
  address: v.optional(v.string()),
  country: v.optional(v.string()),
  createdByAgentId: v.id("agents"),
}).index("by_name", ["name"])

// Templates de corres par kind
correspondenceTemplates: defineTable({
  organismId: v.optional(v.id("organisms")), // null = template global Gabon Connect
  kind: correspondenceKindValidator,
  slug: v.string(),
  title: v.string(),
  bodyTemplate: v.string(),
  status: v.union(v.literal("draft"), v.literal("active"), v.literal("deprecated")),
  version: v.string(),
})
  .index("by_organism_kind", ["organismId", "kind"])
  .index("by_kind_status", ["kind", "status"])

// Règles par kind (DUA, délais, circuit obligatoire) — ajustables par admin technique
correspondenceKindRules: defineTable({
  kind: correspondenceKindValidator,
  requiresCircuit: v.boolean(),
  requiresAttachment: v.boolean(),
  duaCode: v.string(), // "5y", "30y", "indef", etc.
  ackDeadlineDays: v.optional(v.number()),
  replyDeadlineDays: v.optional(v.number()),
  defaultConfidentiality: confidentialityLevelValidator,
}).index("by_kind", ["kind"])
```

### 7.7 Mises à jour des enums

```ts
// CONFIDENTIALITY_LEVELS : ajout "secret"
const CONFIDENTIALITY_LEVELS = ["public", "restricted", "confidential", "secret"]

// CORRESPONDENCE_STATUSES : refonte (cf §3.2)
const CORRESPONDENCE_STATUSES = [
  "draft", "pending_signature", "sent", "acknowledged",
  "replied", "closed", "archived", "recalled",
]

// NOUVEAU : correspondenceKinds (16 valeurs, cf §4.1)

// NOUVEAU : notificationKinds — ajouter
const NOTIFICATION_KINDS = [
  /* existants */,
  "correspondence_received",  // NOUVEAU
  "correspondence_acknowledged", // NOUVEAU
  "correspondence_replied",   // NOUVEAU
  "correspondence_recalled",  // NOUVEAU
  "correspondence_deadline",  // approche d'échéance AR/réponse
]
```

---

## 8. Mutations Convex à écrire

| Mutation | Permission | Effet | Audit verb |
|---|---|---|---|
| `createDraft` | `correspondence.create` | Insert corres status=draft + 1er message vide, génère ref + threadId | `correspondence.created` |
| `updateDraft` | `correspondence.create` (owner) | Patch corres + 1er message tant que status=draft | `correspondence.draft_updated` |
| `addRecipient` | `correspondence.create` (owner) | Insert correspondenceRecipients (validation : pas de doublon) | `correspondence.recipient_added` |
| `removeRecipient` | `correspondence.create` (owner) | Delete recipient (refusé si déjà envoyé) | `correspondence.recipient_removed` |
| `attachFile` | `correspondence.create` (owner) | Insert correspondenceAttachments, calcule sha256 | `correspondence.attachment_added` |
| `removeAttachment` | `correspondence.create` (owner) | Delete attachment | `correspondence.attachment_removed` |
| `submitForSignature` | `correspondence.send` | Vérifie préconditions kind, ouvre circuit signature, status=pending_signature | `correspondence.submitted_for_signature` |
| `sendDirect` | `correspondence.send_direct` | Vérifie kind permet sans-circuit, patch status=sent, calcule deadlines, déclenche notifs | `correspondence.sent` |
| `acknowledge` | `correspondence.acknowledge` | Insert correspondenceAcks, patch status=acknowledged si 1er AR du To | `correspondence.acknowledged` |
| `reply` | `correspondence.reply` | Insert message + patch status=replied | `correspondence.replied` |
| `recall` | `correspondence.recall` | Vérifie aucun AR existant, patch status=recalled, notif destinataires | `correspondence.recalled` |
| `close` | `correspondence.close` | Patch status=closed | `correspondence.closed` |
| `archiveCorrespondence` | `correspondence.archive` | Crée entrée archives + patch status=archived | `correspondence.archived` |
| `closeStaleAutomatic` (cron) | `system` | Job mensuel : ferme corres inactives > N jours | `correspondence.closed_auto` |

### 8.1 Mutations citoyennes

| Mutation | Permission | Effet |
|---|---|---|
| `citizenCreateCorrespondence` | `correspondence.citizen.send` | Crée corres citoyen→org avec kind `instruction_request` ou `cooperation_*` |
| `citizenAcknowledge` | `correspondence.citizen.acknowledge` | AR par le citoyen |
| `citizenReply` | `correspondence.citizen.reply` | Réponse à corres org→citoyen |

### 8.2 Mutations templates

| Mutation | Permission | Effet |
|---|---|---|
| `createTemplate` | `correspondence.template.crud` | Insert template draft |
| `updateTemplate` | `correspondence.template.crud` | Patch (interdit sur active sauf nouvelle version) |
| `activateTemplate` | `correspondence.template.crud` | Patch status=active, déprécie l'ancien |

### 8.3 Helper `lib/correspondenceLifecycle.ts`

- `computeDeadlines(kind, sentAt)` → `{ dueAckAt, dueReplyAt }`
- `defaultDuaForKind(kind)` → `{ duaCode, duaExpiresAt }`
- `requiresCircuit(kind)` → boolean
- `notifyRecipients(correspondenceId)` → insère notifications en table pour
  tous les destinataires (org → tous les agents éligibles, citoyen → 1 notif)

### 8.4 Helper `lib/smime.ts` (stub v1)

- `signMessage(body, agentId, sentAt) → { fingerprint, algorithm, signedAt }`
  - v1 : SHA-256(body + agentId + sentAt + secret env-var)
- `verifySignature(message)` → boolean
- Interface conçue pour brancher du vrai S/MIME plus tard sans toucher au métier

---

## 9. Queries Convex à écrire

### 9.1 Côté admin

| Query | Permission | Retourne |
|---|---|---|
| `listInbox({ scope, kind?, status?, search?, limit? })` | `correspondence.read` | Reçus (To OU CC), enrichi avec sender, kind badge, lu/AR par moi, count PJ. Scope = "untreated" \| "noreply" \| "all" |
| `listOutbox({ status?, kind?, search?, limit? })` | `correspondence.read` | Envoyés par mon org |
| `listDrafts` | `correspondence.create` | Brouillons à moi |
| `listArchived({ search?, kind? })` | `correspondence.read` | Corres `archived` consultables |
| `getThread({ ref })` | `correspondence.read` | Corres + messages + recipients + acks + attachments + circuit + thread parent/enfants + meta complète |
| `getThreadByThreadId({ threadId })` | `correspondence.read` | Toutes les corres d'un même threadId, ordonnées chronologiquement |
| `searchCorrespondences({ query, filters })` | `correspondence.read` | Recherche fulltext sur sujet+corps+ref |
| `getInboxCounts` | `correspondence.read` | { unread, untreated, noReply, urgent } pour badge sidebar |
| `listPendingSignaturesForCorrespondence` | `correspondence.read` | Mes corres en attente de mon visa (équivalent du `listMySignatures` du Bloc 3, mais filtré sur subjectKind=correspondence) |
| `listEscalations` | `correspondence.platform_read` | (platform_admin) toutes les saisines escalation_* |
| `getKindRules({ kind })` | `correspondence.read` | Règles applicables (DUA, délais, circuit obligatoire) |

### 9.2 Côté citoyen

| Query | Retourne |
|---|---|
| `citizenListCorrespondences` | Reçus + envoyés du citoyen connecté |
| `citizenGetThread({ ref })` | Thread complet (lecture seule sauf reply/AR) |
| `citizenGetInboxCounts` | Counter unread pour badge |
| `citizenListOrganisms` | Liste organismes pour picker destinataire |

### 9.3 Côté plateforme

| Query | Retourne |
|---|---|
| `platformListEscalations` | Toutes les saisines avec filtres |
| `platformGetStats` | Volumes par kind, par org, par mois |

---

## 10. Server actions Next.js

`apps/admin-web/src/app/(app)/correspondance/actions.ts` :
```ts
createDraftAction
updateDraftAction
addRecipientAction, removeRecipientAction
attachFileAction (multipart, upload Convex storage)
removeAttachmentAction
submitForSignatureAction
sendDirectAction
acknowledgeAction (avec note optionnelle)
replyAction
recallAction (avec motif)
closeAction
archiveCorrespondenceAction
getAttachmentUrlAction (URL signée)
```

`apps/admin-web/src/app/(app)/correspondance/templates/actions.ts` :
```ts
createTemplateAction
updateTemplateAction
activateTemplateAction
```

`apps/citizen-web/src/app/mon-espace/courriers/actions.ts` :
```ts
createCitizenCorrespondenceAction
citizenReplyAction
citizenAcknowledgeAction
```

`revalidatePath` :
- `/correspondance` à chaque mutation
- `/correspondance/[ref]` après reply/ack/recall
- Sidebar counts (via tag `correspondence-counts`)

---

## 11. Tests à écrire (cible : +50 tests, total ~215)

### 11.1 Tests backend (Vitest + convex-test)

Fichier `convex/admin/correspondence-bloc5.test.ts` :
- **Lifecycle complet** : createDraft → addRecipient × 3 (To/CC/BCC) → attachFile → submitForSignature → approve × N → status=sent → recipient ack → reply → close → archive (1 test orchestré + 12 tests unitaires par étape)
- **Préconditions par kind** :
  - decision_* : refuse send sans PJ
  - escalation_* : refuse send sans circuit DGAN
  - cooperation_* : send_direct autorisé sans circuit
- **Permissions** : agent_instructeur ne peut PAS recall (admin only)
- **Recall** : refusé si déjà un AR
- **Threading** :
  - corres avec parentCorrespondenceId → même threadId que parent
  - getThreadByThreadId renvoie toutes les corres ordonnées
- **Multi-destinataires** :
  - org→org avec 1 To + 2 CC : tous reçoivent notif, seul le To compte pour AR
  - notification par agent éligible (filter par rôle)
- **AR** :
  - acknowledge par le To passe status=acknowledged
  - acknowledge par un CC reste acknowledged si déjà fait par To, sinon pas de transition
  - 2e ack du même recipient : idempotent
- **Confidentialité** :
  - PJ avec confidentiality plus restrictive que la corres : tracking correct
- **DUA** :
  - createDraft kind=instruction_* → duaCode=5y + duaExpiresAt = sentAt + 5 ans
  - closeStaleAutomatic : ferme corres > N jours, ne touche pas les < N jours
- **Citoyen** :
  - citizenCreateCorrespondence → vérifie ownership, force kind autorisé
  - citizenReply à corres org→citoyen → vérifie le citoyen est bien recipient
- **Édition** :
  - updateDraft sur status=draft : OK
  - updateDraft sur status=sent : refusé
- **Cross-org sécurité** :
  - getThread refusé si agent hors de l'organisme expéditeur ET pas dans les recipients
  - attachFile refusé sur corres d'un autre org

Fichier `convex/public/correspondencePublic.test.ts` (si on expose une vérification publique d'authenticité d'une corres comme pour les actes — futur Bloc 4 étendu).

Fichier `convex/lib/smime.test.ts` :
- signMessage produit un fingerprint déterministe
- verifySignature vrai si fingerprint matche
- verifySignature faux si body modifié

### 11.2 Tests UI (futur — quand vitest-react/playwright configurés)

- Hors scope strict de la spec : on note dans le plan de séquencage qu'on
  ajoutera l'infra de tests UI quand on l'aura.
- En attendant, on s'appuie sur le typecheck + les tests backend qui couvrent
  toute la logique.

### 11.3 Cible chiffrée

- Backend : **+50 tests** minimum (lifecycle 12, kind rules 6, permissions 8,
  thread 4, recipients 6, ack 4, confidentialité 3, DUA 4, citoyen 5, smime 3)
- Total visé : **215/215** depuis le 164 actuel

---

## 12. Décisions verrouillées

Validées avec l'utilisateur le 2026-05-26.

1. ✅ **Périmètre acteurs** : on couvre les **5 types** (org→org, org→citoyen,
   citoyen→org, org→tutelle, org→externe).
2. ✅ **Kind enum complet** : 16 valeurs réparties en 6 familles (§4.1).
3. ✅ **S/MIME** : vrai certificat à terme, mais nécessite une PKI (projet à
   part). **v1 stub** : signature SHA-256 avec clé maître, interface
   `lib/smime.ts` extractible pour brancher du vrai plus tard sans toucher
   au métier.
4. ✅ **Circuit signature** : réutilise `signatureCircuits` polymorphe du
   Bloc 3 (`subjectKind="correspondence"` déjà supporté).
5. ✅ **AR explicite** : action distincte de l'ouverture. Garde
   `correspondenceReads` (track passif) + ajoute `correspondenceAcks`
   (action explicite).
6. ✅ **Thread** : `threadId` UUID partagé + `parentCorrespondenceId` pour la
   structure arbre. Permet la navigation chronologique ET la hiérarchie.
7. ✅ **Confidentialité** : 4 niveaux (`public`, `restricted`, `confidential`,
   `secret`) — ajout de `secret`.
8. ✅ **Org→citoyen** : entité distincte des `notifications`. Vit dans
   `correspondences` avec `recipientKind="citizen"`.
9. ✅ **Pièces jointes** : table dédiée `correspondenceAttachments` (refactor
   du `attachmentStorageKeys: string[]` actuel).
10. ✅ **DUA spécifique** : enum `duaCode` + `duaExpiresAt` calculé. Pas de
    versement automatique au SAE (manuel + cron Bloc 6).
11. ✅ **Multi-destinataires** : structure **To/CC/BCC** via table
    `correspondenceRecipients` polymorphe. Justification :
    - modèle mental email familier
    - sémantique différenciée (seul To déclenche AR formel)
    - filtres précis (« où je suis To » vs « où je suis CC »)
    - compatible S/MIME chiffrement par destinataire

### 12.1 Décisions techniques additionnelles

12. ✅ **Templates** : table `correspondenceTemplates` avec `organismId?` (null
    = global Gabon Connect), kind, slug, body, variables remplacées au
    rendu — pattern identique à `documentTemplates`.
13. ✅ **Règles par kind** : table `correspondenceKindRules` (DUA, délais,
    circuit obligatoire) ajustable par admin technique — pas hardcodé.
14. ✅ **Cron clôture automatique** : Convex scheduled function (cron) mensuel
    qui ferme les corres inactives > N jours (N par kind).
15. ✅ **Pas d'import email externe v1** : un agent ne peut pas importer un
    email Outlook dans Gabon Connect — il doit le saisir ou y attacher le
    PDF de l'email. Import futur via API SMTP/IMAP.

---

## 13. Plan de séquencage pour le Bloc 5

### Phase A — Backend foundation (Schema + helpers)
1. **Schema deltas** : refonte `correspondences`, nouvelles tables (recipients,
   acks, attachments, externalParties, templates, kindRules)
2. **Enums** : ajouter `correspondenceKind` (16), passer
   `CONFIDENTIALITY_LEVELS` à 4 niveaux, étendre `CORRESPONDENCE_STATUSES`
3. **Permissions** : ajouter les 11 nouvelles actions (§6)
4. **Helper `lib/correspondenceLifecycle.ts`** (computeDeadlines, DUA, etc.)
5. **Helper `lib/smime.ts`** (stub v1 + interface)
6. **Seed** : enrichir avec 10 corres de différents kinds, statuts variés,
   recipients multiples (pour tester l'UI sans saisie manuelle)

### Phase B — Mutations + queries
7. **Mutations brouillon** : createDraft, updateDraft, add/removeRecipient,
   attach/removeAttachment
8. **Mutations envoi** : submitForSignature, sendDirect, recall
9. **Mutations réception** : acknowledge, reply, close, archive
10. **Mutations cron** : closeStaleAutomatic
11. **Mutations citoyen** : citizenCreate, citizenReply, citizenAcknowledge
12. **Mutations templates** : create/update/activateTemplate
13. **Queries admin** : listInbox (avec scopes), listOutbox, listDrafts,
    listArchived, getThread, getThreadByThreadId, searchCorrespondences,
    getInboxCounts, listEscalations
14. **Queries citoyen** : citizenListCorrespondences, citizenGetThread,
    citizenGetInboxCounts, citizenListOrganisms
15. **Tests backend (cible +50, total 215)**

### Phase C — UI admin
16. **Composant partagé `ThreadView`** (admin + citoyen)
17. **Page `/correspondance`** refondue (3 colonnes, scopes Reçus, sous-tabs)
18. **Page `/correspondance/[ref]`** (deep-link thread)
19. **Page `/correspondance/nouveau`** (wizard 3 étapes)
20. **Page `/correspondance/templates`** (admin technique)
21. **Sidebar badge** « correspondance non lue » mis à jour
22. **Suggestion IA** intégrée au composer (branchée sur assistant Convex
    existant)

### Phase D — UI citoyen
23. **Page `/mon-espace/courriers`** (boîte de réception citoyenne)
24. **Page `/mon-espace/courriers/[ref]`** (thread complet, ReplyView)
25. **Page `/mon-espace/courriers/nouveau`** (wizard simplifié)
26. **Notification citoyenne** sur réception (already in `notifications`
    table — ajouter le kind `correspondence_received`)

### Phase E — Audit RGAA + clôture
27. **Audit RGAA** via skill `accessibility-rgaa` sur tous les nouveaux écrans
28. **Implémentation des recommandations** (mêmes patterns Bloc 3 :
    useModalA11y, zones live persistantes, etc.)
29. **Mise à jour `critical-flows.md`** + plan de séquencage suivant (Bloc 6)

---

**Validation requise avant de coder** :
- [x] Les décisions § 12 sont tranchées (2026-05-26)
- [ ] Le modèle de données (§7) est OK
- [ ] La liste des permissions (§6) est complète
- [ ] La liste des mutations (§8) couvre tous les cas
- [ ] La structure UI (§5) est validée UX (notamment les sous-tabs Reçus)
- [ ] La cible tests (§11.3) est OK
