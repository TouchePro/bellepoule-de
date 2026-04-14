# BellePoule Modern — Roadmap

_Dernière mise à jour : avril 2026_

---

## État actuel

| Métrique | Valeur | Cible |
|----------|--------|-------|
| Couverture tests | ~5% (11 fichiers / 136) | 60% |
| `console.log` en prod | ~325 occurrences | 0 |
| Composants > 500 lignes | 5 fichiers | 0 |
| Locales implémentées | 7 / 7 ✅ | 7 / 7 |
| Bundle size | ~1.8 MB | < 1.5 MB |

---

## Phases feature

Détail dans `.planning/roadmap.md`.

```
Phase 1 : Core Sabre Laser          ████████████████████ 100% ✅
Phase 2 : Tests unitaires           ████████████████████ 100% ✅
Phase 3 : Saisie distante + PWA     ████████████████████ 100% ✅
Phase 4 : Dashboard Live            ░░░░░░░░░░░░░░░░░░░░   0% 📋  ← ACTUELLE
Phase 5 : Formule ASL               ░░░░░░░░░░░░░░░░░░░░   0% 📋
```

### Phase 3 — Saisie distante + Mode hors-ligne

Tâches clés :

- [ ] `remote-1` Audit `referee.html` existant
- [x] `remote-2` Zones A/B/C fonctionnelles sur tablette ✅
- [x] `remote-3` Cartons (blanc→jaune, jaune, rouge) avec pénalités ✅
- [x] `remote-4` Mort subite (Timeout + Challenger ≥10 pts) + blocage zones A/B ✅
- [x] `remote-5` Sortie d'arène (+3 pts adversaire) ✅
- [x] `remote-6` Chronomètre synchronisé (start/pause/reset + alertes) ✅
- [x] `remote-7` Undo + historique (10 actions) ✅
- [x] `remote-8` UI optimisée tactile (boutons ≥48px, media query paysage) ✅
- [x] `remote-9` Sélection match avancée (recherche, badges statuts) ✅
- [x] `offline-1` IndexedDB inline (`OfflineQueueInline`) ✅
- [x] `offline-2` Intégration dans `referee.html` + `saveScore()` offline-aware ✅
- [x] `offline-3` Service Worker PWA enregistré ✅
- [x] `offline-4` Queue de sync + endpoint `POST /api/sync` ✅
- [x] `offline-5` Indicateurs UI hors-ligne (badge, compteur, spinner) ✅

---

## Bugs critiques

### ✅ Résolus

**1. Locale `nl` manquante** — ~~`src/shared/types/index.ts:487` déclarait `'nl'`~~
- Corrigé : union de types mise à jour avec les locales réelles (`br`, `ca`, `zh-HK`)

**2. Propagation ranking poules → tableau** — ~~TODO non résolu dans `PoolRankingView.tsx:167`~~
- Corrigé : `saveChanges()` propage désormais les rangs globaux manuels via `onPoolsChange`

**3. Null checks `pool.matches`**
- Corrigé dans `pdfTemplates.ts`, `poolCalculations.ts`, `FencerComparison.tsx`

### 🟡 Implémentations incomplètes déclarées terminées

**4. Cloud Sync — chiffrement non fonctionnel**
- `src/shared/services/cloudSyncService.ts:70-82`
- `generateKey()` crée une clé mais ne la persiste pas
- Aucun workflow de déchiffrement implémenté
- Les backups sont envoyés mais ne peuvent pas être restaurés

**4. Planification automatique — squelette vide**
- `src/shared/services/tournamentFlow.ts`
- `createOptimalSchedule()` n'a pas de logique réelle
- Le bouton UI correspondant n'a aucun effet

### 🟡 Sécurité / Robustesse

**5. Null checks manquants**
- `pool.matches.map(...)` sans garde dans plusieurs composants
- `fencer.poolStats.victories` accédé sans vérification d'existence
- Fichiers concernés : `PoolRankingView.tsx`, `TableauView.tsx`

---

## Dette technique

### Qualité code

| Priorité | Tâche | Fichiers |
|----------|-------|---------|
| Haute | Remplacer `console.log` par `logger` | ~50 fichiers — `logger.ts` existe déjà |
| Haute | Décomposer les "God components" | `remoteScoreServer.ts` (2273 L), `TableauView.tsx` (1694 L), `PoolView.tsx` (1518 L) |
| Haute | Activer `@typescript-eslint/no-explicit-any` | `.eslintrc.json:30` |
| Moyenne | Centraliser les constantes magiques | port 8066, intervalles, scores max → `constants.ts` existe déjà |
| Moyenne | Error Boundaries React sur chaque feature | Aucun actuellement |

### Tests

| Priorité | Tâche |
|----------|-------|
| Haute | Tests stores Zustand (0 actuellement) |
| Haute | Tests composants React (React Testing Library — 0 actuellement) |
| Haute | Tests `database/index.ts` (1612 L, 0 tests) |
| Moyenne | Tests `remoteScoreServer.ts` (2273 L, 0 tests) |
| Moyenne | E2E : mort subite, pénalités, progression multi-poules |

### Performance

| Priorité | Tâche |
|----------|-------|
| Moyenne | Requêtes SQL paramétrées (prévention injection) — `database/index.ts` |
| Moyenne | Batch IPC : grouper les écritures DB (actuellement 50+ requêtes séparées par poule) |
| Basse | Web Worker pour export PDF (bloque le thread principal) |
| Basse | Compression WebSocket `permessage-deflate` |

---

## Nouvelles fonctionnalités proposées

| Priorité | Fonctionnalité | Notes |
|----------|---------------|-------|
| Haute | Export équipes (relay) | `useTeamStore` existe, export manquant |
| Haute | Rapports pénalités pour officiels | `usePenaltyStore` existe, UI rapport manquante |
| Haute | Historique retards tireurs | `useLateFencerStore` existe, historique manquant |
| Moyenne | Système de classement Elo | Calcul post-match, historique progression |
| Moyenne | Mode offline complet | Service Worker + sync automatique à reconnexion |
| Basse | Portail inscription en ligne | Formulaire web → import automatique |
| Basse | Plugin OBS (overlay streaming) | Scores en temps réel pour diffusion |
| Basse | App mobile compagnon (iOS/Android) | Consultation résultats + notifications |
