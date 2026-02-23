# Roadmap - BellePoule Modern

## Vue d'ensemble

```
Phase 1: Core Sabre Laser     ████████████████████ 100% ✅
Phase 2: Tests Unitaires      ████████████████████ 100% ✅
Phase 3: Mode Hors-Ligne      ░░░░░░░░░░░░░░░░░░░░   0% 🔜 ← ACTUELLE
Phase 4: Dashboard Live       ░░░░░░░░░░░░░░░░░░░░   0% 📋
Phase 5: Formule ASL          ░░░░░░░░░░░░░░░░░░░░   0% 📋
```

---

## Phase 1 : Core Sabre Laser ✅

**Statut** : TERMINÉ  
**Durée** : 4 semaines

### Livrables
- Système de cartons FFE complet
- Zones de touches A/B/C
- Mort subite (2 modes)
- Points Quest V1-V4
- Sortie d'arène

### Fichiers clés
- `src/shared/utils/cardSystem.ts`
- `src/shared/utils/touchSystem.ts`
- `src/shared/utils/suddenDeath.ts`
- `src/shared/utils/poolCalculations.ts`

---

## Phase 2 : Tests Unitaires ✅

**Statut** : TERMINÉ  
**Durée** : 1 semaine

### Livrables
- 17 fichiers de tests
- ~350 tests unitaires
- Couverture 93%

### Fichiers clés
- `src/shared/utils/*.test.ts`
- `docs/GUIDE_TESTS_UNITAIRES.md`

---

## Phase 3 : Mode Hors-Ligne 🔜

**Statut** : À DÉMARRER  
**Durée estimée** : 2 semaines

### Objectif
Permettre l'utilisation complète sur tablette sans connexion internet.

### Tâches
1. **IndexedDB Storage** (3 jours)
   - Service de stockage local
   - CRUD compétitions/matchs
   - Migration des données

2. **Service Worker PWA** (2 jours)
   - Cache assets statiques
   - Stratégie network-first
   - Fallback offline

3. **Sync Queue** (3 jours)
   - Queue FIFO pour actions
   - Retry automatique
   - Résolution de conflits

4. **UI Offline** (2 jours)
   - Indicateur de connexion
   - Badge "non synchronisé"
   - Bouton sync manuelle

### Critères de succès
- [ ] Lighthouse PWA > 90
- [ ] Fonctionne 100% offline
- [ ] Sync < 5 secondes au retour

---

## Phase 4 : Dashboard Live 📋

**Statut** : PLANIFIÉ  
**Durée estimée** : 2 semaines

### Objectif
Affichage temps réel pour spectateurs et organisateurs.

### Tâches
1. WebSocket server
2. Vue classement live
3. Vue pistes en cours
4. Notifications push

---

## Phase 5 : Formule ASL Compétition 📋

**Statut** : PLANIFIÉ  
**Durée estimée** : 3 semaines

### Objectif
Support complet du format de compétition ASL avec repêchages.

### Tâches
1. Configuration poules Quest
2. Tableaux avec repêchages
3. Export résultats FFE
4. Multi-phases
