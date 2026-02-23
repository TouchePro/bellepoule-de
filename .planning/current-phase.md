# Phase Actuelle : Mode Hors-Ligne

**Phase** : 3  
**Statut** : À DÉMARRER  
**Priorité** : HIGH

## Contexte

Les arbitres utilisent des tablettes pendant les compétitions. La connexion WiFi est souvent instable dans les gymnases. L'application doit fonctionner sans interruption même sans réseau.

## Objectif

Transformer BellePoule Modern en PWA complète avec :
- Stockage local des données (IndexedDB)
- Fonctionnement 100% offline
- Synchronisation automatique au retour du réseau

## Plan d'exécution

### Sprint 1 : IndexedDB Storage (3 jours)

```xml
<task type="implementation">
  <id>offline-1</id>
  <name>Créer le service IndexedDB</name>
  <files>
    src/shared/services/offlineStorage.ts
    src/shared/services/offlineStorage.test.ts
  </files>
  <action>
    Créer un service de stockage local avec :
    - initDB() : création des object stores (competitions, matches, fencers, syncQueue)
    - saveCompetition(comp) / getCompetition(id) / getAllCompetitions()
    - saveMatch(match) / getMatch(id) / getMatchesByPool(poolId)
    - clearOldData(olderThan: Date) : nettoyage automatique
    Utiliser idb (wrapper IndexedDB moderne).
  </action>
  <verify>
    npm test -- offlineStorage
    Vérifier que les données persistent après refresh du navigateur.
  </verify>
  <done>
    Service créé avec tous les CRUD.
    Tests unitaires passent.
    Données persistent après F5.
  </done>
</task>
```

```xml
<task type="implementation">
  <id>offline-2</id>
  <name>Intégrer IndexedDB dans les stores existants</name>
  <files>
    src/stores/competitionStore.ts
    src/stores/matchStore.ts
  </files>
  <action>
    Modifier les stores Zustand pour :
    - Sauvegarder automatiquement dans IndexedDB à chaque modification
    - Charger depuis IndexedDB au démarrage
    - Garder le state en mémoire pour la performance
  </action>
  <verify>
    Créer une compétition, fermer l'onglet, rouvrir → données présentes.
  </verify>
  <done>
    Stores synchronisés avec IndexedDB.
    Pas de perte de données.
  </done>
</task>
```

### Sprint 2 : Service Worker PWA (2 jours)

```xml
<task type="implementation">
  <id>offline-3</id>
  <name>Configurer vite-plugin-pwa</name>
  <files>
    vite.config.ts
    src/sw.ts
    public/manifest.json
  </files>
  <action>
    Installer et configurer vite-plugin-pwa :
    - registerType: 'autoUpdate'
    - workbox runtime caching pour assets
    - Manifest avec icônes, nom, couleurs
    - Cache-first pour assets, network-first pour API
  </action>
  <verify>
    npm run build
    Lighthouse PWA audit > 90
    App installable sur mobile
  </verify>
  <done>
    PWA installable.
    Fonctionne offline (affichage).
    Score Lighthouse > 90.
  </done>
</task>
```

### Sprint 3 : Sync Queue (3 jours)

```xml
<task type="implementation">
  <id>offline-4</id>
  <name>Créer la queue de synchronisation</name>
  <files>
    src/shared/services/syncQueue.ts
    src/shared/services/syncQueue.test.ts
  </files>
  <action>
    Créer un système de queue pour les actions offline :
    - addToQueue(action: SyncAction) : ajoute une action
    - processQueue() : traite les actions en attente
    - Retry avec backoff exponentiel (1s, 2s, 4s, 8s, max 30s)
    - Persistance de la queue dans IndexedDB
    - Event 'online' déclenche processQueue()
  </action>
  <verify>
    npm test -- syncQueue
    Simuler offline → actions → online → sync automatique
  </verify>
  <done>
    Queue fonctionne.
    Retry automatique.
    Sync au retour réseau.
  </done>
</task>
```

```xml
<task type="implementation">
  <id>offline-5</id>
  <name>Résolution de conflits</name>
  <files>
    src/shared/utils/conflictResolution.ts
  </files>
  <action>
    Utiliser le système existant (déjà implémenté et testé) :
    - resolveConflict() : last-write-wins basé sur updatedAt
    - mergeActionsById() : fusion des listes d'actions
    - detectConflicts() : identification des conflits
  </action>
  <verify>
    Tests existants passent.
    Scénario : 2 tablettes modifient le même match → pas de perte.
  </verify>
  <done>
    Conflits résolus automatiquement.
    Aucune perte de données.
  </done>
</task>
```

### Sprint 4 : UI Offline (2 jours)

```xml
<task type="implementation">
  <id>offline-6</id>
  <name>Indicateurs de statut offline</name>
  <files>
    src/components/OfflineIndicator.tsx
    src/components/SyncStatus.tsx
  </files>
  <action>
    Créer des composants UI :
    - OfflineIndicator : bandeau "Hors ligne" quand navigator.onLine = false
    - SyncStatus : badge avec nombre d'actions en attente
    - Bouton "Synchroniser maintenant" pour forcer
    - Toast de confirmation après sync réussie
  </action>
  <verify>
    Couper le WiFi → bandeau apparaît.
    Faire des actions → compteur augmente.
    Rétablir WiFi → sync + toast.
  </verify>
  <done>
    UI claire pour l'utilisateur.
    Feedback visuel complet.
  </done>
</task>
```

## Critères de succès

- [ ] Score Lighthouse PWA > 90
- [ ] App fonctionne 100% offline (création compétition, saisie scores)
- [ ] Sync automatique < 5 secondes au retour réseau
- [ ] Aucune perte de données en cas de conflit
- [ ] Tests unitaires pour tous les nouveaux services

## Dépendances

- `idb` : Wrapper IndexedDB moderne
- `vite-plugin-pwa` : Plugin PWA pour Vite
- `workbox` : Service Worker utilities

## Risques

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Quota IndexedDB dépassé | Faible | Élevé | Nettoyage auto des vieilles données |
| Conflits de sync complexes | Moyen | Moyen | Last-write-wins + logs |
| Performance sur vieux devices | Moyen | Faible | Lazy loading, pagination |
