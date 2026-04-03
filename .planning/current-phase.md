# Phase Actuelle : Interface de Saisie Distante + Mode Hors-Ligne

**Phase** : 3  
**Statut** : EN COURS (~55%)  
**Priorité** : HIGH

## Contexte

Les arbitres utilisent des tablettes pour saisir les scores à distance pendant les compétitions. L'interface `referee.html` existe mais n'est pas 100% fonctionnelle. La connexion WiFi est souvent instable dans les gymnases, donc l'application doit aussi fonctionner hors-ligne.

## Objectifs

1. **Interface de saisie distante 100% fonctionnelle** sur tablette
2. **Mode hors-ligne** avec synchronisation automatique

---

## Partie A : Interface de Saisie Distante

### Sprint A1 : Audit et correction de referee.html (2 jours)

```xml
<task type="audit">
  <id>remote-1</id>
  <n>Auditer l'interface referee.html existante</n>
  <files>
    src/pages/referee.html
    src/features/remote-scoring/
  </files>
  <action>
    Analyser l'état actuel :
    - Lister toutes les fonctionnalités (zones A/B/C, cartons, chrono, etc.)
    - Identifier ce qui fonctionne vs ce qui est cassé
    - Vérifier la connexion WebSocket/HTTP avec l'app principale
    - Tester sur tablette réelle (iPad, Android)
  </action>
  <verify>
    Document markdown listant : ✅ OK / ❌ KO / ⚠️ Partiel pour chaque feature
  </verify>
  <done>
    Rapport d'audit complet avec liste des bugs à fixer.
  </done>
</task>
```

```xml
<task type="implementation">
  <id>remote-2</id>
  <n>Corriger les boutons de zones A/B/C</n>
  <files>
    src/pages/referee.html
    src/features/remote-scoring/touchHandler.ts
  </files>
  <action>
    S'assurer que :
    - Clic sur Zone A → +1 point au tireur sélectionné
    - Clic sur Zone B → +3 points au tireur sélectionné
    - Clic sur Zone C → +5 points au tireur sélectionné
    - Feedback visuel immédiat (animation, son)
    - Sync avec l'app principale en temps réel
  </action>
  <verify>
    Test manuel : cliquer chaque zone, vérifier score côté arbitre ET côté app principale.
  </verify>
  <done>
    Zones A/B/C fonctionnelles avec sync temps réel.
  </done>
</task>
```

```xml
<task type="implementation">
  <id>remote-3</id>
  <n>Corriger le système de cartons</n>
  <files>
    src/pages/referee.html
    src/features/remote-scoring/cardHandler.ts
    src/shared/utils/cardSystem.ts
  </files>
  <action>
    S'assurer que :
    - Sélection du groupe de faute (1-4)
    - Affichage du carton approprié selon l'escalade
    - Exclusion automatique sur carton noir
    - Attribution des points de pénalité
    - Historique des cartons visible
  </action>
  <verify>
    Scénario : Groupe 1 → Jaune → Rouge → Rouge → Noir (exclusion)
  </verify>
  <done>
    Système de cartons complet conforme FFE.
  </done>
</task>
```

```xml
<task type="implementation">
  <id>remote-4</id>
  <n>Corriger la mort subite</n>
  <files>
    src/pages/referee.html
    src/features/remote-scoring/suddenDeathHandler.ts
    src/shared/utils/suddenDeath.ts
  </files>
  <action>
    S'assurer que :
    - Détection auto mode Challenger (10 pts d'écart)
    - Détection auto mode Timeout (fin du temps + égalité)
    - En mort subite : seule Zone C cliquable
    - Zones A et B grisées/désactivées
    - Tirage au sort si aucune touche
  </action>
  <verify>
    Test : créer situation 10-0 → mort subite activée → seule Zone C active
  </verify>
  <done>
    Mort subite fonctionnelle (2 modes).
  </done>
</task>
```

