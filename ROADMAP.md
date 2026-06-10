# Roadmap BellePoule Modern

> Version : 1.0 · Date : 2026-05-09 · Statut : Vivant (mis à jour à chaque release)

---

## État actuel – v1.0.3 (build 711)

### Ce qui est production-ready

| Domaine | Détail |
|---|---|
| Gestion compétitions | Création, phases, poules (round-robin), tableau direct |
| Scores distants | Serveur Express + Socket.IO, 4 pistes, tablettes arbitres |
| Attribution arbitres | `RefereeManager` – conflit club/temps/consécutif, score 100 pts |
| Sabre Laser | Zones A/B/C (1/3/5 pts), Quest Points, mort subite |
| Base de données | SQLite via better-sqlite3 (WAL), autosave 2 min |
| Mise à jour auto | GitHub Releases, multi-plateforme (Win/Mac/Linux) |
| Interface | 47+ composants React 19, toast, skeleton, virtual list, PDF preview |
| Voice scoring | `VoiceScoreController` – saisie vocale des scores |
| Internationalisation | 7 langues : fr, en, de, es, br, ca, zh-HK |
| Export PDF | Feuilles de poule, résultats, classements (jsPDF) |
| Performance | Cache TTL, memoization, monitoring (PerformanceService) |
| Offline | Service Worker, offline queue tablettes |

### Partiellement implémenté

| Module | Infra | Données | Priorité fix |
|---|---|---|---|
| Cloud sync (Dropbox/GDrive/OneDrive) | ✅ AES-GCM + OAuth | ❌ stubs vides | P0 |
| Analytics exports (CSV/PDF) | ✅ endpoints IPC | ❌ retournent `""` | P0 |
| TournamentFlow scheduler | ✅ algorithme piste | ❌ completion stub | P1 |
| Double élimination | ✅ store Zustand | ❌ UI incomplète | P1 |
| Notifications Discord/Slack | ✅ UI webhooks | ❌ non câblées | P1 |

### Non commencé

- Export FFE officiel (format `.fff` en écriture)
- Intégration API FFE (classements en live)
- Application mobile / PWA installable
- Mode multi-sites / P2P
- Intelligence artificielle (prédiction, coach)
- Portail tireur
- Couverture tests < 80 % (cible PRD)

---

## Phase 1 – v1.1 "Stabilité & Complétion" · Q2 2026

> **Objectif :** terminer ce qui est à moitié fait et atteindre 80 % de couverture de tests.

### 1.1 – Complétion cloud sync

**Problème :** `getLocalData()` et `getRemoteData()` dans `cloudSyncService.ts` retournent des tableaux vides.

| Livrable | Description |
|---|---|
| Bridge DB → sync | Brancher `DatabaseManager` dans `getLocalData()` – export sérialisé de toutes les entités |
| Delta sync | Comparer timestamps `updatedAt`, n'uploader que les deltas |
| Restauration | Implémenter `restoreFromBackup()` avec merge `conflictResolution.ts` |
| Tests | Unit tests cloud sync (mock providers) |

**Critère de done :** sync Dropbox round-trip sans perte de données sur une compétition de 64 tireurs.

---

### 1.2 – Export analytics (CSV + PDF)

**Problème :** `analyticsService.ts` retourne des chaînes vides pour `exportAnalytics('csv')` et `('pdf')`.

| Livrable | Description |
|---|---|
| CSV | Format RFC 4180 : statistiques par tireur, par poule, classement |
| PDF | Rapport complet via jsPDF existant (`pdfTemplates.ts`) |
| Export multi-compétitions | Agrégation sur plusieurs fichiers .bp |
| Tests | Unit tests formatage CSV, snapshot PDF |

**Critère de done :** le comité technique peut générer un rapport PDF imprimable post-compétition.

---

### 1.3 – TournamentFlow réel

**Problème :** `getPoolCompletionPercentage()` retourne toujours 0, faussant le scheduler de pistes.

| Livrable | Description |
|---|---|
| Complétion réelle | Calculer via `MatchStatus` en base |
| Rest violations | Compter les violations de repos réellement |
| Recommandations | Afficher dans `LiveDashboard.tsx` |

---

### 1.4 – Double élimination (UI)

**Problème :** `useDEBracketStore` existe, mais aucune vue ne le consomme.

