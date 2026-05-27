# Flux critiques — suivi d'implémentation

> Document vivant. À cocher au fur et à mesure. Chaque bloc bouclé = on passe au suivant.
> Dernière mise à jour : 2026-05-27.

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

> Spec préalable détaillée : [`correspondence-entity-spec.md`](./correspondence-entity-spec.md)
> (1084 lignes, 15 décisions verrouillées, 5 phases A-E).

### Backend (Phase A + B)
- [x] Schema refonte exhaustive : émetteur polymorphe (organism|citizen|external|platform), kind enum 16 valeurs / 6 familles, DUA spécifique, threading cross-corres via threadId+parentCorrespondenceId, liens multi (linkedRequestIds, linkedCitizenIds, linkedDocumentIds, linkedCorrespondenceIds)
- [x] 6 nouvelles tables : `correspondenceRecipients` (To/CC/BCC polymorphe), `correspondenceAcks` (AR formels distincts de reads passifs), `correspondenceAttachments` (refactor de l'array inline avec sha256 + lien optionnel acte), `externalParties` (notaires/ambassades/huissiers), `correspondenceTemplates` (modèles par kind), `correspondenceKindRules` (règles métier ajustables)
- [x] Enums : confidentialité 4 niveaux (+ `secret`), statuts 8 valeurs (+ `acknowledged`, `recalled`, `pending_signature`), 16 kinds, 5 nouveaux notification kinds
- [x] Permissions : 11 nouvelles actions admin + 4 actions citoyen, matrices mises à jour
- [x] Helper `lib/smime.ts` (stub v1 SHA-256 + clé maître, interface réutilisable pour vraie PKI), algorithm `stub-sha256-v1`
- [x] Helper `lib/correspondenceLifecycle.ts` : loadKindRule (table-first), getDefaultKindRules (17 entrées), duaCodeToMs, computeAck/Reply/DuaDeadline, performCorrespondenceSend (factorisé entre sendDirect et onCircuitCompleted), notifyRecipientsOnSend, generateCorrespondenceRef (anti-collision), newThreadId
- [x] Module `admin/correspondenceLifecycle.ts` (14 mutations) : createDraft, updateDraft, deleteDraft (cascade), addRecipient/removeRecipient, attachFile/removeAttachment, submitForSignature (ouvre circuit Bloc 3 polymorphe), sendDirect, acknowledge (idempotent), reply, recall (admin only, refusé après AR), close, archiveCorrespondence, closeStaleAutomatic (cron), markRead
- [x] Module `admin/correspondenceQueries.ts` (11 queries) : listInboxV2 (scopes untreated/noreply/all), listOutbox, listDrafts, listArchived, getThreadV2 (recipients To/CC, BCC filtré viewer-aware, messages avec author, attachments, acks, circuit signature, parent thread), getThreadByThreadId (corres cross-thread chrono), searchCorrespondences (sujet+body+ref), getInboxCounts (unread+untreated+urgent), listEscalations (platform_admin), getKindRules
- [x] Module `citizen/correspondence.ts` : citizenListInbox, citizenGetThread (ownership strict), citizenListOrganisms (picker), citizenGetInboxCounts, citizenCreateCorrespondence (kinds restreints), citizenReply, citizenAcknowledge, performCitizenSend helper
- [x] onCircuitCompleted (lib/signatureCircuit) branche pour subjectKind=correspondence → délègue à performCorrespondenceSend
- [x] Seed enrichi : 17 correspondenceKindRules
- [x] Tests : **227/227 verts** (+63 tests Bloc 5 : lifecycle, préconditions, permissions, recall, threading, multi-destinataires, AR idempotent, citoyen, smime, helpers)

### Front (Phase C + D)
- [x] Page `/correspondance` refondue : layout 3 colonnes URL-driven (tabs Reçus/Envoyés/Brouillons/Archivés + sous-tabs scopes sur Reçus), liste avec badges urgent/PJ/unread, ThreadView au centre, MetaPanel à droite (destinataires To/CC/BCC, circuit signature steps, dossiers liés, métadonnées techniques)
- [x] Composant `thread-view.tsx` (~770 lignes) : header avec actions contextuelles selon statut+rôle (Acknowledge/Submit/Send/Recall/Close/Archive), liste messages chronologique avec messages système, composer réponse signé S/MIME, dialogs avec hook useModalA11y partagé, régions live persistantes, badges spécialisés (StatusBadge 8 statuts, ConfidentialityBadge 4 niveaux, KindBadge 6 familles)
- [x] Page `/correspondance/[ref]` : deep-link plein écran, URL partageable
- [x] Page `/correspondance/nouveau` + wizard 3 étapes : Type (radio 16 kinds groupés par famille, badge Circuit), Destinataires (picker To/CC/BCC + organism, liste éditable), Rédaction (sujet+body+urgent), submit → createDraft + addRecipient×N + submitForSignature OU sendDirect → redirect
- [x] Sidebar admin : compteur `correspondenceUnread` déjà câblé
- [x] Page citoyen `/mon-espace/courriers` : 2 colonnes Reçus / Envoyés
- [x] Page citoyen `/mon-espace/courriers/[ref]` : thread complet read-only avec CitizenThreadActions (Acknowledge si To+pas d'AR, Répondre avec composer inline), avatar "Vous", signature IDN
- [x] Page citoyen `/mon-espace/courriers/nouveau` : formulaire simplifié une page, 3 kinds autorisés, picker administration, mention RGPD + signature IDN
- [x] Sidebar citoyen : nouvelle entrée "Courriers officiels" avec badge unreadCorrespondences

### Validation (Phase E)
- [x] RGAA : patterns Bloc 3 appliqués partout (useModalA11y partagé, zones live persistantes, fieldsets/legends sur radios, labels htmlFor, aria-required, aria-current, role="dialog" + aria-modal, role="status"/"alert" avec aria-live et aria-atomic, sémantique sections + ol/ul, statuts par texte+icône+couleur, cibles tactiles 32×32px ≥ WCAG 2.5.5 AA)
- [x] Typecheck 5 packages : 0 erreur
- [x] Tests backend : 227/227 verts
- [ ] Test manuel scénario complet : agent A crée brouillon → ajoute destinataires → soumet pour visa → 3 approbations → corres envoyée → destinataire reçoit notif → AR + reply → fil affiché correctement de bout en bout
- [ ] Tests NVDA/VoiceOver sur les dialogs (programmatique = ~70% du chemin a11y)
- [ ] Test citoyen : Marie écrit à DG EC depuis /mon-espace/courriers/nouveau, son courrier apparaît dans inbox des agents EC
- [ ] Vraie PKI S/MIME (stub `lib/smime.ts` en place, interface prête)

✅ **Bloc 5 clôturé** : [x] (sous réserve test manuel + vraie PKI reportée)

---

## Bloc 6 — Archivage SAE (architecture hybride Option C)

> **Décision d'architecture** : voir [`archive-sae-spec.md`](./archive-sae-spec.md).
> Gabon Connect ne fait que **verser** et **consulter** ; l'archivage légal
> complet (élimination, récolement, intégrité périodique, visa DGAN) est
> délégué à **Digitalium SAE** national quand celui-ci sera déployé. Pour
> l'instant, mode local par défaut (consultation read-only des archives
> insérées par les Blocs 3, 4 et 5).

**Entités** : `archives` (étendue), `organisms.saeConfig` (nouvelle)

### Backend (architecture hybride)
- [x] Interface `SaeProvider` (`lib/saeProvider.ts`) : `verse()` + `getStatus()`, kind `local` | `digitalium`
- [x] `LocalSaeProvider` (défaut v1) : insert idempotent dans la table `archives` locale (par documentId/correspondenceId/cote)
- [x] `DigitaliumSaeProvider` (skeleton v1) : insert local + marqueur `externalSaeKind=digitalium` + `externalStatus=pending_dispatch`. Push HMAC vers `/api/connectors/:id/events` à brancher quand Digitalium SAE déployé (ADR-0021)
- [x] Factory `getSaeProvider(organismId)` : lit `organisms.saeConfig.provider`, fallback local
- [x] Schema deltas : `archives.externalSaeId/externalSaeKind/externalStatus/externalStatusUpdatedAt/linkedCorrespondenceId` + index `by_external_id` + `organisms.saeConfig` (provider + connectorId + baseUrl)
- [x] Queries `admin.archives.*` : `listForOrg(scope, search)` avec 4 scopes (all/active/dua_expired/external_pending), `getDetail(cote)` consultation enrichie (entités liées), `getStatsForOrg` (total/active/duaExpired/externalPending/providerKind)
- [x] Insertion automatique des archives déjà câblée Bloc 3 (`finalizeIssuance`) et Bloc 5 (`archiveCorrespondence`)
- [ ] **Délégué au SAE national** : élimination, bordereaux, visa DGAN, récolement, intégrité hebdomadaire — **hors scope Gabon Connect**

### Front
- [x] Page `/archives` refondue : banner « SAE national non configuré » si mode local, stats (total + active + DUA expirée + external pending), 4 tabs scopes, table consultation read-only avec liens vers détail
- [x] Page `/archives/[cote]` : détail consultation (métadonnées + authenticité sha256 complet + horodatage qualifié + intégrité + entités liées request/document/correspondance + SAE externe si renseigné)
- [ ] Page `/parametres/sae` (configuration du connecteur Digitalium) — Phase 4 future quand SAE national arrive
- [ ] Webhook receiver `/api/sae-webhook` pour les updates de statut externe — Phase 4 future

### Validation
- [x] Tests backend : **239/239 verts** (+12 tests Bloc 6 : LocalSaeProvider verse/idempotence/getStatus, factory getSaeProvider, DigitaliumSaeProvider skeleton, queries listForOrg avec 4 scopes, getDetail cross-org, getStatsForOrg providerKind)
- [x] Typecheck OK sur les 5 packages
- [ ] Click-through manuel : un organisme local consulte ses archives, un organisme avec `saeConfig.provider=digitalium` voit ses archives marquées « En attente SAE »
- [ ] Plan de migration : quand Digitalium SAE est déployé → implémenter `dispatchToDigitalium` (fetch HMAC) dans `DigitaliumSaeProvider.verse` via `ctx.scheduler.runAfter`, capturer `externalSaeId` retourné, ajouter le webhook receiver

✅ **Bloc 6 clôturé** : [x] (sous réserve déploiement Digitalium SAE pour brancher le push réel)

---

## Trous transverses — phases A à G (2026-05-27) ✅

7 phases bouclées en post-Bloc-6, toutes commitées et poussées sur `origin/main`
(58 commits). Voir le bilan détaillé ci-dessous.

### Équipe (admin) — Phase B ✅
- [x] Table `agentInvitations` avec token magique (64 chars hex, TTL 14 jours)
- [x] Mutation `inviteAgent` (`admin/team.ts`) avec garde anti-doublon + anti-platform_admin
- [x] Mutation `revokeInvitation` (état `pending` uniquement)
- [x] Mutation `disableAgent` / `enableAgent` avec garde « dernier admin actif »
- [x] Mutation `changeAgentRole` avec même garde
- [x] Mutation publique `acceptInvitation` (pas d'auth, le token suffit)
- [x] Query `listInvitations` (filtres scope)
- [x] Query publique `getInvitationByToken` pour la page d'enrôlement
- [x] Page `/equipe` refondue (tabs Membres/Invitations, dialogs `useModalA11y`,
  dropdown actions, copie du lien d'enrôlement)
- [x] Page publique `/enrolement/[token]` avec form NIP + nom + fonction
- [x] Audit complet : chaque action insère dans `teamActivities` + `auditLog`
- [x] 21 tests dédiés (`admin/team.test.ts`)

### Plateforme — onboarding réel — Phase C ✅ (partiel)
- [x] `platform.registerOrganism` étendu : `firstAdminEmail` / `firstAdminFunction`
  crée automatiquement une `agentInvitation` pending pour le 1er admin organisme
- [x] Dialog platform `RegisterOrganismDialog` étendu : affiche le lien
  d'enrôlement copiable au retour, suffisant pour transmettre manuellement
- [x] Composant `FirstStepsBanner` sur dashboard admin (checklist 3 étapes :
  équipe invitée, SAE configuré, service publié)
- [x] Mutation `admin.onboarding.finalizeActivation` (admin_organisme passe son
  organism de `onboarding` → `active`, clôture le `onboardingProcess`, audit)
- [x] Permission `organism.finalize_self` exclusive à admin_organisme
- [x] 8 tests dédiés (`admin/onboarding.test.ts`)
- [ ] Génération de convention onboarding via template + MCP Lumin (P3)
  *(dépend de la décision provider signature qualifiée)*
- [ ] Signature électronique de la convention par le représentant de l'organisme
  *(idem)*

### Notifications réelles — Phase A ✅ (architecture, dispatch à brancher)
- [x] `NotificationProvider` pluggable (`lib/notificationProvider.ts`) :
  `notify(ctx, args)` insère in_app + queue dans `notificationOutbox` selon
  préférences destinataire
- [x] Table `notificationOutbox` avec lifecycle pending/sent/failed/skipped
- [x] Champ `notificationPreferences` (email/sms/muteKinds) sur `citizens` et
  `agents` schemas
- [x] Skeletons `StubEmailProvider` + `StubSmsProvider` qui logent (interface
  prête, dispatch effectif Phase 2)
- [x] `forceChannels` pour bypass mute (alertes critiques)
- [x] 15 sites migrés depuis `ctx.db.insert("notifications", …)` direct vers
  `notify()` (admin, citizen, lib, issuance, correspondence)
- [x] 13 tests dédiés (`lib/notificationProvider.test.ts`)
- [ ] **Phase 2** : implémenter `StubEmailProvider.send()` avec un vrai provider
  (Resend / Postmark / SMTP DGAN) — choix env-var `EMAIL_PROVIDER_API_KEY`
- [ ] **Phase 2** : implémenter `StubSmsProvider.send()` avec Twilio ou Airtel/Moov
- [ ] **Phase 2** : worker scheduler qui vide `notificationOutbox` (status=pending)
  et marque sent/failed selon retour provider

### Dispatch Digitalium SAE — Phase D ✅
- [x] Action Node `sae/dispatch.ts::toDigitalium` avec fetch + HMAC-SHA256
  conforme ADR-0021 (X-Event-Id + X-Digitalium-Signature)
- [x] Retry borné (3 tentatives) avec backoff exponentiel 10s → 60s → 300s
- [x] Idempotence locale (`already_dispatched`) + côté SAE (`X-Event-Id = archiveId`)
- [x] Skip gracieux si secret env absent (cas dev/test)
- [x] Activation dans `DigitaliumSaeProvider.verse()` via `scheduler.runAfter(0, …)`
- [x] Mutations internes `markDispatched`, `markFailed`, `markSkipped`
- [x] 8 tests dédiés avec mock fetch + vérification HMAC bit-exact
- [ ] **Activation prod** : définir `DIGITALIUM_HMAC_SECRET` dans env Convex,
  configurer `saeConfig.digitaliumConnectorId` + `digitaliumBaseUrl` sur les
  organisms cibles

### Audit RGAA global — Phase E ✅
- [x] Suppression des `<main>` dupliqués sur 6 pages admin (layout (app) en
  fournit déjà un)
- [x] Skip link + main landmark ajoutés sur platform-web `(app)` layout
- [x] Skip link + main landmark ajoutés sur citizen-web `PublicShell` (vitrine)
- [x] Pages Bloc 3 / 5 / 6 conservent leurs patterns RGAA (live regions,
  useModalA11y, role=region + aria-labelledby)

### Tests E2E Playwright — Phase F ✅ (infra, scénarios à exécuter)
- [x] `playwright.config.ts` multi-projet (citizen 3000, admin 3001, platform 3002)
- [x] 3 smoke specs (skip link, main landmark, redirections, enrôlement invalide)
- [x] tsconfig isolé `tests-e2e/tsconfig.json`
- [x] README setup + script root `bun run test:e2e`
- [x] `@playwright/test` ajouté en devDep root
- [ ] **À exécuter** : `bun playwright install chromium` + démarrer les 3
  serveurs + `bun run test:e2e` pour valider que les smoke passent
- [ ] **Scénarios profonds v2** : login complet, soumission demande, parcours
  signature, vérification QR (nécessitent seed Convex contrôlé)

---

## Suivi global

| Bloc | État | Démarré le | Clôturé le |
|---|---|---|---|
| 1. Cycle de vie service | ✅ backend + UI | 2026-05-24 | 2026-05-24 |
| 2. Dépôt en profondeur | ✅ backend + UI (validation manuelle à faire) | 2026-05-25 | 2026-05-25 |
| 3. Traitement demande | ✅ backend + UI (validation manuelle à faire) | 2026-05-26 | 2026-05-26 |
| 4. Document vérifiable | ✅ backend + UI + QR (test scan manuel à faire) | 2026-05-26 | 2026-05-26 |
| 5. Correspondance | ✅ backend + UI admin + UI citoyen + RGAA (test manuel à faire) | 2026-05-26 | 2026-05-26 |
| 6. Archivage SAE | ✅ hybride Option C (local + skeleton Digitalium) | 2026-05-26 | 2026-05-26 |
| Trous A — NotificationProvider | ✅ adapter + outbox + 13 tests | 2026-05-27 | 2026-05-27 |
| Trous B — Gestion d'équipe | ✅ invitations + lifecycle + UI + 21 tests | 2026-05-27 | 2026-05-27 |
| Trous C — Onboarding réel | ✅ bootstrap platform → admin + 8 tests | 2026-05-27 | 2026-05-27 |
| Trous D — Dispatch Digitalium | ✅ HMAC réel + retry + 8 tests | 2026-05-27 | 2026-05-27 |
| Trous E — Audit RGAA global | ✅ landmarks cohérents 3 apps | 2026-05-27 | 2026-05-27 |
| Trous F — E2E Playwright | ✅ infra + 3 smoke specs (exécution à faire) | 2026-05-27 | 2026-05-27 |
| Trous G — Push origin/main | ✅ 58 commits poussés | 2026-05-27 | 2026-05-27 |

**Métriques cumulées** : 289 tests backend (18 fichiers), typecheck OK sur les
6 packages, 0 lint error, 58 commits sur origin/main.

---

## Ce qui reste vraiment (à faire ensuite)

### 🔴 Critique pour aller en prod
- [ ] **Validation manuelle bout-en-bout** : démarrer Convex + 3 apps, faire un
  parcours réel complet (citoyen dépose → agent instruit → signataire vise →
  délivrance PDF → vérif QR public → archivage SAE). Documenter les bugs.
- [ ] **CI/CD GitHub Actions** : pipeline auto (typecheck + tests + lint + build)
  sur chaque PR, bonus preview Vercel par PR.
- [ ] **Décisions architecturales** (voir section ci-dessous) — bloquent
  Convention onboarding + Délivrance signée qualifiée.

### 🟡 Phase 2 des skeletons (architecture déjà prête)
- [ ] Brancher 1 vrai provider email dans `StubEmailProvider.send()` + worker
  outbox (cf. Trous A)
- [ ] Brancher 1 vrai provider SMS (cf. Trous A)
- [ ] Activer Digitalium SAE en réel : env vars + saeConfig sur organisms cibles
  (cf. Trous D)
- [ ] Convention onboarding : génération template + signature électronique
  (cf. Trous C — dépend du choix provider signature qualifiée)

### 🟢 Quality-of-life
- [ ] Exécuter les smoke E2E Playwright (cf. Trous F)
- [ ] Audit RGAA externe officiel (audit interne fait, tampon cabinet manquant)
- [ ] Observabilité : Sentry + logs structurés + dashboard santé
- [ ] Documentation utilisateur : guide agent + guide citoyen (PDF)
- [ ] Pen-test sécurité : revue OWASP, secrets management formel
- [ ] Scénarios E2E profonds (login complet, soumission, signature, vérif QR)

---

## Décisions architecturales en attente

- [ ] **Provider PDF** : jsPDF côté serveur Convex action ✅ déjà implémenté en v1
  (`pdf/render.ts` + `pdf/action.ts`). Confirmer ou basculer microservice
  puppeteer pour rendu plus riche.
- [ ] **Provider horodatage qualifié RFC 3161** : existe-t-il un TSA gabonais
  agréé ? Sinon fallback sur stub `qualifiedTimestamp` actuel.
- [ ] **Provider signature qualifiée** : Lumin MCP envisagé. Bloque la convention
  onboarding (Trous C reste partiel).
- [ ] **Stratégie de versionnage des templates** : champ `documents.templateVersion`
  déjà prévu — confirmer le snapshot au moment de l'émission.
- [ ] **Provider email transactionnel** : Resend / Postmark / SMTP DGAN ? Bloque
  Trous A Phase 2.
- [ ] **Provider SMS Gabon** : Twilio (international) ou Airtel/Moov (local) ?
  Bloque Trous A Phase 2.