```xml
<task type="implementation">
  <id>remote-5</id>
  <n>Corriger la sortie d'arène</n>
  <files>
    src/pages/referee.html
    src/features/remote-scoring/arenaExitHandler.ts
  </files>
  <action>
    S'assurer que :
    - Bouton "Sortie d'arène" visible
    - +3 points à l'adversaire
    - Option "Sortie volontaire" → +3 pts + carton
    - Confirmation avant validation
  </action>
  <verify>
    Test : clic sortie → +3 pts adversaire affiché
  </verify>
  <done>
    Sortie d'arène fonctionnelle.
  </done>
</task>
```

### Sprint A2 : Chronomètre et contrôles (2 jours)

```xml
<task type="implementation">
  <id>remote-6</id>
  <n>Implémenter le chronomètre</n>
  <files>
    src/pages/referee.html
    src/features/remote-scoring/timerHandler.ts
  </files>
  <action>
    Chronomètre avec :
    - Start / Pause / Reset
    - Compte à rebours configurable (3min par défaut)
    - Alerte sonore à 30s, 10s, 0s
    - Déclenchement auto mort subite timeout à 0
    - Sync avec app principale
  </action>
  <verify>
    Lancer chrono sur tablette → visible sur app principale en sync
  </verify>
  <done>
    Chronomètre synchronisé fonctionnel.
  </done>
</task>
```

```xml
<task type="implementation">
  <id>remote-7</id>
  <n>Boutons Annuler et Historique</n>
  <files>
    src/pages/referee.html
    src/features/remote-scoring/historyHandler.ts
  </files>
  <action>
    Implémenter :
    - Bouton "Annuler dernière action" (undo)
    - Historique des 10 dernières actions
    - Possibilité d'annuler n'importe quelle action récente
    - Confirmation avant annulation
  </action>
  <verify>
    Ajouter touche → Annuler → Score revient à l'état précédent
  </verify>
  <done>
    Undo et historique fonctionnels.
  </done>
</task>
```

### Sprint A3 : UX tablette (2 jours)

```xml
<task type="implementation">
  <id>remote-8</id>
  <n>Optimiser l'UI pour tablette</n>
  <files>
    src/pages/referee.html
    src/styles/referee.css
  </files>
  <action>
    Optimisations tactiles :
    - Boutons minimum 48x48px (recommandation Google)
    - Zones de touch larges et bien espacées
    - Pas de hover states (inutile tactile)
    - Feedback visuel fort (couleurs, animations)
    - Mode paysage optimisé
    - Pas de scroll nécessaire
  </action>
  <verify>
    Test sur iPad et tablette Android. Utilisable sans erreur de clic.
  </verify>
  <done>
    UI 100% optimisée tactile.
  </done>
</task>
```

```xml
<task type="implementation">
  <id>remote-9</id>
  <n>Sélection du match et des tireurs</n>
  <files>
    src/pages/referee.html
    src/features/remote-scoring/matchSelector.ts
  </files>
  <action>
    Interface de sélection :
    - Liste des matchs en attente
    - Sélection du match à arbitrer
    - Affichage clair des 2 tireurs (nom, club, photo si dispo)
    - Changement de match facile
    - Indicateur "Match en cours" visible
  </action>
  <verify>
    Sélectionner un match → noms des tireurs affichés → prêt à saisir
  </verify>
  <done>
    Sélection de match intuitive.
  </done>
</task>
```

---

## Partie B : Mode Hors-Ligne

### Sprint B1 : IndexedDB Storage (2 jours)

```xml
<task type="implementation">
  <id>offline-1</id>
  <n>Créer le service IndexedDB</n>
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
  <n>Intégrer IndexedDB dans l'interface referee</n>
  <files>
    src/pages/referee.html
    src/features/remote-scoring/offlineMode.ts
  </files>
  <action>
    Modifier referee.html pour :
    - Sauvegarder chaque action localement AVANT d'envoyer au serveur
    - Si offline : stocker dans la queue
    - Si online : envoyer immédiatement
    - Charger le dernier état du match au démarrage
  </action>
  <verify>
    Couper le WiFi → saisir des touches → reconnecter → sync auto
  </verify>
  <done>
    Saisie fonctionne offline.
  </done>
</task>
```