| Livrable | Description |
|---|---|
| Vue DE bracket | Visualisation arbre double élimination dans `Bracket.tsx` |
| Génération matchs | Connecter `BracketGenerator` au mode DE |
| Tests E2E | Parcours complet tournoi double élimination |

---

### 1.5 – Export FFE (écriture)

| Livrable | Description |
|---|---|
| Parser `.fff` sortie | Générer le fichier FFE de résultats conforme au format officiel |
| Validation | Vérifier champs obligatoires (licence, club, date) avant export |
| Tests | Comparer output avec fichier FFE de référence |

**Critère de done :** le fichier peut être importé sans erreur dans Engarde.

---

### 1.6 – Notifications opérationnelles

| Livrable | Description |
|---|---|
| Câblage Discord/Slack | Brancher `notificationService.ts` sur les hooks webhooks UI |
| Événements déclencheurs | Match assigné, poule terminée, phase suivante |
| Notifications desktop | Electron `Notification` API pour l'organisateur |

---

### 1.7 – Tests & qualité

| Livrable | Cible |
|---|---|
| Couverture unitaire | ≥ 80 % (ajouter : cloudSync, analytics, pools, bracket) |
| E2E Playwright | Couverture des 5 flux critiques (création → résultats) |
| Type-check CI | Zéro erreur TS sur `npm run type-check` |
| Lint CI | Zéro warning ESLint bloquant |

---

### 1.8 – i18n : Breton & Catalan

| Livrable | Description |
|---|---|
| `br.json` complet | Toutes les clés présentes en fr.json traduites |
| `ca.json` complet | Idem Catalan |
| CI check | Script qui vérifie que toutes les langues ont les mêmes clés |

---

### KPIs v1.1

| KPI | Cible |
|---|---|
| Bugs critiques ouverts | < 3 |
| Couverture tests | ≥ 80 % |
| Sync cloud round-trip | < 10 s pour 500 tireurs |
| Export PDF | < 2 s |

---

## Phase 2 – v1.2 "Cloud & Collaboration" · Q3 2026

> **Objectif :** multi-utilisateurs, notifications avancées, compétitions par équipes.

### 2.1 – Sync cloud temps réel (delta)

| Livrable | Description |
|---|---|
| Delta sync | Upload uniquement les entités modifiées depuis le dernier sync |
| Sync automatique | Toutes les 5 min en arrière-plan |
| Indicateur UI | Barre de statut sync (dernière sync, conflits) |
| Mode lecture seule | Un deuxième PC peut consulter la compétition en live |

---

### 2.2 – Dashboard web organisateur

| Livrable | Description |
|---|---|
| Route `/dashboard` | Sur le serveur port 8066, accès organisateur protégé |
| Vue multi-pistes | Statut de toutes les pistes en un coup d'œil |
| Actions à distance | Passer à la phase suivante, assigner un match depuis le dashboard |
| Authentification | Token JWT généré à la création de la compétition |

---

### 2.3 – Notifications WhatsApp / SMS

| Livrable | Description |
|---|---|
| Intégration Twilio | SMS pour les tireurs : "Votre prochain match dans 5 min, piste 3" |
| Intégration Whapi | WhatsApp Business API (alternative Twilio) |
| Opt-in tireur | Le tireur fournit son numéro à l'inscription |
| Throttling | Max 3 notifications/tireur/heure |

---

### 2.4 – Co-arbitrage (multi-arbitres par piste)

| Livrable | Description |
|---|---|
| Rôles arbitre | Principal + assistant (même piste) |
| Consensus score | Les deux doivent valider avant d'enregistrer |
| UI tablet | Différencier les rôles visuellement |

---

### 2.5 – Compétitions par équipes

| Livrable | Description |
|---|---|
| Création équipe | Grouper des tireurs en équipe (store `useTeamStore` existant) |
| Matchs d'équipe | Relais : 3 tireurs × 3 matchs, score cumulé |
| Classement équipes | Adapter `tableCalculations.ts` |
| Export PDF | Feuille de match équipe |

**Critère de done :** compétition d'équipes de 8 équipes jouable de A à Z.

---

### 2.6 – Formule ASL Compétition

| Livrable | Description |
|---|---|
| Définition règles | Alternative à Quest pour Sabre Laser (selon règlement FFE) |
| Implémentation | Nouveau `PhaseType.ASL_COMPETITION` dans le state machine |
| UI | Phase view dédiée |

