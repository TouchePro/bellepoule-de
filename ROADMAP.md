# BellePoule Modern — Roadmap

_Dernière mise à jour : avril 2026_

---

## État actuel

| Métrique | Valeur | Cible |
|----------|--------|-------|
| Couverture tests | ~5% (11 fichiers / 136) | 60% |
| `console.log` en prod | ~325 occurrences | 0 |
| Composants > 500 lignes | 5 fichiers | 0 |
| Locales implémentées | 7 / 7 déclarées ⚠️ | 7 / 7 |
| Bundle size | ~1.8 MB | < 1.5 MB |

---

## Phases feature

Détail dans `.planning/roadmap.md`.

```
Phase 1 : Core Sabre Laser          ████████████████████ 100% ✅
Phase 2 : Tests unitaires           ████████████████████ 100% ✅
Phase 3 : Saisie distante + PWA     ░░░░░░░░░░░░░░░░░░░░   0% 🔜  ← ACTUELLE
Phase 4 : Dashboard Live            ░░░░░░░░░░░░░░░░░░░░   0% 📋
Phase 5 : Formule ASL               ░░░░░░░░░░░░░░░░░░░░   0% 📋
```

### Phase 3 — Saisie distante + Mode hors-ligne

Tâches clés :

- [ ] `remote-1` Audit `referee.html` existant
- [ ] `remote-2` Zones A/B/C fonctionnelles sur tablette
- [ ] `remote-3` Cartons complets (groupes 1-4)
- [ ] `remote-4` Mort subite (2 modes)
- [ ] `remote-5` Sortie d'arène
- [ ] `remote-6` Chronomètre synchronisé
- [ ] `remote-7` Undo + historique
- [ ] `remote-8` UI optimisée tactile
- [ ] `offline-1` IndexedDB côté referee
- [ ] `offline-2` Service Worker PWA
- [ ] `offline-3` Queue de sync + indicateurs UI

---

## Bugs critiques

### 🔴 Crash potentiel

**1. Locale `nl` manquante**
- `src/shared/types/index.ts:487` déclare `'nl'` dans l'union `language`
- Aucun fichier `src/locales/nl.json` n'existe
- Sélectionner "Dutch" dans les paramètres → crash `TranslationContext`
- **Fix :** ajouter `nl.json` ou retirer `'nl'` du type

**2. TODO non résolu — propagation ranking poules**
- `src/renderer/components/PoolRankingView.tsx:167`
- Les changements de ranking ne se propagent pas vers le tableau d'élimination
- Risque : qualifications incorrectes en tournoi multi-poules

### 🟡 Implémentations incomplètes déclarées terminées

**3. Cloud Sync — chiffrement non fonctionnel**
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
