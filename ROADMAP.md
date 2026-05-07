# BellePoule Modern — Roadmap

_Générée le 7 mai 2026 — basée sur audit complet du codebase (build #698)_

---

## État de l'art

Le projet est fonctionnellement complet pour la compétition standard (poules, tableau, Sabre Laser, saisie distante, 7 langues). La v1 est en production. Cette roadmap part de là et vise haut.

```
Maturité actuelle :  ████████████████░░░░  80%
Qualité code :       ████████████░░░░░░░░  60%
Tests :              ████░░░░░░░░░░░░░░░░  20%
Features avancées :  ██████░░░░░░░░░░░░░░  30%
```

---

## Phase 1 — Remboursement de dette technique
> Objectif : Rendre le code sain avant d'accélérer. Durée estimée : 3-4 semaines.

### 1.1 Logger — éliminer les 173 `console.log`

**Contexte :** `logger.ts` existe et est bien conçu (catégories, niveaux, timestamps). Il est utilisé dans 30% du code. Les 70% restants utilisent encore `console.log` bruts, illisibles en production.

**Travail :**
- Remplacer les 173 occurrences de `console.log/error/warn` par `logger.debug/info/warn/error` avec la catégorie appropriée
- Fichiers principaux : `remoteScoreServer.ts` (~15), `autoUpdater.ts` (~10), `fileParser.ts` (~6), `database/index.ts` (~8), services cloud (~20)
- Ajouter export des logs vers fichier disque (via `ipcMain` + `fs.appendFile`) pour le débogage prod
- Logger les erreurs non catchées globalement (`process.on('uncaughtException')` dans `main.ts`)

---

### 1.2 Performance DB — supprimer les requêtes N+1

**Contexte :** `getFencersByCompetition()` fait 1 requête pour les IDs puis N requêtes individuelles. Sur 80 tireurs : ~80 aller-retours IPC. Latence mesurée : 200-500ms à chaque changement de phase.

**Travail :**
- Réécrire `getFencersByCompetition()` avec `SELECT * FROM fencers WHERE competition_id = ?` (1 requête)
- Réécrire `getPoolsByPhase()` avec JOIN `pool_fencers` et `matches` (requête batch)
- Remplacer la boucle de `upsertTableauMatch` (50+ appels IPC par poule) par une transaction batch
- Ajouter `PRAGMA journal_mode=WAL` dans sql.js pour les écritures concurrentes
- Mesurer avant/après avec `performanceService.startMeasure()`

---

### 1.3 Fuites mémoire et bugs silencieux

**Contexte :** Identifiés à l'audit.

**Travail :**
- `CloudSyncService.startAutoSync()` : vérifier et `clearInterval` avant de relancer (double-interval leak)
- `remoteScoreServer.ts:1455` : déjà corrigé (build #698)
- `useBracketStore` : `updateMatchResult` référencé dans le sélecteur mais absent du store → ajouter l'action ou supprimer la référence
- `offlineStorage.ts` : `getFencersByCompetition()`, `getPoolsByCompetition()`, `getMatchesByCompetition()` retournent tout sans filtrer → ajouter filtre `competitionId`
- Boucle busy-wait `database/index.ts` : remplacer `while (Date.now() - start < waitMs) {}` par `await new Promise(r => setTimeout(r, waitMs))`

---

### 1.4 Tests — passer de 20% à 60% de couverture

**Contexte :** 0 test React/Zustand, 0 test `database/index.ts` (1612 lignes), 0 test `remoteScoreServer.ts` (3300 lignes). Les utils métier sont bien couverts.

**Cibles :**

| Fichier | Priorité | Raison |
|---------|----------|--------|
| `database/index.ts` | 🔴 Haute | 1600 lignes, zéro test, coeur de l'app |
| `usePoolStore.ts` | 🔴 Haute | Store central, mutations Zustand |
| `useBracketStore.ts` | 🔴 Haute | Propagation gagnants, seeding FIE |
| `remoteScoreServer.ts` | 🟡 Moyenne | Endpoints critiques (auth, scores, rate limit) |
| `cloudSyncService.ts` | 🟡 Moyenne | Chiffrement, compression, conflits |
| `CompetitionView.tsx` | 🟡 Moyenne | Flow 8 phases |
| `PoolView.tsx` | 🟡 Moyenne | Score submission, undo/redo |

**Approche :**
- Tests DB avec une DB en mémoire (sql.js en mode `:memory:`)
- Tests composants avec React Testing Library + `vi.mock('electron')`
- Coverage goal : `npm run test:coverage` → 60% lignes, 50% branches

---

## Phase 2 — Refactoring architectural
> Objectif : Code maintenable, performant, extensible. Durée estimée : 3-4 semaines.

### 2.1 Décomposer les 4 composants monolithiques

| Composant | Lignes | Découpage proposé |
|-----------|--------|-------------------|
| `TableauView.tsx` | 1626 | `TableauContainer` + `BracketTree` + `MatchCard` + `TableauExportPanel` |
| `PoolView.tsx` | 1498 | `PoolContainer` + `ScoreGrid` + `MatchList` + `ScoreInputModal` + `ColumnMenu` |
| `CompetitionView.tsx` | 1372 | `CompetitionRouter` + `CheckinPhase` + `PoolPhase` + `RankingPhase` + `TableauPhase` + `ResultsPhase` |
| `KioskDisplay.tsx` | 1247 | `KioskContainer` + `KioskPoolPanel` + `KioskRankingPanel` + `KioskBracketPanel` |

**Règle :** Aucun composant de rendu > 300 lignes. La logique métier dans des hooks dédiés.

---

### 2.2 Memoization et React performance

**Travail :**
- Enrober `PoolView`, `TableauView`, `CompetitionView` avec `React.memo()`
- `useCallback` sur tous les handlers passés en props (handleScoreUpdate, propagateWinners, onMatchSelect)
- `useMemo` sur les calculs coûteux (rankings, seeding FIE, pool stats)
- Identifier et supprimer les re-renders cascades avec React DevTools Profiler
- Objectif : zéro composant qui re-render > 60fps inutilement

---

### 2.3 Code splitting et lazy loading

**Travail :**
- `React.lazy()` + `Suspense` sur TableauView, PoolView, tous les modals lourds
- Webpack `splitChunks` pour vendor (react, socket.io, jspdf) séparés du code app
- Webpack `Bundle Analyzer` → objectif bundle renderer < 1.2 MB (vs ~1.8 MB actuel)
- Preload intelligent : charger PoolView dès que l'utilisateur passe en phase poules

---

### 2.4 Web Worker pour les calculs lourds

**Contexte :** `WorkerPool` dans `performanceService.ts` simule avec `setTimeout`. Lors d'un gros tournoi, le seeding FIE (64 tireurs) et le calcul de classement poule bloquent le thread UI.

**Travail :**
- Vrai Web Worker pour : calcul classement poules, génération ordre matchs FIE, export PDF (jsPDF bloque ~200ms)
- API : `worker.postMessage({ type: 'COMPUTE_RANKING', pools })` → `worker.onmessage`
- Webpack `worker-loader` ou `new Worker(new URL(...))`

---

## Phase 3 — Complétion des features partielles
> Objectif : Finir ce qui est à moitié fait. Durée estimée : 4-6 semaines.

### 3.1 Cloud Sync — implémentation réelle

**Contexte :** L'infrastructure est là (AES-GCM, compression gzip, résolution conflits, UI) mais les fonctions centrales retournent des données vides.

**Travail :**
- `getLocalData()` : lire depuis `DatabaseManager` (compétitions + tireurs + matchs actifs)
- `getRemoteData()` : télécharger le JSON chiffré depuis Dropbox/Drive/OneDrive, déchiffrer, décompresser
- `listBackups()` : lister les fichiers `bellepoule_backup_*.json.gz` dans le dossier cloud
- `downloadBackup(id)` : télécharger et retourner le contenu déchiffré
- `checkForUpdates()` : comparer `updatedAt` local vs remote
- Workflow complet : Save → Compress → Encrypt → Upload → (conflit ?) → Merge UI → Overwrite
- UI : indicateur sync en cours dans la barre de titre, historique des 10 dernières sauvegardes

---

### 3.2 Analytics — tableaux de bord réels

**Contexte :** `analyticsService.ts` retourne des données vides, export PDF/CSV génère des Blobs vides.

**Travail :**
- Connecter `getCompetitionMetrics()` à `DatabaseManager` (requêtes SQL agrégées)
- Stats réelles : durée moyenne match, taux victoires par arme/catégorie, distribution scores, top tireurs
- Export CSV : sérialisation structurée (headers + lignes)
- Export PDF : utiliser les templates existants de `pdfTemplates.ts`
- Dashboard visuel : graphiques (pas de lib externe — SVG natif ou Canvas) pour éviter le bundle bloat
- Ajout : heatmap des touches par zone pour Sabre Laser (zones A/B/C avec compteurs)

---

### 3.3 Double Élimination — logique complète

**Contexte :** `useDEBracketStore.ts` a `updateMatchResult` correctement. La structure existe. La propagation losers/winners est partielle.

**Travail :**
- Compléter la propagation : winner bracket → loser bracket (défaites envoyées au bon round)
- Grand Final : si le vainqueur du loser bracket bat le winner bracket, deuxième match de finale
- UI : visualisation double bracket (côte à côte, winner en haut / loser en bas)
- Export PDF du double tableau
- Tests unitaires : 15+ cas (victoire directe, remontée losers, finale double)

---

### 3.4 Équipes — feature complète

**Contexte :** `useTeamStore` existe, `generatePools()` crée une structure vide sans matchs.

**Travail :**
- Définir les règles FFE équipes : composition (3 tireurs titulaires + 1 remplaçant), score équipe = somme victoires
- `generatePools()` : créer les matchs par équipe (ordre rotation FIE : A1-B1, A2-B2, A3-B3, A2-B1, A1-B3, A3-B2...)
- Calcul classement équipe : V/M équipe + total touches
- Export PDF résultats équipes
- Saisie score distante adaptée équipes (afficher tireur actif + score cumulé)

---

### 3.5 Tireurs tardifs (Late Fencers) — workflows complets

**Contexte :** `useLateFencerStore` existe. Aucun workflow UI.

**Travail :**
- Ajout tireur en cours de poule : insérer dans une poule existante + recalcul classement
- Ajout tireur post-poules : injecter directement dans le tableau au rang disponible
- Exclusion en cours de compétition : remplacer par BYE dans le tableau, recalcul classements
- Historique des retards (heure d'arrivée, pénalités appliquées)
- Rapport PDF officiels avec liste des retards

---

### 3.6 Planification automatique — algorithme réel

**Contexte :** `TournamentFlow.createOptimalSchedule()` a des scores hardcodés (50, 30) et des commentaires "would need actual calculation".

**Travail :**
- `calculateMatchPriority()` : vrai score basé sur % completion de poule + urgence tableau
- `evaluateSlotQuality()` : score basé sur historique utilisation arène + temps repos tireurs (min 20min entre 2 matchs)
- `calculateScheduleMetrics()` : comptage violations repos, taux utilisation arènes, estimation fin
- UI : timeline visuelle des matchs planifiés par piste/arène (gantt simplifié)
- Export planning : PDF pour officiels, JSON pour affichage kiosk

---

## Phase 4 — Nouvelles features ambitieuses
> Objectif : Fonctionnalités qui n'existent dans aucun autre logiciel d'escrime. Durée estimée : 2-3 mois.

### 4.1 IA — Seeding et prédictions

**Vision :** Utiliser l'historique des résultats pour améliorer le seeding et donner des probabilités de victoire.

**Features :**
- **Seeding intelligent** : au lieu du seeding FFE (rang poule × rang inter-poules), scorer chaque paire de tireurs avec leurs confrontations passées (si stockées)
- **Probabilités de victoire** : pour chaque match du tableau, afficher "A : 65% | B : 35%" basé sur ELO calculé
- **Détection de surprises** : alerter si un résultat dévie de >2σ de la prédiction (candidat pour vérification vidéo)
- **Recommandation de compositions équipes** : suggérer l'ordre optimal des tireurs pour maximiser les chances

**Implémentation :**
- ELO simple (K=32, mise à jour après chaque match) stocké en DB par tireur
- Modèle de prédiction : régression logistique sur différentiel ELO (pas de ML externe, calcul pur TS)
- Opt-in : désactivé par défaut, à activer dans les settings

---

### 4.2 App mobile spectateur (PWA)

**Vision :** Les parents et spectateurs suivent la compétition sur leur téléphone sans avoir à demander à l'organisateur.

**Features :**
- QR code d'accès public (sans auth) depuis l'interface kiosk
- Progressive Web App : installable sur iOS/Android depuis le navigateur
- Notifications push quand le match d'un tireur favori commence (Web Push API)
- Suivre un tireur spécifique : voir son prochain match, ses résultats, sa progression
- Classements en temps réel (poules, inter-poules, tableau)
- Mode sombre natif, offline-capable (service worker cache)

**Implémentation :**
- Nouvelle route `/spectateur` dans `remoteScoreServer.ts` (pas d'auth)
- `public.html` existe déjà → l'enrichir avec sélecteur de tireur
- Web Push : `webpush` npm package + subscription côté client
- Socket.IO events filtrés par tireur pour éviter la surcharge

---

### 4.3 Overlay OBS pour streaming

**Vision :** Les compétitions Sabre Laser sont souvent filmées. Un overlay professionnel attire les sponsors et améliore l'expérience spectateur.

**Features :**
- Overlay navigateur (Browser Source OBS) : `http://localhost:8066/overlay/arene1`
- Affichage : noms fencers, scores, chrono, zones touchées (animation flash), cartons
- Thèmes : minimal, broadcast TV, esport, FFE officiel
- Animations : point marqué (flash zone + "+5"), changement de lead, countdown mort subite
- Affichage logo compétition + sponsor
- Configuration depuis l'interface principale (couleurs, positions, animations on/off)

**Implémentation :**
- Nouvelle route `/overlay/:arenaId` dans `remoteScoreServer.ts`
- HTML/CSS/JS servie en mémoire (même pattern que `arena.html`)
- Socket.IO pour mise à jour temps réel des scores
- CSS animations pour les events (keyframes, transitions)

---

### 4.4 Système de classement ELO fédéral

**Vision :** Chaque tireur a un ELO global qui évolue après chaque compétition. Les organisateurs exportent les résultats vers la fédération.

**Features :**
- Calcul ELO post-match automatique (K variable selon catégorie/niveau compétition)
- Historique ELO par tireur : graphe de progression sur l'année
- Classement fédéral synthétique : top 100 par arme/catégorie/genre
- Export format FFE : fichier `.fff` avec ELO pour import fédération
- Comparaison deux tireurs : graphe croisé ELO, head-to-head, stats zones (Laser)

**Implémentation :**
- Nouveau champ `eloRating` dans table `fencers` (défaut 1200)
- Calcul dans `fencerStatsCalculator.ts` (déjà structuré pour stats)
- Stockage historique dans nouvelle table `elo_history (fencerId, date, rating, matchId)`
- Migration DB versionnée (dans `database/migrations/`)

---

### 4.5 Portail d'inscription en ligne

**Vision :** Les tireurs s'inscrivent eux-mêmes depuis un lien web. L'organisateur n'a plus à saisir à la main.

**Features :**
- L'organisateur génère un lien d'inscription unique par compétition
- Formulaire web : nom, prénom, club, catégorie, licence FFE (validation format)
- Confirmation automatique par email (si `notificationService` email implémenté)
- Liste d'attente si la compétition est complète
- Import automatique : les inscrits apparaissent dans BellePoule au check-in
- Code QR pour afficher dans les clubs

**Implémentation :**
- Nouvelle section dans `remoteScoreServer.ts` : routes `/inscription/:competitionId`
- Stockage temporaire des inscriptions dans table SQL `registrations`
- Validation licence FFE : regex ou API FFE si disponible
- Génération du lien depuis `RemoteScoreManager` (bouton "Ouvrir inscriptions")

---

### 4.6 Replay et vidéo

**Vision :** Chaque point peut être lié à une timestamp vidéo. Révolutionnaire pour l'arbitrage et la formation.

**Features :**
- Sync avec une caméra IP ou un fichier vidéo local
- Quand un score est saisi, timestamp automatique dans l'enregistrement
- Interface "replay" : cliquer sur un point dans l'historique → sauter à la vidéo
- Export clip automatique : le moment ±10s autour de chaque point
- Mode formation : annoter les clips (zone touchée, technique, erreur arbitrage)

**Implémentation :**
- Intégration avec OBS WebSocket pour contrôler l'enregistrement
- Ou : lecture d'un fichier vidéo local via `<video>` HTML5 + seek programmatique
- Stockage timestamps dans `match_scores` table (nouveau champ `videoTimestamp`)
- Export clips : via `ffmpeg` (si disponible sur le système) ou WebCodecs API

---

### 4.7 Gestion multi-compétitions / Saison

**Vision :** Un club ou une fédération gère une saison entière depuis BellePoule.

**Features :**
- Dashboard saison : toutes les compétitions, calendrier, résumé ELO
- Tireurs partagés entre compétitions (profil unique, historique complet)
- Classement de saison : points cumulés sur N meilleures compétitions
- Statistiques club : progression des membres sur la saison
- Export rapport de saison : PDF multi-pages avec tous les résultats

**Implémentation :**
- Nouvelle entité `Season` (avec ses `competitions`)
- Page d'accueil redessinée : sélecteur saison + calendrier compétitions
- Partage du pool de tireurs entre compétitions d'une même saison (FK `season_id`)

---

### 4.8 Assistant coach IA

**Vision :** Pendant la compétition, l'assistant analyse les patterns et donne des conseils tactiques.

**Features :**
- Analyse en temps réel : "Tireur A perd 80% de ses touches en Zone A contre les droitiers"
- Recommandations avant-match : "Attention, B a battu 3 gauchers aujourd'hui avec Zone C"
- Détection de fatigue : chute de performance entre poules et tableau (comparaison stats)
- Rapport PDF post-compétition : "Points forts/faibles par zone, recommandations entraînement"

**Implémentation :**
- Calculs purement statistiques en TS (pas de ML externe)
- Basé sur `fencerStatsCalculator.ts` enrichi avec patterns par zone et type d'adversaire
- UI : panneau latéral optionnel dans `CompetitionView` (opt-in coach mode)

---

## Phase 5 — Vision long terme (12-18 mois)

### Infrastructure

- **API REST publique** : exposer les résultats pour les applications tierces (sites clubs, etc.)
- **Multi-device sync temps réel** : deux organisateurs sur deux ordinateurs éditent la même compétition (CRDT ou OT)
- **Electron → Tauri** : si la taille du bundle devient critique (Tauri = ~5MB vs ~80MB pour Electron)
- **Base de données SQLite native** : migrer de sql.js (pure JS) vers better-sqlite3 (natif, 10× plus rapide)

### Écosystème

- **Plugin FFE officiel** : import/export direct depuis l'API fédérale (si API disponible)
- **Certification WAGGGS/FIE** : conformité officielle des algorithmes de seeding
- **Marketplace de templates** : partager des templates PDF/thèmes custom entre organisateurs
- **BellePoule Cloud** : service hébergé optionnel (sauvegarde, inscriptions, resultats publics)

---

## Métriques de succès

| Indicateur | Actuel | Cible Phase 1 | Cible Phase 4 |
|-----------|--------|---------------|---------------|
| Couverture tests | ~20% | 60% | 80% |
| `console.log` en prod | 173 | 0 | 0 |
| Composants > 500 lignes | 5 | 0 | 0 |
| Latence changement phase (80 tireurs) | ~400ms | <80ms | <30ms |
| Bundle renderer | ~1.8 MB | <1.2 MB | <1.0 MB |
| Features cloud sync | 0% fonctionnel | 100% | 100% |
| Langues de menu | 4 | 7 | 7+ |

---

## Ordre de priorité recommandé

```
MAINTENANT     Phase 1 (dette technique) — bloquant pour tout le reste
               ↓
COURT TERME    Phase 3.1 (cloud sync réel) — très demandé
               Phase 3.6 (planification auto) — haute valeur organisateurs
               ↓
MOYEN TERME    Phase 2 (refactoring) + Phase 3 reste
               Phase 4.1 (ELO) + Phase 4.2 (app spectateur)
               ↓
LONG TERME     Phase 4.3-4.8 + Phase 5
```

---

_Ce document est vivant. Il doit être mis à jour après chaque sprint et après chaque retour utilisateur en compétition._