---

### 2.7 – Bilan automatique post-compétition

| Livrable | Description |
|---|---|
| Déclencheur | Au clic "Terminer la compétition" |
| Contenu | PDF : classement final, statistiques, podium, export FFE |
| Archivage | Sauvegarder dans le dossier compétition + cloud si activé |

---

### KPIs v1.2

| KPI | Cible |
|---|---|
| Clubs actifs | 10 |
| Compétitions/mois | 20 |
| Temps sync tablette | < 500 ms |
| Note satisfaction | ≥ 4/5 |

---

## Phase 3 – v2.0 "Intelligence & Automatisation" · Q4 2026

> **Objectif :** réduire la charge de l'organisateur, enrichir l'expérience avec de l'IA.

### 3.1 – Prédiction IA des résultats

| Livrable | Description |
|---|---|
| Modèle | TensorFlow.js, entraîné sur l'historique des compétitions locales |
| Features | V/M, TD-TR, confrontations directes, catégorie |
| Output | `{ winner, confidence, predictedScore }` affiché avant le match |
| Opt-in | Désactivable par l'organisateur |

---

### 3.2 – Coach intelligent

| Livrable | Description |
|---|---|
| Rapport par tireur | Points forts/faibles, patterns (ex : perd souvent en zone B) |
| Progression | Graphe V/M et TD-TR sur plusieurs compétitions |
| Export | PDF rapport coach |

---

### 3.3 – Scheduler de pistes avancé

| Livrable | Description |
|---|---|
| Assignation auto complète | `TournamentFlow` câblé avec complétion réelle (v1.1) |
| Contraintes | Repos min, piste préférée par tireur, distance domicile-compétition |
| Simulation | Prévisualiser l'ordre des matchs avant de lancer |

---

### 3.4 – Détection d'anomalies de score

| Livrable | Description |
|---|---|
| Règle | Score improbable → alerte (ex : 5-0 en 30 s, ou même tireur qui gagne toujours) |
| UI | Toast warning pour l'organisateur, log d'audit |
| Validation | Arbitre peut confirmer ou corriger |

---

### 3.5 – Overlay streaming (OBS)

| Livrable | Description |
|---|---|
| Route `/overlay` | Page HTML transparente, WebSocket temps réel |
| Sources OBS | Scoreboard, timer, classement poule |
| Customisation | Couleurs club, logo organisateur |

---

### 3.6 – API REST publique

| Livrable | Description |
|---|---|
| Endpoints | `GET /api/competitions`, `/api/pools`, `/api/rankings`, `/api/fencers` |
| Auth | API key par compétition |
| Doc | OpenAPI 3.0 (Swagger UI sur `/api/docs`) |
| Usage | Intégrations tierces, sites de clubs |

---

### 3.7 – Statistiques historiques croisées

| Livrable | Description |
|---|---|
| Agrégation | Combiner plusieurs fichiers `.bp` en une seule vue |
| Classement saison | V/M et TD-TR agrégés sur la saison |
| Export | CSV pour publication sur site club |

---

### 3.8 – Analytics temps réel

| Livrable | Description |
|---|---|
| Remplacement | Remplacer les snapshots statiques par des métriques live |
| Graphes | Évolution du rythme (matchs/heure), temps moyen |
| `AnalyticsDashboard.tsx` | Composant existant – brancher sur flux WebSocket |

---

### KPIs v2.0

| KPI | Cible |
|---|---|
| Précision prédiction IA | ≥ 65 % |
| Réduction temps orga | − 30 % (mesure via analytics) |
| Clubs actifs | 25 |

---

## Phase 4 – v2.1 "Mobile & Accessibilité" · Q1 2027

> **Objectif :** rendre BellePoule accessible depuis n'importe quel device, pour tous les utilisateurs.

### 4.1 – PWA installable

| Livrable | Description |
|---|---|
| Manifeste complet | `manifest.json` avec icônes 192/512, theme_color, standalone |
| Service Worker amélioré | Stratégie cache-first pour assets, network-first pour scores |
| Install prompt | Bannière "Installer l'app" sur mobile |
| Offline complet | Toutes les vues fonctionnent sans réseau |

---

### 4.2 – Application iOS/Android

