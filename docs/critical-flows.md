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
- [x] `citizen/drafts.ts` — mutation `saveDraft` (autosave wizard, upsert idempotent)
- [x] `citizen/drafts.ts` — mutation `discardDraft`
- [x] `citizen/drafts.ts` — query `getMyDraft(serviceSlug)` (reprise wizard)
- [x] `citizen/drafts.ts` — query `listMyDrafts` (page "Mes brouillons" future)
- [x] `citizen/uploads.ts` — mutation `generateUploadUrl` (Convex storage)
- [x] `citizen/uploads.ts` — mutation `attachPiece` (création piece orpheline)
- [x] `citizen/uploads.ts` — mutation `removePiece` (annulation avant submit)
- [x] Schema delta : `pieces.requestId` optional + `citizenId` + `requirementId`
- [ ] OCR + détection type doc : intégration ou stub avec `detectedDocType` + `ocrConfidence` (reporté)
- [x] Autofill RGPP : helper `resolveAutofillValues` dans citizen/catalog.ts (lit profil citoyen, stubs documentés pour third_party_api)
- [x] Query `getServiceForWizard` (auth + variantes + requirements + autofill)
- [x] Mutation `submitRequest` enrichie : urgent, payload, attachedPieceIds, conversion draft → request

### Front
- [x] Wizard : sélection variante dynamique (depuis `serviceVariants`)
- [x] Wizard : étape pièces dynamique (depuis `serviceRequirements`)
- [x] Wizard : upload réel via Convex storage (XHR avec progress bar + suppression)
- [x] Wizard : autosave brouillon debounced 2s (badge "Sauvegarde…" / "Brouillon enregistré")
- [x] Reprise du brouillon : si existe au load, initialise step + variant + payload
- [x] Champs : nombre de copies, email notification, beneficiary kind, urgent + justification
- [x] Consentements snapshot (honneur + RGPD) capturés au submit
- [x] Pré-remplissage RGPP visible (champs grisés via readonlyStyle)
- [x] variantOverrides UI : éditeur tri-state (Hériter / Obligatoire / Facultative) par variante dans le Dialog d'édition de pièce + résolution dans le wizard citoyen (override.required + acceptedDocTypes appliqués selon la variante sélectionnée)

### Validation
- [x] Typecheck backend + citizen-web : 0 erreur
- [x] Tests backend : 128/128 verts
- [ ] Wizard interrompu → brouillon visible et reprenable (à tester manuellement)
- [ ] Pièce uploadée → fichier réellement stocké, visualisable, supprimable (à tester)
- [ ] Une demande déposée a un payload conforme au schema, consents snapshot, et apparaît côté agent (à tester)
- [ ] RGAA : focus management dans les inputs file + drag-drop accessible clavier

✅ **Bloc 2 clôturé** : [x] (sous réserve validation manuelle)

---

## Bloc 3 — Traitement complet d'une demande (côté agent)

**Entités** : `requests`, `pieces`, `verifications`, `requestEvents`, `signatureCircuits`, `signatureCircuitSteps`, `documents`

> Spec préalable détaillée : [`request-processing-spec.md`](./request-processing-spec.md)

