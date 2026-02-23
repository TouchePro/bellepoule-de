# Roadmap - BellePoule Modern

## Vue d'ensemble

```
Phase 1: Core Sabre Laser        ████████████████████ 100% ✅
Phase 2: Tests Unitaires         ████████████████████ 100% ✅
Phase 3: Saisie Distante + PWA   ░░░░░░░░░░░░░░░░░░░░   0% 🔜 ← ACTUELLE
Phase 4: Dashboard Live          ░░░░░░░░░░░░░░░░░░░░   0% 📋
Phase 5: Formule ASL             ░░░░░░░░░░░░░░░░░░░░   0% 📋
```

---

## Phase 1 : Core Sabre Laser ✅

**Statut** : TERMINÉ  
**Durée** : 4 semaines

### Livrables
- Système de cartons FFE complet (Groupes 1-4)
- Zones de touches A/B/C (1/3/5 pts)
- Mort subite (Challenger + Timeout)
- Points Quest V1-V4
- Sortie d'arène

---

## Phase 2 : Tests Unitaires ✅

**Statut** : TERMINÉ  
**Durée** : 1 semaine

### Livrables
- 17 fichiers de tests
- ~350 tests unitaires
- Couverture 93%

---

## Phase 3 : Interface de Saisie Distante + Mode Hors-Ligne 🔜

**Statut** : À DÉMARRER  
**Durée estimée** : 2-3 semaines

### Objectif
Interface `referee.html` 100% fonctionnelle sur tablette avec mode hors-ligne.

### Partie A : Interface de Saisie Distante

| Tâche | Description | Durée |
|-------|-------------|-------|
| remote-1 | Audit referee.html existant | 1j |
| remote-2 | Zones A/B/C fonctionnelles | 1j |
| remote-3 | Système de cartons complet | 1j |
| remote-4 | Mort subite (2 modes) | 1j |
| remote-5 | Sortie d'arène | 0.5j |
| remote-6 | Chronomètre synchronisé | 1j |
| remote-7 | Undo et historique | 1j |
| remote-8 | UI optimisée tablette | 1j |
| remote-9 | Sélection du match | 1j |

### Partie B : Mode Hors-Ligne

| Tâche | Description | Durée |
|-------|-------------|-------|
| offline-1 | Service IndexedDB | 1j |
| offline-2 | Intégration dans referee | 1j |
| offline-3 | Service Worker PWA | 1j |
| offline-4 | Queue de synchronisation | 1j |
| offline-5 | Indicateurs UI offline | 0.5j |

### Critères de succès
- [ ] Saisie distante 100% fonctionnelle
- [ ] Fonctionne offline sur tablette
- [ ] Sync automatique au retour réseau
- [ ] Testé sur iPad et Android

---

## Phase 4 : Dashboard Live 📋

**Statut** : PLANIFIÉ  
**Durée estimée** : 2 semaines

### Objectif
Affichage temps réel pour spectateurs et organisateurs.

### Tâches prévues
- WebSocket server temps réel
- Vue classement live
- Vue pistes en cours
- Notifications push

---

## Phase 5 : Formule ASL Compétition 📋

**Statut** : PLANIFIÉ  
**Durée estimée** : 3 semaines

### Objectif
Support complet du format de compétition ASL avec repêchages.

### Tâches prévues
- Configuration poules Quest avancée
- Tableaux avec repêchages
- Export résultats FFE officiel
- Multi-phases configurables
