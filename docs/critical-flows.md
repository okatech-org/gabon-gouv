# Flux critiques — suivi d'implémentation

> Document vivant. À cocher au fur et à mesure. Chaque bloc bouclé = on passe au suivant.
> Dernière mise à jour : 2026-05-24.

## Légende

- 🟢 **Branché** — query/mutation backend + UI fonctionnelle + revalidation
- 🟡 **Faux-semblant** — UI présente mais bouton inerte, ou lecture seule sans les actions critiques
- 🔴 **Manquant** — ni backend ni UI, ou stub `ComingSoon`
- ✅ **Bloc clôturé**

---

## Bloc 1 — Cycle de vie d'un service (côté agent) ⭐ priorité absolue

> Sans cycle de vie complet, l'app n'a pas de boucle métier autonome — tout dépend du seed.

**Entités impactées** : `services`, `serviceVariants`, `serviceRequirements`, `documentTemplates`, `documentTemplateVariables`, `serviceCategories`

**Pages concernées** :
- `apps/admin-web/src/app/(app)/services/page.tsx` (liste)
- `apps/admin-web/src/app/(app)/services/nouveau/page.tsx` (à créer)
- `apps/admin-web/src/app/(app)/services/[slug]/page.tsx` (à créer, config)
- `apps/admin-web/src/app/(app)/services/[slug]/template/page.tsx` (à créer, éditeur template)