### Backend
- [x] `lib/issuance.ts:finalizeIssuance(documentId, actorAgentId)` — émission unifiée (sha256, verificationCode unique, qualifiedTimestamp stub, patch document=issued + request=issued, archive squelette, notif citoyen)
- [x] Refonte `signAndIssue` — préconditions strictes (pièces+vérifs), limité services à signature simple (≤1 step), délègue à finalizeIssuance
- [x] Refonte `prepareDocument` — résolution dynamique assignees depuis `services.defaultSignatureCircuitTemplate`, fallback args legacy
- [x] Refonte `refuseSignatureStep` — rebascule demande à `in_instruction` + notif préparateur (décision § 11.3)
- [x] Refonte `onCircuitCompleted` (document) → délègue à finalizeIssuance (status passe direct à `issued`, plus de `signed` intermédiaire)
- [x] Mutation `setVerificationStatus(verificationId, status, evidence?)` + permission `verification.update`
- [x] Stub `seedDefaultVerifications` automatique à `submitRequest` (identity=ok si IDN, data_consistency+duplicate_detection=pending)
- [x] Permissions Bloc 3 : `verification.update`, `signature.approve`, `signature.refuse` (vérif dynamique d'assignee dans handler)
- [x] Query `admin.requests.getInstruction` enrichie (variant, document, circuit avec steps assignees, pieces.hasFile+ids)
- [x] Query `admin.requests.getPieceViewUrl(pieceId)` — URL signée Convex storage
- [x] Query `admin.requests.getDocumentPdfUrl(documentId)` — version agent
- [x] Query `citizen.requests.getMyDocumentPdfUrl(ref)` — version citoyen avec vérif ownership
- [x] Module `admin/signatures.ts` : `listMine(scope?)` + `countMyPending`
- [x] Génération **réelle** de PDF : Convex action Node `pdf/action.ts:generateDocumentPdf` avec `@react-pdf/renderer` + composant `ActeOfficial` générique. Schedule depuis finalizeIssuance, calcule sha256 sur bytes PDF, store storage, patche `documents.pdfStorageKey` + `documents.sha256`
- [x] Horodatage qualifié (`qualifiedTimestamp`) : stub `new Date().toISOString()` documenté, helper extrait pour brancher TSA RFC 3161 plus tard (décision § 11.4)
- [x] Code de vérification court (`verificationCode`) : généré format `GC-XX-NNNN` avec boucle anti-collision (index by_verification_code)
- [x] Notifications insérées en table à chaque transition critique (assignment, piece_requested, document_ready, signature_requested, request_status_change) — envoi réel = autre Bloc

### Front
- [x] Page demande : viewer modal (iframe PDF / img) + boutons valider/rejeter par pièce (Dialog motif)
- [x] Page demande : badge OCR confidence si présent (champ ocrConfidence conditionnel — stub v1)
- [x] Page demande : picker d'assignation (M'assigner + select des agents)
- [x] Page demande : circuit de signature visualisé (steps ordonnés, statut visuel, boutons approuver/refuser pour l'assignee current)
- [x] Page demande : panel vérifications interactif (boutons OK/KO/N-A + source)
- [x] Page demande : bouton "Préparer l'acte" + dialog choix chef+officier si pas de template
- [x] Page demande : bloc "Acte émis" avec sha256 court + statut PDF
- [x] Page `/signatures` : tabs URL-driven (À approuver / Décisions récentes), carte par signature, approve/refuse avec commentaire, badge sidebar
- [x] Page `/generation/[ref]` : barre d'actions contextuelle (sign direct vs aller à la demande vs télécharger PDF émis)
- [x] Citoyen `/mon-espace/demarches/[ref]` : bouton "Télécharger l'acte" avec 3-états + bandeau "Vérifier l'authenticité" + code de vérification
- [ ] Bouton "Verser au SAE" sur une demande `issued` — déjà câblé par `signAndIssue` (auto, Bloc 6 enrichira)
- [x] Notification temps-réel sur statut : badge sidebar `signaturesPending` (revalidation à chaque mutation)

### Validation
- [x] Backend : 151/151 tests verts (23 nouveaux tests `bloc3.test.ts` + couverture mutations refondues)
- [x] Typecheck 5 packages : 0 erreur (backend, admin-web, citizen-web, platform-web, ui)
- [x] RGAA passe programmatique : audit complet via skill `accessibility-rgaa` après étape 15, 9 findings dont 3 critiques tous résolus (hook `useModalA11y` partagé, zones live persistantes, skip link, taille des cibles tactiles, accord de genre)
- [ ] Click-through manuel par un humain : un agent reçoit, valide pièces, prépare, circuit 3 étapes, livre — citoyen télécharge le PDF
- [ ] Tests manuels NVDA/VoiceOver sur les 5 modales (audit programmatique = couverture partielle)
- [ ] Vrai TSA RFC 3161 branché (stub v1, helper extrait)
- [ ] OCR + détection type doc (champs schema prêts, intégration future)

✅ **Bloc 3 clôturé** : [x] (sous réserve click-through manuel + NVDA/VoiceOver manuel)

---

## Bloc 4 — Document délivré et vérifiable

**Entités** : `documents`, `publicVerifications`, `registryEntries`

### Backend
- [x] Mutation publique (sans token) `public.verify.verifyByCode({ code, verifierIpHash?, userAgent? })` : lookup par `verificationCode`, normalise format (espaces/casse), log dans `publicVerifications`, lazy-création `registryEntries`, renvoie payload safe (pas de PII : pas de date/lieu naissance, pas d'adresse)
- [x] HTTP action GET `/verify/:code` (route `convex/http.ts`) : hash SHA-256 de l'IP (Web Crypto), CORS pour QR scanners externes, appelle la mutation publique
- [x] Mutation `admin.mutations.revokeDocument(documentId, reason)` : permission `document.revoke` (admin_organisme), motif obligatoire, idempotent (already=true au 2e appel), insert requestEvents + notif citoyen, préserve motif initial
- [x] `registryEntries` lazy-créés à la première consultation (ADR-0011) : déduction `kind` depuis service slug (birth/marriage/death/adoption/recognition), idempotent via index `by_register_act`, patch `documents.linkedRegistryEntryId`
- [ ] Intégration MCP Lumin pour signature qualifiée — reporté (stub en place via `qualifiedTimestamp` ISO + sha256 réel calculé sur PDF)

### Front
- [x] Route publique `/verifier/[code]` (citizen-web, sans auth) : header RepublicBar + Logo + nav, hash IP via Web Crypto, 3 panels (valid/revoked/unknown) avec design rassurant, dl/dt/dd pour les détails doc, FAQ avec `<details>` natifs, lang fr hérité, RGAA propre
- [x] QR code dans le PDF : généré via `qrcode` (lib npm), data URL inline en bleu institutionnel, pointe vers `${PUBLIC_BASE_URL}/verifier/[code]`, intégré dans bloc signature du composant ActeOfficial
- [x] Bandeau "Vérifier l'authenticité" déjà câblé Bloc 3 sur `/mon-espace/demarches/[ref]` (download-pdf-button.tsx)
- [x] Admin : bouton "Révoquer cet acte" intégré au bloc "Acte émis" sur `/demandes/[ref]` (admin_organisme uniquement, doc !== revoked), dialog motif obligatoire via `useModalA11y`

### Validation
- [x] Tests backend : 164/164 verts (13 nouveaux tests `public/verify.test.ts` : valid/unknown/format/casse/log/lazy registry × 2 idempotence, revoke × 5 permissions/motif/idempotence/cross-org, intégration revoke→verify)
- [x] Typecheck 5 packages : 0 erreur
- [x] RGAA : nouveaux écrans suivent les patterns Bloc 3 (useModalA11y, zones live persistantes, sémantique landmarks, skip link hérité du layout)
- [ ] Test manuel scan QR avec smartphone réel → URL ouverte → page valid affichée
- [ ] Test manuel révocation : admin révoque, citoyen reçoit notif, scanner QR le PDF affiche "révoqué"

✅ **Bloc 4 clôturé** : [x] (sous réserve test manuel QR scan + lib MCP Lumin reportée)

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
| 2. Dépôt en profondeur | ✅ backend + UI (validation manuelle à faire) | 2026-05-25 | 2026-05-25 |
| 3. Traitement demande | ✅ backend + UI (validation manuelle à faire) | 2026-05-26 | 2026-05-26 |
| 4. Document vérifiable | ✅ backend + UI + QR (test scan manuel à faire) | 2026-05-26 | 2026-05-26 |
| 5. Correspondance | 🔴 | — | — |
| 6. Archivage SAE | 🔴 | — | — |

---

## Décisions architecturales en attente

- Provider PDF (jsPDF côté serveur Convex action, ou microservice puppeteer ?)
- Provider horodatage qualifié (RFC 3161 — existe-t-il un TSA gabonais agréé ?)
- Provider signature qualifiée (Lumin MCP, ou autre)
- Stratégie de versionnage des templates (snapshot dans `documents.templateVersion` déjà prévu — confirmer)
