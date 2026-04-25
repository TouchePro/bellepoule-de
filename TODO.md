# BellePoule Modern — Todo List

> Analyse complète du codebase (avril 2026). Aucun TODO/FIXME existant — code propre.  
> Objectif : combler les lacunes fonctionnelles, structurelles et qualitatives pour atteindre un niveau production robuste.
> Dernière mise à jour : 25 avril 2026

---

## 🔴 CRITIQUE — Services stubs & fonctionnalités manquantes

### Services qui retournent des tableaux vides / valeurs hardcodées
- [ ] **`cloudSyncService` providers** — `uploadToDropbox/GoogleDrive/OneDrive/Custom()` tous stubs non implémentés

### Base de données
- [x] **DirectElimination en DB** — table `bracket_nodes` créée en migration v2 ; `saveBracketNode/getBracketNodes/deleteBracketNodes` dans `src/database/index.ts:1770`
- [x] **Système de migrations DB** — migrations versionnées v1–v4 dans `src/database/migrations/migrations.ts` + `MigrationManager`

### Génération de tableau
- [x] **Match pour 3e place** — `thirdPlaceMatch` géré dans `TableauView.tsx:121`, assignation des perdants, UI complète

### Arbitres
- [x] **Attribution automatique** — `refereeManager.ts` complet avec algorithme de score/balance, persisté via `window.electronAPI.db.updateMatch()`
- [x] **Détection de conflits** — `hasClubConflict()` dans `refereeManager.ts:92`, `conflictWarning` renvoyé dans chaque assignment
- [x] **Intégration dans le flow compétition** — `RefereeManager.tsx` branché sur DB et store
- [ ] **UI résolution conflits offline** — `useOffline.ts` expose un compteur `conflicts` sans UI de résolution (base : `conflictResolution.ts`)

---

## 🟠 IMPORTANT — Remote Scoring & Affichage

- [x] **Persistance état arène** — `persistArenaState()` appelé après chaque modification dans `remoteScoreServer.ts:2431` → table `arena_state` (migration v4)
- [x] **Queue de matchs par arène** — `sessionMatches` + `matchQueue` gérés dans `remoteScoreServer.ts`
- [x] **Reconnexion WebSocket avec replay** — `arenaEventBuffer` avec TTL 5 min dans `remoteScoreServer.ts`, replay à la reconnexion
- [x] **Affichage "prochains matchs"** dans `arena.html` — `#next-match-panel` avec noms/clubs, CSS complet (`arena.html:1016`)
- [x] **Mode spectateur** — `dashboard.html` reçoit `pools:update`, `matches:update` via Socket.IO, rendu backend complet
- [x] **Kiosk auto-refresh** — `KioskDisplay.tsx:196` : rotation pools (10s), auto-scroll classement/tableau, auto-switch vers tableau à l'élimination
- [x] **Trail d'audit scores** — `this.db.logScoreChange()` appelé dans `remoteScoreServer.ts:810` et `2072`, table `score_audit_log` (migration v3)
- [x] **Protection PIN des arènes** — `login.html` avec `POST /api/auth/login/{arenaId}`, rate limiting login, redirect configurable
- [x] **Rate limiting** sur les soumissions de score — `scoreRateLimit` Map dans `remoteScoreServer.ts`, délai 500ms par socket/match
- [x] **Indicateur sync offline** — `#offline-badge` + `#sync-indicator` dans `referee.html:692`, queue IndexedDB visible

---

## 🟡 QUALITÉ — Tests

### Tests unitaires manquants
- [x] **Tests database validation** — `src/database/validation.test.ts` couvre `validateId`, `validateRequiredString`, `validateEmail`, `ValidationError`
- [ ] **Tests database operations** — zéro test pour `src/database/index.ts`
- [ ] **Tests remote scoring server** — Socket.IO, état arène, offline queue
- [ ] **Tests tournament flow** — transitions de phase, `src/shared/services/tournamentFlow.ts`
- [x] **Tests bracket generation** — `src/shared/utils/tableCalculations.test.ts` couvre seeding, byes, tableau 8/16/32, 3e place
- [ ] **Tests referee assignment** — détection conflits, rotation automatique
- [x] **Tests bulk import** — `src/shared/utils/bulkImport.test.ts` couvre CSV, FFE XML, doublons, champs manquants
- [ ] **Tests fileParser** — `src/shared/utils/fileParser.ts` (1268 lignes, zéro couverture)
- [ ] **Tests penalty progression Laser Sabre** — règles CardGroup non testées

