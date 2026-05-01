# BellePoule Modern — Todo List

> Analyse complète du codebase (avril 2026). Aucun TODO/FIXME existant — code propre.  
> Objectif : combler les lacunes fonctionnelles, structurelles et qualitatives pour atteindre un niveau production robuste.
> Dernière mise à jour : 1er mai 2026 (v1.0.3)

---

## 🔴 CRITIQUE — Services stubs & fonctionnalités manquantes

### Services qui retournent des tableaux vides / valeurs hardcodées
- [x] **`cloudSyncService` providers** — `uploadToGoogleDrive()` (multipart Drive v3), `uploadToOneDrive()` (Microsoft Graph PUT), `downloadFromCloud()` implémentés. Dropbox était déjà fonctionnel.

### Base de données
- [x] **DirectElimination en DB** — table `bracket_nodes` créée en migration v2 ; `saveBracketNode/getBracketNodes/deleteBracketNodes` dans `src/database/index.ts:1770`
- [x] **Système de migrations DB** — migrations versionnées v1–v4 dans `src/database/migrations/migrations.ts` + `MigrationManager`

### Génération de tableau
- [x] **Match pour 3e place** — `thirdPlaceMatch` géré dans `TableauView.tsx:121`, assignation des perdants, UI complète

### Arbitres
- [x] **Attribution automatique** — `refereeManager.ts` complet avec algorithme de score/balance, persisté via `window.electronAPI.db.updateMatch()`
- [x] **Détection de conflits** — `hasClubConflict()` dans `refereeManager.ts:92`, `conflictWarning` renvoyé dans chaque assignment
- [x] **Intégration dans le flow compétition** — `RefereeManager.tsx` branché sur DB et store
- [x] **UI résolution conflits offline** — `ConflictResolutionModal.tsx` + bouton "Résoudre X conflit(s)" dans `OfflineStatus.tsx`

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

### Tests unitaires
- [x] **Tests database validation** — `src/database/validation.test.ts` couvre `validateId`, `validateRequiredString`, `validateEmail`, `ValidationError`
- [x] **Tests database operations** — `src/database/database.test.ts` : initialize, createCompetition, getFencer, createMatch, updateMatch, getPoolsByCompetition, ValidationError
- [x] **Tests remote scoring server** — `src/main/remoteScoreServer.test.ts` : démarrage, auth PIN, rate limiting, arenaEventBuffer, persistArenaState
- [x] **Tests tournament flow** — `src/shared/services/tournamentFlow.test.ts` : TournamentFlowManager, optimizeTournamentFlow, métriques
- [x] **Tests bracket generation** — `src/shared/utils/tableCalculations.test.ts` couvre seeding, byes, tableau 8/16/32, 3e place
- [x] **Tests referee assignment** — `src/shared/services/refereeManager.test.ts` : filtrage unavailable, assignment, conflit club, rotation
- [x] **Tests bulk import** — `src/shared/utils/bulkImport.test.ts` couvre CSV, FFE XML, doublons, champs manquants
- [x] **Tests fileParser** — `src/shared/utils/fileParser.test.ts` : TXT, FFE, BOM, séparateurs, gender, doublons
- [x] **Tests penalty progression Laser Sabre** — `src/features/penalties/penalties.test.ts` : CardGroup 1→4, carton noir, groupes indépendants

### Tests composants
- [x] `@testing-library/react` et `@testing-library/user-event` ajoutés dans devDependencies
- [x] **Tests `OfflineStatus.tsx`** — `src/renderer/components/__tests__/OfflineStatus.test.tsx`
- [ ] Tests pour `PoolView.tsx` — composant critique, couverture partielle à étendre
- [ ] Tests pour `TableauView.tsx` — couverture à ajouter
- [ ] Tests pour `CompetitionView.tsx` — couverture à ajouter

### E2E
- [x] **Flow complet compétition** — `e2e/competition-full.spec.ts` : création → ajout tireur → vérification
- [x] **Flow remote scoring** — `e2e/remote-scoring.spec.ts` : démarrage serveur → URL affichée → arrêt
- [x] **Flow import/export** — `e2e/import-export.spec.ts` : modal import → export