| Livrable | Description |
|---|---|
| Framework | Capacitor (réutilise le code React existant) |
| Interface tactile | Boutons ≥ 48 px, gestes swipe pour navigation |
| Notifications push | Firebase Cloud Messaging |
| Publication | App Store + Google Play (open source, gratuit) |

---

### 4.3 – Portail tireur

| Livrable | Description |
|---|---|
| Page web `/fencer/:id` | Résultats, classement, prochains matchs |
| QR Code | Généré pour chaque tireur à l'accréditation |
| Notifications push | "Tu passes dans 5 min, piste 2" |
| Historique | Toutes les compétitions passées sur BellePoule |

---

### 4.4 – Accessibilité renforcée

| Livrable | Description |
|---|---|
| Daltonisme | Palette alternative (Deuteranopia, Protanopia) |
| Contraste élevé | Mode WCAG AA pour toute l'UI |
| Screen reader | Attributs ARIA sur tous les composants interactifs |
| Audit | axe-core intégré en CI |

---

### 4.5 – Gamification tireurs

| Livrable | Description |
|---|---|
| Badges | "Première victoire", "Comeback", "Clean sheet", "Flash", "Champion invaincu" |
| Classements saisonniers | Top 10 club par catégorie |
| Défis | Objectifs mensuels (ex : 5 victoires consécutives) |
| Affichage | Dans le portail tireur + kiosk display |

---

### 4.6 – Mode kiosque HD (affichage public)

| Livrable | Description |
|---|---|
| Multi-piste | Afficher le statut de toutes les pistes simultanément |
| Haute définition | Optimisé 4K (60 fps, CSS contain) |
| Rotation auto | Alterner entre classement, matchs en cours, podium |
| Mode salle | Un seul écran couvre toute la compétition |

---

### KPIs v2.1

| KPI | Cible |
|---|---|
| App mobile installée | 200 téléchargements |
| Portail tireur actif | 60 % des tireurs se connectent |
| Score accessibilité axe-core | 0 violation critique |

---

## Phase 5 – v3.0 "Plateforme & International" · 2027+

> **Objectif :** faire de BellePoule la plateforme de référence mondiale pour l'escrime.

### 5.1 – Mode multi-sites (P2P)

| Livrable | Description |
|---|---|
| Technologie | WebRTC DataChannel ou libp2p |
| Usage | Compétitions réparties géographiquement (plusieurs salles) |
| Classement global | Agréger les résultats de tous les sites en temps réel |
| Fallback | Sync différée si latence > 200 ms |

---

### 5.2 – Intégration FIE (Fédération Internationale)

| Livrable | Description |
|---|---|
| Format FIE-XML | Export conforme au standard international |
| Classements FIE | Import des classements mondiaux |
| Règlement FIE | Support des règles d'exclusion et de pénalités FIE |

---

### 5.3 – Fédérations nationales supplémentaires

| Pays | Fédération | Format |
|---|---|---|
| Belgique | KBEF/LBFE | À définir |
| Suisse | Swiss Fencing | À définir |
| Canada | Escrime Canada | À définir |
| Allemagne | DFeB | À définir |

---

### 5.4 – Plugin / Extension system

| Livrable | Description |
|---|---|
| API plugins | Interface TypeScript pour ajouter des formules de compétition |
| Marketplace | Dépôt GitHub de plugins communautaires |
| Sandbox | Plugin exécuté en Worker isolé |
| Exemples | Plugin "Poule américaine", plugin "King of the Hill" |

---

### 5.5 – Version web complète (sans Electron)

| Livrable | Description |
|---|---|
| Framework | Next.js App Router, déployable sur VPS |
| Backend | API REST + WebSocket (Express existant réutilisé) |
| Base de données | PostgreSQL ou SQLite selon hébergement |
| Déploiement | Docker Compose, Coolify/Caprover one-click |
| Usage | Clubs sans PC fixe, accès depuis navigateur |

---

### 5.6 – Internationalisation étendue

| Langue | Code | Priorité |
|---|---|---|
| Portugais | `pt` | Haute (Brésil, Portugal) |
| Italien | `it` | Haute |
| Néerlandais | `nl` | Moyenne |
| Japonais | `ja` | Basse |
| Coréen | `ko` | Basse |

---

### KPIs v3.0

| KPI | Cible |
|---|---|
| Pays utilisateurs | 10 |
| Compétitions/mois (total) | 200 |
| Contributeurs GitHub | 20 actifs |
| Note satisfaction | ≥ 4.5/5 |

