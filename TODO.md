# BellePoule Modern — Todo List

> Analyse complète du codebase (avril 2026). Aucun TODO/FIXME existant — code propre.  
> Objectif : combler les lacunes fonctionnelles, structurelles et qualitatives pour atteindre un niveau production robuste.

---

## 🔴 CRITIQUE — Services stubs & fonctionnalités manquantes

### Services qui retournent des tableaux vides / valeurs hardcodées
- [ ] **`poolService.generatePools()`** — retourne `[]`, aucune logique réelle (`src/features/pools/services/poolService.ts`)
- [ ] **`poolCalculator.calculateRankings()`** — retourne `[]` placeholder (`src/features/pools/services/poolCalculator.ts:50`)
- [ ] **`bracketService.generateBracket()`** — placeholder vide (`src/features/bracket/services/bracketService.ts:23`)
- [ ] **`bracketService.updateMatchResult()`** — méthode vide (`src/features/bracket/services/bracketService.ts:54`)
- [ ] **`analyticsService.getCompetitionStats()`** — retourne des zéros hardcodés (`src/features/analytics/services/analyticsService.ts:27`)
- [ ] **`cloudSyncService` providers** — `uploadToDropbox/GoogleDrive/OneDrive/Custom()` tous stubs non implémentés
- [ ] **Double élimination** — `advanceWinner()` et `advanceLoser()` dans `useDEBracketStore.ts:182/198` → logique incomplète
- [ ] **Late fencers** — `updateDelays()` sort prématurément à la ligne 150, logique auto-forfeit absente

### Base de données
- [ ] **CRUD Referee** — zéro opération DB malgré le type `Referee` défini dans `src/shared/types/index.ts` (`src/database/index.ts`)
- [ ] **CRUD Phase** — `createPhase`, `getPhase`, `updatePhase`, `deletePhase`, `getPhasesByCompetition` absents ; config de phase non persistée
- [ ] **DirectElimination en DB** — types `DirectEliminationTable`, `TableNode` définis mais aucune table SQL ni opération DB
- [ ] **`getTouches` / `getCards`** — `saveTouch()` et `saveCard()` existent sans méthode de lecture ; historique et recalcul de score impossibles
- [ ] **Système de migrations DB** — actuellement `ALTER TABLE` avec try-catch ad-hoc ; implémenter migrations versionnées dans `src/database/migrations/`
- [ ] **Index manquants** — `match_cards.fencer_id`, `match_touches.fencer_id`, `matches.pool_id`, `pools.phase_id`

### Génération de tableau
- [ ] **Bracket d'élimination directe** — `useBracketStore` existe mais seeding + byes automatiques absents
- [ ] **Match pour 3e place** — aucune gestion DB ni frontend (`TableauView.tsx`)
- [ ] **Double élimination complète** — `useDEBracketStore` dans `src/features/doubleelimination/` incomplet

### Arbitres
- [ ] **Attribution automatique** — `refereeManager.ts` existe sans connexion DB ni store
- [ ] **Détection de conflits** — prévu dans CLAUDE.md, non implémenté
- [ ] **Intégration dans le flow compétition** — `RefereeManager.tsx` a la logique rotation/conflits mais n'est pas branché depuis `CompetitionView.tsx`
- [ ] **UI résolution conflits offline** — `useOffline.ts` expose un compteur `conflicts` sans UI de résolution (base : `conflictResolution.ts`)

---

## 🟠 IMPORTANT — Remote Scoring & Affichage

- [ ] **Persistance état arène** — config en mémoire dans `remoteScoreServer.ts` ; perdue au redémarrage ; persister en DB
- [ ] **Queue de matchs par arène** — implémenter ordre, next/previous, statuts
- [ ] **Reconnexion WebSocket avec replay** — rejouer les mises à jour manquées (buffer d'événements) à la reconnexion arbitre
- [ ] **Affichage "prochains matchs"** dans `arena.html` — liste avec noms/clubs des tireurs
- [ ] **Mode spectateur** — `dashboard.html` existe sans rendu backend ; implémenter affichage public des résultats en temps réel
- [ ] **Kiosk auto-refresh** — `KioskDisplay.tsx` : vérifier et compléter le rafraîchissement automatique des classements de poules
- [ ] **Trail d'audit scores** — journaliser chaque modification (qui, quand, correction) pour traçabilité en compétition officielle
- [ ] **Protection PIN des arènes** — token existe mais flow de login non implémenté dans `referee.html`
- [ ] **Rate limiting** sur les soumissions de score — éviter les double-soumissions concurrentes
- [ ] **Indicateur sync offline** — feedback visuel dans `referee.html` quand des actions sont en queue (`offlineQueue.ts`)

---

## 🟡 QUALITÉ — Tests

### Tests unitaires manquants
- [ ] **Tests database** — zéro test pour `src/database/index.ts` et `src/database/validation.ts`
- [ ] **Tests remote scoring server** — Socket.IO, état arène, offline queue
- [ ] **Tests tournament flow** — transitions de phase, `src/shared/services/tournamentFlow.ts`
- [ ] **Tests bracket generation** — seeding, byes, tableau 32/64
- [ ] **Tests referee assignment** — détection conflits, rotation automatique
- [ ] **Tests bulk import** — `src/shared/utils/bulkImport.ts`, parsing XML/FFE/CSV
- [ ] **Tests fileParser** — `src/shared/utils/fileParser.ts` (41K, zéro couverture)
- [ ] **Tests tableCalculations** — `src/shared/utils/tableCalculations.ts` (16K, zéro couverture)
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
- [ ] **Notifications Discord/Slack** — `notificationService.ts` existe ; l'exposer dans Settings avec test de webhook
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
- [ ] **Exposer Undo/Redo** — `useHistory.ts` existe (max 50 actions : UPDATE_SCORE, DELETE_FENCER…) mais aucun bouton UI ; brancher dans `PoolView.tsx` et `CompetitionView.tsx`
- [ ] **Drag & drop fencers entre poules** — remplacer le select dans `ChangePoolModal.tsx`
- [ ] **PresentationMode** — `PresentationMode.tsx` : vérifier et compléter pour usage projecteur
- [ ] **Voice scoring i18n** — `VoiceScoreController.tsx` : vérifier support multilingue Web Speech API

### Infrastructure
- [ ] **`npm run type-check`** — `tsc --noEmit` pour validation CI sans compilation
- [ ] **`npm run analyze`** — bundle Webpack avec webpack-bundle-analyzer
- [ ] **`npm run test:e2e`** et **`npm run e2e:debug`** — scripts Playwright manquants dans `package.json`
- [ ] **`npm run db:migrate`** — une fois le système de migration implémenté
- [ ] **Documentation API IPC** — TypeDoc ou manuel des handlers IPC
- [ ] **i18n complète** — vérifier que les 7 locales (fr/en/br/ca/de/es/zh-HK) couvrent tous les nouveaux textes
