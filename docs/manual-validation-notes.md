# Notes de validation manuelle — 2026-05-27

> Trouvailles pendant le parcours bout-en-bout des 3 apps avec
> Convex live + seed nominal. Format : un check par item, sévérité,
> apps concernées, action recommandée.
>
> **Légende sévérité** :
> - 🔴 **bloquant** — empêche d'utiliser une fonctionnalité
> - 🟠 **gênant** — UX cassée, lien mort, mais contournable
> - 🟡 **cosmétique** — affichage, message d'erreur, micro-copie
> - 🟢 **idée d'amélioration** — pas un bug, suggestion

---

## Bugs déjà fixés en cours de validation (rappel)

- ✅ `lib/smime.ts` utilisait `node:crypto` au lieu de Web Crypto — bloquait `convex dev` (commit `940a32b`)
- ✅ Dashboard admin crashait si query `getOnboardingStatus` échouait — wrap catch fallback null (commit `7f902af`)
- ✅ `pdf/render.tsx` sans `"use node"` + tsconfig sans JSX — bloquait push (commit `9819a12`)
- ✅ `sae/dispatch.ts` mixait queries+mutations dans Node + utilisait `action` au lieu de `internalAction` — bloquait push (commit `9819a12`)

---

## Récapitulatif par app

### App admin-web (port 4001) — pages parcourues

| Page | Statut | Notes |
|---|---|---|
| `/login` | ✅ | NIPs de démo affichés, RGAA conforme |
| `/` dashboard | ✅ | KPI, sparkline, demandes assignées, sidebar |
| `/demandes` | ✅ | 5 demandes seedées, filtres, badges colorés |
| `/demandes/[ref]` | ✅ | Tabs (Instruction/Pièces/Historique/Messages), sidebar échéance, actions |
| `/equipe` | ✅ | Phase B : 4 KPI, tabs Membres/Invitations, contrôle d'accès canManage |
| `/enrolement/[token]` (public) | ✅ | Phase B : message clair pour token invalide |
| `/signatures` | ✅ | Empty state élégant, tabs À approuver / Décisions récentes |
| `/correspondance` | ⚠️ | Décalage compteur sidebar vs vue |
| `/archives` | ✅ | Bloc 6 : banner SAE non configuré, 4 KPI, 2 archives, tabs |
| `/services` | ✅ | 6 services, tabs avec compteurs, table riche |
| `/annuaire` | ⚠️ | "Contacter" inerte + pluriel mal géré |
| `/parametres` | ✅ | Identité, droits, préférences notifs |

### App citizen-web (port 4000, HTTPS) — pages parcourues

| Page | Statut | Notes |
|---|---|---|
| `/` vitrine | ⚠️ | Incohérence chiffres + pluriels |
| `/services` | 🔴 | **404 brut sans design** |
| `/aide` | ✅ | Empty state propre |
| `/login` | ✅ | Form NIP + IDN alternative |
| `/mon-espace` | ✅ | Dashboard complet (KPI, demandes, messages, recos) |
| `/mon-espace/courriers` | ✅ | Reçus/Envoyés tabs propres |
| `/verifier/[code]` (public) | ✅ | Bloc 4 : message + FAQ pour code invalide |

### App platform-web (port 4002) — pages parcourues

| Page | Statut | Notes |
|---|---|---|
| `/login` | ✅ | Form NIP, démo affichée |
| `/` supervision | ✅ | 6 KPI, graphe, santé composants |

---

## Bugs détaillés

### 🔴 BLOQUANT

#### B1 — `/services` côté citizen renvoie 404 brut

- **App** : citizen-web
- **Page** : `https://localhost:4000/services`
- **Constaté** : page noire avec "404 / This page could not be found" — pas de design system, pas de header, pas en français
- **Attendu** : soit la page existe (catalogue public), soit la 404 est brandée (logo Gabon Connect + filet tricolore + message FR + bouton retour)
- **Sources** : pas de `app/services/page.tsx` côté citizen-web, pas de `app/not-found.tsx` non plus
- **Action recommandée** :
  1. Soit créer la page liste catalogue `/services` (la nav ne pointe pas dessus mais des liens externes peuvent y aller)
  2. Créer un `app/not-found.tsx` brandé pour TOUTES les 404 côté citizen
  3. Idem pour admin-web et platform-web

### 🟠 GÊNANTS