---

## Matrice de priorités

```
Impact ↑
   │
   │  [FFE export]     [Équipes]    [AI prédiction]
   │  [Cloud sync]     [Dashboard]  [Multi-sites]
   │  [Analytics]      [PWA]
   │
   │  [i18n complet]   [Co-arbitrage] [Streaming OBS]
   │  [Notifs]         [Portail tireur]
   │
   └──────────────────────────────────────────── Effort →
          Faible          Moyen           Élevé
```

### Matrice détaillée

| Feature | Impact | Effort | Priorité | Phase |
|---|---|---|---|---|
| Cloud sync data bridge | Critique | Moyen | P0 | v1.1 |
| Analytics CSV/PDF | Élevé | Faible | P0 | v1.1 |
| Export FFE officiel | Élevé | Moyen | P0 | v1.1 |
| Tests 80 % | Élevé | Moyen | P0 | v1.1 |
| Double élimination UI | Moyen | Faible | P1 | v1.1 |
| TournamentFlow réel | Moyen | Faible | P1 | v1.1 |
| Notifications | Moyen | Faible | P1 | v1.1 |
| Compétitions équipes | Élevé | Élevé | P1 | v1.2 |
| Dashboard web | Élevé | Moyen | P1 | v1.2 |
| Delta sync cloud | Élevé | Moyen | P1 | v1.2 |
| Notifs WhatsApp/SMS | Moyen | Moyen | P2 | v1.2 |
| AI prédiction | Élevé | Élevé | P2 | v2.0 |
| Coach intelligent | Moyen | Élevé | P2 | v2.0 |
| API REST publique | Élevé | Moyen | P2 | v2.0 |
| Overlay OBS | Moyen | Faible | P2 | v2.0 |
| PWA installable | Élevé | Moyen | P2 | v2.1 |
| App mobile | Élevé | Très élevé | P3 | v2.1 |
| Portail tireur | Élevé | Moyen | P2 | v2.1 |
| Gamification | Faible | Moyen | P3 | v2.1 |
| Multi-sites P2P | Très élevé | Très élevé | P3 | v3.0 |
| Intégration FIE | Élevé | Élevé | P3 | v3.0 |
| Plugin system | Moyen | Élevé | P3 | v3.0 |
| Version web Next.js | Élevé | Très élevé | P3 | v3.0 |

---

## Architecture cible (v3.0)

```
┌─────────────────────────────────────────────────────────────┐
│                     BellePoule Platform                      │
├────────────────┬────────────────┬───────────────────────────┤
│   Desktop App  │   Web App      │   Mobile App              │
│   (Electron)   │   (Next.js)    │   (Capacitor)             │
└────────────────┴────────────────┴───────────────────────────┘
         │                │                    │
         └────────────────┼────────────────────┘
                          │
               ┌──────────▼──────────┐
               │   Core API Server   │
               │  (Express + WS)     │
               │  port 8066          │
               └──────────┬──────────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
┌────────▼──────┐ ┌───────▼──────┐ ┌──────▼───────┐
│   SQLite/     │ │  Cloud Sync  │ │  Plugin      │
│   PostgreSQL  │ │  (Dropbox/   │ │  Sandbox     │
│   (better-sqlite3)    │ │   GDrive/    │ │  (Worker)    │
└───────────────┘ │   OneDrive)  │ └──────────────┘
                  └──────────────┘
```

---

## Principes directeurs

1. **Open Source forever** – GPL-3.0, aucune feature derrière un paywall
2. **Offline first** – tout doit fonctionner sans internet
3. **Type safety** – TypeScript strict, zéro `any` implicite
4. **Progressif** – chaque version est deployable indépendamment
5. **Communautaire** – les issues GitHub sont la source de vérité des priorités
6. **Rétrocompatible** – les fichiers `.bp` v1 s'ouvrent toujours en v3

---

## Contribution

Les contributions sont les bienvenues. Voir [`CONTRIBUTING.md`](CONTRIBUTING.md) pour les conventions.

Pour proposer une feature : ouvrir une issue avec le label `roadmap` et décrire le use case.

---

*BellePoule Modern – Logiciel libre sous GPL-3.0 · [github.com/klinnex/bellepoule-modern](https://github.com/klinnex/bellepoule-modern)*
