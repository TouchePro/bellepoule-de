# Historique - BellePoule Modern

## Décisions techniques

### 2024-02 : Choix de Vitest pour les tests
**Contexte** : Besoin d'un framework de tests rapide compatible Vite  
**Décision** : Vitest plutôt que Jest  
**Raison** : Intégration native Vite, même config, plus rapide  

### 2024-02 : Architecture utils avec tests colocalisés
**Contexte** : Organiser les utilitaires et leurs tests  
**Décision** : `*.test.ts` à côté de `*.ts` dans le même dossier  
**Raison** : Plus facile à maintenir, visible immédiatement si test manquant  

### 2024-02 : Zustand pour le state management
**Contexte** : Besoin d'un state manager simple  
**Décision** : Zustand plutôt que Redux  
**Raison** : Plus léger, moins de boilerplate, TypeScript natif  

## Phases complétées

### Phase 1 : Core Sabre Laser (Février 2024)
- Implémentation complète des règles FFE
- Système de cartons avec 4 groupes
- Zones A/B/C avec scoring
- Mort subite (2 modes)
- Points Quest

### Phase 2 : Tests Unitaires (Février 2024)
- 17 fichiers de tests créés
- ~350 tests unitaires
- Couverture 93% des modules
- Guide de tests documenté

## Bugs résolus

### #60 : Classement ex-aequo au-delà de la 4e place
**Symptôme** : Tous les perdants d'un tour avaient le même rang  
**Cause** : Pas de départage par touches  
**Fix** : Tri par total touches (poules + tableau)  

### #59 : Points Quest incorrects
**Symptôme** : V4 attribué pour écart de 8  
**Cause** : Seuils mal définis  
**Fix** : V4≥12, V3≥8, V2≥4, V1≤3  

### #61 : Tri classement final inversé
**Symptôme** : Rang 8 affiché avant rang 1  
**Cause** : Sort sans comparateur explicite  
**Fix** : `rankings.sort((a, b) => a.rank - b.rank)`  