#### B2 — Sidebar admin "Dossiers citoyens" pointe vers un NIP hardcodé

- **App** : admin-web (toutes les pages, sidebar globale)
- **Constaté** : href = `/dossiers/184127600504` (NIP de Marie OBAME en dur)
- **Attendu** : href = `/dossiers` (liste des dossiers citoyens)
- **Source** : `apps/admin-web/src/lib/admin-nav.ts:28`
- **Action recommandée** : créer `app/(app)/dossiers/page.tsx` (liste filtrée par organisme), puis fix href

#### B3 — Sidebar admin "Génération" pointe vers une ref hardcodée

- **App** : admin-web (sidebar globale)
- **Constaté** : href = `/generation/GC-2026-EC-002841` (ref demande en dur)
- **Attendu** : href = `/generation` (liste actes à générer / récents)
- **Source** : `apps/admin-web/src/lib/admin-nav.ts:41`
- **Action recommandée** : créer `app/(app)/generation/page.tsx`, puis fix href

#### B4 — Cloche de notifications inerte (header admin)

- **App** : admin-web (header global)
- **Constaté** : badge avec point rouge "non-lu" visible, mais clic = aucune action (pas de panel qui s'ouvre)
- **Attendu** : un panel/popover s'ouvre avec la liste des notifications récentes (la table `notifications` existe déjà avec `recipientKind=agent`)
- **Source** : `packages/ui/src/components/app-header.tsx`
- **Action recommandée** : implémenter un Popover qui appelle une query `api.admin.notifications.listForAgent`, marque les notifs en `readAt` au survol

#### B5 — Bouton "Aide" header admin inerte

- **App** : admin-web (header global)
- **Constaté** : clic = aucune action
- **Attendu** : soit redirige vers une page `/aide` admin, soit ouvre un drawer help
- **Action recommandée** : `<Link href="/aide">` ou implémenter drawer help

#### B6 — Avatar utilisateur header inerte (pas de menu logout/profil)

- **App** : admin-web (header global, probablement aussi platform-web)
- **Constaté** : clic sur avatar/nom Yolande NGUEMA = aucune action
- **Attendu** : dropdown avec "Mon compte (→ /parametres)" + "Déconnexion" + "Changer d'organisme" (si plusieurs)
- **Source** : `packages/ui/src/components/app-header.tsx`
- **Action recommandée** : implémenter dropdown menu + server action `logout` qui clear cookie session

#### B7 — Nav vitrine citoyen : "Démarches" → `/`, "Aide" → `#`

- **App** : citizen-web (header vitrine)
- **Constaté** :
  - "Démarches" pointe vers `/` (la home elle-même)
  - "Aide" pointe vers `#` (lien cassé)
- **Attendu** :
  - "Démarches" → `/services` ou la section #demarches-par-theme de la home (anchor)
  - "Aide" → `/aide` (qui existe et est belle)
- **Source** : `apps/citizen-web/src/components/public-shell.tsx` (NAV array)
- **Action recommandée** : corriger les hrefs

#### B8 — "Contacter" dans /annuaire admin inerte

- **App** : admin-web
- **Page** : `/annuaire`
- **Constaté** : bouton "Contacter" sur chaque ligne admin → clic sans effet
- **Attendu** : soit ouvre un dialog "Envoyer un courrier à cette administration" (préremplit le wizard `/correspondance/nouveau` avec destinataire), soit redirige vers `/correspondance/nouveau?to=<organismId>`
- **Action recommandée** : implémenter le handler du bouton

#### B9 — Compteur sidebar "Correspondance 6" décalé de la vue

- **App** : admin-web
- **Page** : `/correspondance`
- **Constaté** : sidebar affiche "Correspondance 6" (6 non-lues) mais sous-tab "Tous" sous "Reçus" dit "Aucune correspondance dans cette vue"
- **Attendu** : si le compteur = 6, au moins une vue doit afficher des corres
- **Action recommandée** : aligner la query `getSidebarCounts` avec `listInboxV2` — vérifier le filtre par `recipientOrganismId` ou par `agentId` assignment

### 🟡 COSMÉTIQUES

#### C1 — Pluriels mal gérés (sing/plur "1 services")

- **Apps** : admin-web (`/annuaire`), citizen-web (`/`)
- **Constaté** :
  - "1 services" (devrait être "1 service")
  - "1 démarches" (devrait être "1 démarche")
  - "0 services" (devrait être "Aucun service")
- **Action recommandée** : helper `pluralize(n, "service")` dans `@workspace/ui` ou inline ternaires `n > 1 ? "s" : ""`

#### C2 — "collectivite" en minuscules dans /annuaire

- **App** : admin-web `/annuaire`
- **Constaté** : ligne "Mairie de Libreville" → catégorie "collectivite" (lower-case)
- **Attendu** : "Collectivité" (label humain)
- **Action recommandée** : helper `categoryLabel(category)` (déjà existe pour onboarding wizard côté backend, le réutiliser ou exposer côté UI)

#### C3 — Incohérence chiffres home citoyen : "14 services" vs "128 services proposés"

- **App** : citizen-web `/`
- **Constaté** :
  - Card stats : "14 Services disponibles"
  - Section "Démarches par thème" : "Parcourez les **128 services** proposés par les administrations gabonaises"
- **Attendu** : les deux chiffres correspondent à la réalité du seed (probablement 14 publiés total) — le 128 semble être une valeur en dur copywriting
- **Action recommandée** : le 128 dans le sous-titre doit venir de la même query stats

#### C4 — Suggestion "RCCM" non explicité

- **App** : citizen-web `/`
- **Constaté** : chips de suggestions "acte de naissance", "passeport", "RCCM", "casier judiciaire"
- **Attendu** : "RCCM" est un acronyme métier (Registre Commerce/Crédit Mobilier) — peu accessible au grand public
- **Action recommandée** : "Registre commerce (RCCM)" ou tooltip explicatif

---

## Patterns transversaux à vérifier (TODO)

- [ ] Toutes les pages des 3 apps ont un `app/not-found.tsx` brandé
- [ ] Tous les boutons "Export CSV" / "Exporter" ont une vraie action
- [ ] Le sélecteur d'organisme "DG État Civil ▼" dans le header admin est-il fonctionnel ? (un agent peut-il appartenir à plusieurs orgs ?)
- [ ] Header platform-web : cloche / aide / avatar — mêmes 3 bugs que admin-web ?
- [ ] Les liens "Voir tout l'annuaire" / "Voir la file de demandes" en CTA secondaires marchent-ils ?
- [ ] Les filtres avancés (date range, etc.) fonctionnent-ils dans /demandes, /correspondance ?
- [ ] Recherche globale dans header présente ? Manquante ?
- [ ] Switch dark/light theme : présent ? attendu ?

---

## Pages NON encore parcourues (à valider plus tard)

### admin-web
- [ ] `/dossiers/[nip]` détail dossier 360°
- [ ] `/generation/[ref]` page génération
- [ ] `/services/[slug]` édition service
- [ ] `/services/nouveau` création
- [ ] `/correspondance/nouveau` wizard
- [ ] `/correspondance/[ref]` thread
- [ ] `/archives/[cote]` détail archive

### citizen-web
- [ ] `/administrations` annuaire public
- [ ] `/mon-espace/demarches` liste demandes
- [ ] `/mon-espace/demarches/[ref]` détail
- [ ] `/mon-espace/courriers/[ref]` thread
- [ ] `/mon-espace/courriers/nouveau` form
- [ ] `/contact`, `/cgu`, `/mentions-legales`, `/accessibilite`, `/etat-du-service`
- [ ] `/design-system`

### platform-web
- [ ] `/organisations` registre
- [ ] `/organisations/[id]` ou dialog
- [ ] `/onboarding` wizard
- [ ] `/catalogue` services
- [ ] `/citoyens` annuaire
- [ ] `/infrastructure`
- [ ] `/securite`
- [ ] `/statistiques`
- [ ] `/parametres`

---

## Prochaines actions recommandées

**Priorité haute** :
1. Fix B1 (404 citizen + 404 brandée pour les 3 apps)
2. Fix B2 + B3 (créer pages liste `/dossiers` et `/generation` admin)
3. Fix B7 (nav vitrine citoyen liens cassés)

**Priorité moyenne** :
4. Fix B4 + B6 (cloche notif + avatar dropdown — touchent toutes les pages)
5. Fix B9 (cohérence compteur correspondance vs liste)
6. Fix B8 (bouton Contacter annuaire)

**Priorité basse** :
7. Lot cosmétique C1-C4 (un seul commit "polish")
8. Continuer le parcours sur les pages non visitées