### Tests composants (zéro actuellement)
- [ ] Ajouter `@testing-library/react` et `@testing-library/user-event`
- [ ] Tests pour `PoolView.tsx` — composant le plus critique (~55K)
- [ ] Tests pour `TableauView.tsx` — ~62K, aucune couverture
- [ ] Tests pour `CompetitionView.tsx` — ~45K, aucune couverture

### E2E (skeletons actuellement)
- [ ] **Flow complet** : compétition → import tireurs → génération poules → saisie scores → classement → tableau → résultats
- [ ] **Flow remote scoring** : démarrage serveur → connexion arbitre → saisie touche → synchronisation arène
- [ ] **Flow import/export** : import XML FFE → vérification données → export PDF résultats

---

## 🟢 ARCHITECTURE — Refactoring

- [ ] **Découper `TableauView.tsx` (~62K)** — extraire : `BracketTree`, `MatchCard`, `SeedingTable`, `ThirdPlaceMatch`
- [ ] **Découper `PoolView.tsx` (~55K)** — extraire : `PoolScoreMatrix`, `PoolTimer`, `CardPanel`, `TouchHistory`
- [ ] **Découper `CompetitionView.tsx` (~45K)** — extraire les onglets : `FencersTab`, `PoolsTab`, `TableauTab`, `ResultsTab`
- [ ] **Extraire logique de `App.tsx`** — 535 lignes UI + logique mélangées ; créer un `useAppState` hook
- [ ] **Typage strict IPC** — vérifier que tous les handlers IPC dans `main.ts` ont des types dans `src/shared/types/preload.ts`
- [ ] **Centraliser la gestion d'erreurs** — dispersée actuellement ; créer un service centralisé consommant `errorLogger.ts`

---

## 🔵 NOUVELLES FONCTIONNALITÉS

### Compétition
- [ ] **Import direct depuis FFE Connect** — API REST FFE pour récupérer les inscriptions automatiquement
- [ ] **Classement en temps réel inter-poules** — dashboard des scores en cours avec mise à jour live
- [x] **Notifications Discord/Slack** — `notificationService.ts` + `useNotifications()` exposés dans Settings (onglet Notifications, champ webhook + bouton test)
- [ ] **Mode multi-piste simultané** — orchestrer plusieurs pistes avec répartition automatique des matchs
- [ ] **Statistiques historiques** — comparer performances d'un tireur sur plusieurs compétitions (DB multi-compétition)
- [ ] **QR code d'inscription** — scanner pour confirmer présence depuis téléphone

### PDF & Export
- [ ] **Template PDF personnalisable** — logo, couleurs, mentions légales via `ThemeEditor.tsx` / `pdfTemplates.ts`
- [ ] **Export résultats en XML FFE** — format standard fédération pour soumission
- [ ] **Certificat de podium** — PDF pour les 3 premiers avec logo club/compétition

### UX
- [ ] **Mode sombre complet** — `ThemeEditor.tsx` est là ; vérifier cohérence CSS dark mode sur tous les composants
- [ ] **Raccourcis clavier dans PoolView** — saisie de score au clavier sans souris
- [x] **Exposer Undo/Redo** — boutons `↩ Annuler` / `↪ Rétablir` ajoutés dans `PoolView.tsx`, branchés sur `useHistory.ts`
- [ ] **Drag & drop fencers entre poules** — remplacer le select dans `ChangePoolModal.tsx`
- [ ] **PresentationMode** — `PresentationMode.tsx` : vérifier et compléter pour usage projecteur
- [ ] **Voice scoring i18n** — `VoiceScoreController.tsx` : vérifier support multilingue Web Speech API

### Infrastructure
- [x] **`npm run analyze`** — bundle Webpack avec webpack-bundle-analyzer (`webpack.renderer.config.js` + `package.json`)
- [ ] **`npm run db:migrate`** — non nécessaire : migrations s'exécutent automatiquement au démarrage via `MigrationManager.run()`
- [ ] **Documentation API IPC** — TypeDoc ou manuel des handlers IPC
- [x] **i18n complète** — 7 locales (fr/en/br/ca/de/es/zh-HK) toutes cohérentes (195 clés chacune)