### Backend
- [x] `admin/services.ts` — mutation `createService`
- [x] `admin/services.ts` — mutation `updateService` (champs métier)
- [x] `admin/services.ts` — mutation `publishService` / `unpublishService` / `archiveService`
- [x] `admin/services.ts` — query `getDetail(slug)` (détail + variantes + requirements + templates)
- [x] `admin/serviceVariants.ts` — CRUD complet (add, update, reorder, setDefault, delete avec cascade)
- [x] `admin/serviceRequirements.ts` — CRUD complet (add, update, reorder, delete) + `variantOverrides`
- [x] `admin/documentTemplates.ts` — CRUD complet + validation comité (`validatedByComite`) + activation (déprécie l'ancien)
- [x] `admin/documentTemplates.ts` — CRUD variables (refuse sur template active)
- [x] Mutation `duplicateService(slug)` (clone variants + requirements + templates en draft)
- [x] Permissions ADR-0006 : 12 nouvelles actions `service.*`
- [x] Audit log de chaque mutation (verb + payload SHA-256) via `lib/audit.ts`
- [x] Tests : 31 tests sur services + sub-entités (create/publish/unpublish/archive/duplicate/permissions/variantes/pièces/templates)
- [x] `previewTemplate` + `listTemplateVersions` queries

### Front
- [x] Page liste : tabs Tous/Publiés/Brouillons/Archivés via URL, recherche, kebab menu (Configurer/Aperçu/Publier/Dépublier/Dupliquer/Archiver)
- [x] Page `/services/nouveau` : formulaire dédié (titre, catégorie, description, mode, frais, délai)
- [x] Page `/services/[slug]` : layout avec 8 onglets + statut + checklist publication
- [x] Onglet Vue d'ensemble : formulaire complet champs métier + KPI rapides
- [x] Onglet Variantes : table avec reorder boutons (alternative clavier au DnD), Dialog ajout/édition, badge défaut
- [x] Onglet Pièces requises : table avec reorder, Dialog, multi-select types acceptés, autofill source
- [x] Onglet Templates : tabs par variante, éditeur inline avec insertion `{{variables}}` depuis panel, validation+activation
- [x] Onglet Stats : 4 StatCards + top variantes (barres) + dernières demandes liées
- [x] Onglet Aperçu : iframe vers citizen-web `/services/[slug]` + bouton ouvrir nouvel onglet
- [x] Stubs Onglets Signature (Bloc 3) + Archivage SAE (Bloc 6) explicites
- [x] Bouton "Dupliquer" fonctionnel (kebab + header détail)
- [x] Cycle publication avec checklist préalable affichée en bannière
- [x] Seed enrichi : 2 services en draft pour démontrer la checklist

### Validation
- [x] Backend : 128/128 tests verts. Cycle create → configurer → publier traversable de A à Z par mutation.
- [x] Typecheck admin-web : 0 erreur.
- [x] RGAA passe programmatique : focus, labels htmlFor, fieldset/legend, aria-current, aria-modal, aria-hidden sur icônes décoratifs, role=alert/status, role=progressbar, time dateTime, statut jamais que par couleur, drag-and-drop accessible clavier.
- [ ] Click-through manuel par un humain (à faire visuellement) : créer un service de zéro, ajouter variantes/pièces/template, valider comité, activer, publier, voir dans /services et dans citizen-web
- [ ] Tests manuels NVDA/VoiceOver, contraste mesuré, zoom 200%, reflow 320 px
- [ ] Wizard citoyen `/demarches/nouvelle` qui consomme dynamiquement variantes + pièces (renvoyé au Bloc 2)

✅ **Bloc 1 clôturé** : [x] (sous réserve click-through manuel + validation a11y)

---

## Bloc 2 — Dépôt en profondeur (côté citoyen)

**Entités** : `requestDrafts`, `requests`, `pieces`, `serviceVariants`, `serviceRequirements`

### Backend
- [ ] `citizen/requests.ts` — mutation `saveDraft` (autosave wizard, throttle 2s)
- [ ] `citizen/requests.ts` — mutation `discardDraft`
- [ ] `citizen/requests.ts` — query `getMyDraft(serviceId)` (reprise wizard)
- [ ] `citizen/requests.ts` — query `listMyDrafts` (page "Mes brouillons" ?)
- [ ] HTTP action `generateUploadUrl` (Convex storage) pour upload réel
- [ ] Mutation `attachPiece` après upload (lie storageKey à `pieces.requestId`)
- [ ] OCR + détection type doc : intégration ou stub avec `detectedDocType` + `ocrConfidence`
- [ ] Autofill RGPP : helper qui lit `requirementAutofillSource` et pré-remplit depuis profil citoyen / IDN claims

### Front
- [ ] Wizard : sélection variante dynamique (depuis `serviceVariants`)
- [ ] Wizard : étape pièces dynamique (depuis `serviceRequirements` du service+variante)
- [ ] Wizard : upload réel via Convex storage (drag-and-drop + preview + suppression + progress bar)
- [ ] Wizard : autosave brouillon (badge "Brouillon · sauvegardé automatiquement" de la maquette)
- [ ] Reprise du brouillon depuis `/mon-espace/demarches/nouvelle?reprise=draftId`
- [ ] Champs : nombre de copies, email de notification, beneficiary kind, urgent + justification
- [ ] Consentements snapshot (honneur + RGPD) capturés au submit
- [ ] Pré-remplissage RGPP visible (champs grisés + badge "Pré-rempli depuis votre identité")

### Validation
- [ ] Wizard interrompu → brouillon visible et reprenable
- [ ] Pièce uploadée → fichier réellement stocké, visualisable, supprimable
- [ ] Une demande déposée a un payload conforme au schema, consents snapshot, et apparaît côté agent

✅ **Bloc 2 clôturé** : [ ]

---

## Bloc 3 — Traitement complet d'une demande (côté agent)

**Entités** : `requests`, `pieces`, `verifications`, `requestEvents`, `signatureCircuits`, `signatureCircuitSteps`, `documents`

### Backend
- [ ] Mutation `assignRequest` 🟢 (existe — vérifier UI)
- [ ] Mutation `validatePiece` 🟢 (existe — câbler UI)
- [ ] Mutation `rejectPiece` 🟢 (existe — câbler UI)
- [ ] Mutation `prepareDocument` 🟢 (existe — vérifier UI)
- [ ] Mutation `signAndIssue` 🟢 (existe — vérifier production PDF réel)
- [ ] Mutation `verseToSAE` 🟢 (existe — câbler bouton)
- [ ] Génération **réelle** de PDF (jsPDF ou puppeteer ou Convex action) + storage Convex (`pdfStorageKey`)
- [ ] Horodatage qualifié (`qualifiedTimestamp`) : provider réel (RFC 3161) ou stub documenté
- [ ] Code de vérification court (`verificationCode`) généré automatiquement
- [ ] Query `listMySignatures` (agent : circuits où il est assignee)
- [ ] Trigger : à `signAndIssue`, créer entrée `documents` + `requestEvents` + push notif citoyen

### Front
- [ ] Page demande : boutons valider/rejeter pièce avec viewer (PDF embed ou image)
- [ ] Page demande : OCR confidence affichée à côté de la pièce
- [ ] Page demande : picker d'assignation (autocomplete sur agents organisme)
- [ ] Page demande : circuit de signature visualisé (qui doit signer, où on en est)
- [ ] Page `/signatures` : "Mes signatures en attente" avec approve/reject + commentaire
- [ ] Page `/generation/[ref]` : vraie génération PDF (preview + signer & émettre)
- [ ] Bouton "Verser au SAE" sur une demande `issued`
- [ ] Notification temps-réel sur statut (toast + badge sidebar)

### Validation
- [ ] Un agent reçoit, valide les pièces, génère le PDF, signe via circuit, livre — tout cliquable
- [ ] Le citoyen voit la demande passer de `submitted` à `issued` avec PDF téléchargeable
- [ ] Le document a un sha256 réel calculé sur le PDF émis

✅ **Bloc 3 clôturé** : [ ]

---

## Bloc 4 — Document délivré et vérifiable

**Entités** : `documents`, `publicVerifications`, `registryEntries`

### Backend
- [ ] Action publique `verifyDocument(code)` (HTTP action, pas de token)
- [ ] Mutation `revokeDocument` (admin organisme, motif obligatoire)
- [ ] Intégration MCP Lumin pour signature qualifiée (optionnel, sinon documenter le stub)
- [ ] `registryEntries` lazy-créés à la première consultation (ADR-0011)

### Front
- [ ] Route publique `/verifier/[code]` (citizen-web, sans auth) : affiche document + outcome `valid/revoked/not_found`
- [ ] QR code généré dans le PDF pointant vers `/verifier/[code]`
- [ ] Page document citoyen : bouton "Vérifier l'authenticité" + lien partageable
- [ ] Admin : page de gestion des révocations (rare, mais critique)

✅ **Bloc 4 clôturé** : [ ]

---

## Bloc 5 — Correspondance opérationnelle (côté agent)

**Entités** : `correspondences`, `correspondenceMessages`, `correspondenceReads`, `signatureCircuits` (S/MIME)

### Backend
- [ ] Mutation `sendCorrespondence` 🟢 (existe — câbler dialog)
- [ ] Mutation `replyCorrespondence` 🟢 (existe — câbler thread)
- [ ] Query `listOutbox` (à créer — courriers envoyés)
- [ ] Query `getThread(ref)` 🟢 (existe — page détail à créer)

### Front
- [ ] Page `/correspondance/[ref]` : thread complet avec liaison demande/citoyen affichée
- [ ] Tabs Boîte de réception / Envoyés / Brouillons sur `/correspondance`
- [ ] Dialog "Nouveau courrier" : destinataire (picker org), sujet, corps, niveau confidentialité, urgent, pièces, **lien optionnel à une demande / un citoyen**
- [ ] Composer de réponse dans la page détail
- [ ] Indicateur S/MIME signed (icône cadenas + tooltip)

✅ **Bloc 5 clôturé** : [ ]

---

## Bloc 6 — Archivage SAE complet (côté agent)

**Entités** : `archives`, `eliminationBatches`

### Backend
- [ ] Trigger : à `verseToSAE` ou `issued` (selon politique), créer entrée `archives` avec sha256 + DUA calculée
- [ ] Mutation `createEliminationBatch` (regroupe archives à DUA expirée)
- [ ] Mutation `dganVisaBatch` / `dganRefuseBatch` (rôle `platform_admin` ou agent DGAN)
- [ ] Mutation `executeBatch` (passe les archives au statut éliminé)
- [ ] Action `checkArchiveIntegrity(cote)` (recalcule sha256, met à jour `lastIntegrityCheckAt`)
- [ ] Job cron : intégrité hebdomadaire sur échantillon

### Front
- [ ] Page `/archives` : recherche par cote, filtre DUA expirée, statut intégrité
- [ ] Page `/archives/bordereaux` : liste des `eliminationBatches`, statut visa
- [ ] Page `/archives/bordereaux/[id]` : détail bordereau, archives incluses, action visa (côté DGAN)
- [ ] Bouton "Verser au SAE" sur demande terminée
- [ ] Banner d'alerte sur archives à DUA expirée non encore versées en bordereau

✅ **Bloc 6 clôturé** : [ ]

---

## Trous transverses identifiés (à intercaler)

### Équipe (admin)
- [ ] Mutation `inviteAgent` (envoi email + création compte pending)
- [ ] Mutation `updateAgentRole`
- [ ] Mutation `deactivateAgent`
- [ ] Page `/equipe/nouveau` (Dialog probablement)

### Plateforme — onboarding réel
- [ ] Génération de convention onboarding via template + MCP Lumin (P3)
- [ ] Signature électronique de la convention par le représentant de l'organisme

### Notifications réelles
- [ ] Canal email (provider à choisir : Sendgrid, Mailgun, SMTP DGAN ?)
- [ ] Canal SMS (provider local Gabon)
- [ ] Préférences citoyen respectées (`notifications` table existante)

---

## Suivi global

| Bloc | État | Démarré le | Clôturé le |
|---|---|---|---|
| 1. Cycle de vie service | ✅ backend + UI | 2026-05-24 | 2026-05-24 |
| 2. Dépôt en profondeur | 🔴 | — | — |
| 3. Traitement demande | 🟡 partiel | — | — |
| 4. Document vérifiable | 🔴 | — | — |
| 5. Correspondance | 🔴 | — | — |
| 6. Archivage SAE | 🔴 | — | — |

---

## Décisions architecturales en attente

- Provider PDF (jsPDF côté serveur Convex action, ou microservice puppeteer ?)
- Provider horodatage qualifié (RFC 3161 — existe-t-il un TSA gabonais agréé ?)
- Provider signature qualifiée (Lumin MCP, ou autre)
- Stratégie de versionnage des templates (snapshot dans `documents.templateVersion` déjà prévu — confirmer)