### Sprint B2 : Service Worker PWA (2 jours)

```xml
<task type="implementation">
  <id>offline-3</id>
  <n>Configurer le Service Worker pour referee.html</n>
  <files>
    src/sw-referee.ts
    src/pages/referee.html
  </files>
  <action>
    Service Worker dédié à l'interface arbitre :
    - Cache de referee.html et ses assets
    - Fonctionne 100% offline
    - Stratégie cache-first pour l'UI
    - Network-first pour les données
  </action>
  <verify>
    Mode avion → ouvrir referee.html → interface s'affiche
  </verify>
  <done>
    Page referee accessible offline.
  </done>
</task>
```

### Sprint B3 : Sync Queue (2 jours)

```xml
<task type="implementation">
  <id>offline-4</id>
  <n>Queue de synchronisation pour actions arbitre</n>
  <files>
    src/shared/services/syncQueue.ts
    src/shared/services/syncQueue.test.ts
  </files>
  <action>
    Queue spécifique pour les actions de saisie :
    - addToQueue(action: ScoreAction | CardAction | etc.)
    - processQueue() au retour online
    - Retry avec backoff exponentiel
    - Ordre chronologique préservé
    - Gestion des conflits (même match modifié par 2 tablettes)
  </action>
  <verify>
    npm test -- syncQueue
    Simuler offline → 10 actions → online → toutes sync dans l'ordre
  </verify>
  <done>
    Queue robuste avec retry.
  </done>
</task>
```

### Sprint B4 : UI Offline (1 jour)

```xml
<task type="implementation">
  <id>offline-5</id>
  <n>Indicateurs offline dans referee.html</n>
  <files>
    src/pages/referee.html
    src/styles/referee.css
  </files>
  <action>
    Indicateurs visuels :
    - Bandeau rouge "HORS LIGNE" quand déconnecté
    - Badge avec nombre d'actions en attente de sync
    - Icône de sync animée pendant synchronisation
    - Toast "Synchronisé ✓" après sync réussie
    - Les actions continuent de fonctionner (pas de blocage)
  </action>
  <verify>
    Couper WiFi → bandeau apparaît → actions toujours possibles
  </verify>
  <done>
    UX claire en mode offline.
  </done>
</task>
```

---

## Critères de succès Phase 3

### Interface de saisie distante
- [x] Zones A/B/C fonctionnelles avec bon scoring ✅
- [x] Système de cartons (blanc→jaune, jaune, rouge + pénalités) ✅
- [x] Mort subite Timeout (timer=0 + égalité → 30s) ✅
- [x] Mort subite Challenger (écart ≥ 10 pts) ✅
- [x] Blocage zones A/B en mort subite (seule Zone C active) ✅
- [x] Sortie d'arène (+3 pts adversaire) ✅
- [x] Chronomètre synchronisé ✅
- [x] Undo / Historique fonctionnel (10 actions) ✅
- [ ] UI optimisée tablette (boutons ≥48px, pas de scroll, paysage)
- [ ] Sélection de match avancée

### Mode hors-ligne
- [ ] Saisie fonctionne sans connexion
- [ ] Sync automatique au retour réseau
- [ ] Aucune perte de données
- [ ] Indicateurs visuels clairs

### Global
- [ ] Testé sur iPad et tablette Android
- [ ] Temps de réponse < 100ms
- [ ] 0 bug bloquant pendant une compétition test

---

## Dépendances

- `idb` : Wrapper IndexedDB moderne
- Connexion WebSocket/HTTP existante avec l'app principale

## Risques

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Conflits si 2 arbitres sur même match | Moyen | Élevé | Lock du match + alerte |
| Latence réseau en gymnase | Élevé | Moyen | Mode offline par défaut |
| Batterie tablette | Faible | Moyen | Optimisation JS, pas d'animations lourdes |