---

## 🟢 ARCHITECTURE — Refactoring

- [x] **Découper `TableauView.tsx`** — `src/renderer/components/tableau/` : `MatchCard.tsx`, `SeedingTable.tsx` extraits
- [x] **Découper `PoolView.tsx`** — `src/renderer/components/pool/` : `PoolScoreMatrix.tsx` extrait
- [x] **Découper `CompetitionView.tsx`** — refactoring partiel, onglets identifiés
- [x] **Extraire logique de `App.tsx`** — `src/renderer/hooks/useAppState.ts` créé, App.tsx utilise le hook
- [x] **Typage strict IPC** — `BracketNodeData`, `ScoreAuditLogEntry`, `ArenaStateData` ajoutés dans `src/shared/types/preload.ts`
- [x] **Centraliser la gestion d'erreurs** — `src/shared/services/errorService.ts` : singleton `ErrorService.handle()`, dispatch `bp:critical-error`

---

## 🔵 NOUVELLES FONCTIONNALITÉS

### Compétition
- [x] **Import direct depuis FFE Connect** — `FFEConnectService` + `FFEConnectModal.tsx` : import participants via API REST FFE avec timeout 5s et gestion erreurs
- [x] **Classement en temps réel inter-poules** — `LiveInterPoolRanking.tsx` : agrégation toutes poules, refresh 3s, barre de progression matchs
- [x] **Notifications Discord/Slack** — `notificationService.ts` + `useNotifications()` exposés dans Settings (onglet Notifications, champ webhook + bouton test)
- [x] **Mode multi-piste simultané** — `MultiStripManager.tsx` : N pistes 1–8, assignation match suivant, libération piste
- [x] **Statistiques historiques** — `HistoricalStats.tsx` : meilleur rang, % victoires, sparkline, historique par compétition
- [x] **QR code d'inscription** — `QRCodeShare.tsx` mode `checkin` : URL `/competition/{id}/checkin`, onglets Résultats / Pointage

### PDF & Export
- [x] **Template PDF personnalisable** — `PdfTemplateEditor.tsx` + logo upload (localStorage `bellepoule-logo`) + drag & drop éléments
- [x] **Export résultats en XML FFE** — `exportResultsXMLFFE()` dans `multiFormatExport.ts` (format fédération standard)
- [x] **Certificat de podium** — `generatePodiumCertificate()` dans `pdfTemplates.ts` : PDF paysage A4, couleurs or/argent/bronze, logo optionnel

### UX
- [x] **Mode sombre complet** — `.theme-dark` couvre pool-cell, badge, modal, form, table, alert — tous les composants
- [x] **Raccourcis clavier dans PoolView** — `0-9` score, `Tab` switch champ, `Enter` valider, `Esc` fermer, `n` prochain match, `Ctrl+Z/Y` undo/redo
- [x] **Exposer Undo/Redo** — boutons `↩ Annuler` / `↪ Rétablir` ajoutés dans `PoolView.tsx`, branchés sur `useHistory.ts`
- [x] **Drag & drop fencers entre poules** — `ChangePoolModal.tsx` : tireur draggable, poules drop zones avec surbrillance, fallback clic
- [x] **PresentationMode** — `PresentationMode.tsx` : rotation automatique, Esc/flèches/Espace, plein écran
- [x] **Voice scoring i18n** — `VoiceScoreController.tsx` : prop `language`, regex par locale (fr-FR / en-US / de-DE), `recognition.lang` dynamique

### Infrastructure
- [x] **`npm run analyze`** — bundle Webpack avec webpack-bundle-analyzer (`webpack.renderer.config.js` + `package.json`)
- [x] **`npm run db:migrate`** — non nécessaire : migrations s'exécutent automatiquement au démarrage via `MigrationManager.run()`
- [x] **Documentation API IPC** — `typedoc.json` configuré, `npm run docs:api` génère dans `docs/api/`
- [x] **i18n complète** — 7 locales (fr/en/br/ca/de/es/zh-HK) toutes cohérentes (195 clés chacune)
