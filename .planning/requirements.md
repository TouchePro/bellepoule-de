# Requirements - BellePoule Modern

## V1 - Core (LIVRÉ ✅)

### Gestion des tireurs
- [x] Import CSV/Excel/FFE/XML
- [x] Export TXT/FFF/PDF
- [x] Validation des données
- [x] Gestion des clubs/nations

### Phase de poules
- [x] Création automatique des poules
- [x] Séparation par club/ligue
- [x] Seeding serpentine
- [x] Calcul des classements (V/M, indice, TD)

### Tableau à élimination directe
- [x] Génération automatique (puissance de 2)
- [x] Placement selon classement poules
- [x] Gestion des exempts (byes)
- [x] Match pour la 3ème place

### Règles FFE Sabre Laser
- [x] Zones de touches : A=1pt, B=3pt, C=5pt
- [x] Système de cartons (Groupes 1-4)
- [x] Escalade : Jaune → Rouge → Rouge → Noir
- [x] Points Quest : V4≥12, V3≥8, V2≥4, V1≤3
- [x] Mort subite Challenger (10 pts d'écart)
- [x] Mort subite Timeout (fin du temps)
- [x] Zone C uniquement en mort subite
- [x] Sortie d'arène (+3 pts)

### Tests unitaires
- [x] cardSystem (escalade FFE)
- [x] touchSystem (zones A/B/C)
- [x] suddenDeath (challenger + timeout)
- [x] poolCalculations (classement + Quest)
- [x] tableCalculations (seeding + ranking)
- [x] scoreValidation
- [x] conflictResolution
- [x] import/export

## V2 - Mode Hors-Ligne (EN COURS 🔜)

### PWA
- [ ] Service Worker avec cache
- [ ] Manifest pour installation
- [ ] Score Lighthouse PWA > 90

### Stockage local
- [ ] IndexedDB pour compétitions
- [ ] Persistance des matchs en cours
- [ ] Nettoyage des anciennes données

### Synchronisation
- [ ] Queue d'actions offline
- [ ] Retry avec backoff exponentiel
- [ ] Résolution de conflits (last-write-wins)
- [ ] Indicateur de statut sync

## V3 - Dashboard Live (PLANIFIÉ 📋)

### Temps réel
- [ ] WebSocket pour scores
- [ ] Push notifications
- [ ] État des pistes

### Vue spectateur
- [ ] Classement en direct
- [ ] Matchs en cours
- [ ] Résultats récents

## V4 - Formule ASL Compétition (PLANIFIÉ 📋)

### Configuration avancée
- [ ] Poules Quest configurables
- [ ] Tableaux avec repêchages
- [ ] Phases multiples

### Intégration FFE
- [ ] Export résultats officiel
- [ ] Import classements nationaux
