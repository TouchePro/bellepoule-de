# 📋 Product Requirements Document (PRD)
# BellePoule Modern

**Version** : 1.0  
**Date** : 19 février 2026  
**Auteur** : Yann Kervella  
**Statut** : Draft  

---

## 📑 Table des matières

1. [Vision & Objectifs](#1-vision--objectifs)
2. [Utilisateurs Cibles](#2-utilisateurs-cibles)
3. [Fonctionnalités](#3-fonctionnalités)
4. [Exigences Techniques](#4-exigences-techniques)
5. [Architecture](#5-architecture)
6. [Roadmap](#6-roadmap)
7. [Métriques de Succès](#7-métriques-de-succès)
8. [Risques & Mitigations](#8-risques--mitigations)
9. [Annexes](#9-annexes)

---

## 1. Vision & Objectifs

### 1.1 Vision

**BellePoule Modern** a pour ambition de devenir **LA référence mondiale** pour la gestion des compétitions d'escrime, en remplaçant complètement l'ancien logiciel BellePoule par une solution moderne, performante et évolutive.

> *"Un logiciel d'escrime moderne, gratuit et open source, conçu par et pour la communauté."*

### 1.2 Objectifs Stratégiques

| Objectif | Description | Horizon |
|----------|-------------|---------|
| **Adoption** | 10 clubs utilisateurs actifs | 12 mois |
| **Remplacement** | Alternative crédible à l'ancien BellePoule | 6 mois |
| **Référence** | Standard de facto en France | 24 mois |
| **International** | Expansion hors France (Belgique, Suisse, etc.) | 36 mois |

### 1.3 Principes Fondateurs

1. **Open Source (GPL-3.0)** : Code source ouvert, contributions bienvenues
2. **Gratuit** : Aucune licence payante, jamais
3. **Multi-plateforme** : Windows, macOS, Linux (x64 & ARM64)
4. **Moderne** : Architecture évolutive permettant l'ajout rapide de fonctionnalités
5. **Communautaire** : Développé avec et pour les utilisateurs

---

## 2. Utilisateurs Cibles

### 2.1 Personas Principaux

#### 👨‍⚖️ Persona 1 : L'Arbitre (e-Arbitre)
| Attribut | Description |
|----------|-------------|
| **Rôle** | Arbitre sur piste lors des compétitions |
| **Contexte** | Utilise une tablette pour saisir les scores en temps réel |
| **Besoins** | Interface tactile intuitive, gros boutons, chronomètre visible |
| **Frustrations** | Interfaces trop petites, bugs de synchronisation |
| **Objectif** | Saisir les scores rapidement sans erreur |

#### 🤺 Persona 2 : Le Tireur
| Attribut | Description |
|----------|-------------|
| **Rôle** | Compétiteur participant aux tournois |
| **Contexte** | Consulte ses résultats, son classement, ses prochains matchs |
| **Besoins** | Accès rapide aux informations, notifications |
| **Frustrations** | Ne pas savoir quand passer, résultats tardifs |
| **Objectif** | Suivre sa progression et se préparer pour le prochain match |

#### 🏢 Persona 3 : Le Comité Technique
| Attribut | Description |
|----------|-------------|
| **Rôle** | Organisateur de la compétition |
| **Contexte** | Gère l'ensemble du tournoi depuis un PC central |
| **Besoins** | Vue d'ensemble, contrôle total, exports FFE |
| **Frustrations** | Logiciels obsolètes, bugs, manque de fonctionnalités |
| **Objectif** | Organiser une compétition fluide et sans accroc |

### 2.2 Niveau Technique

- **Niveau moyen** : Utilisateurs habitués aux logiciels de gestion de compétition
- **Besoin critique** : Documentation claire et complète
- **Formation** : Guides utilisateur, tutoriels vidéo (à développer)

---

## 3. Fonctionnalités

### 3.1 Fonctionnalités Actuelles (v1.0.1)

#### ✅ Gestion des Compétitions
| Fonctionnalité | Statut | Description |
|----------------|--------|-------------|
| Création de compétition | ✅ Fait | Titre, date, arme, catégorie, genre |
| Import tireurs (FFE) | ✅ Fait | Fichiers .fff, .csv, .xml |
| Pointage/Appel | ✅ Fait | Check-in des tireurs avec statuts |
| Abandon/Forfait | ✅ Fait | Impact automatique sur les matchs |

#### ✅ Phase de Poules
| Fonctionnalité | Statut | Description |
|----------------|--------|-------------|
| Génération serpentine | ✅ Fait | Répartition équilibrée des tireurs |
| Configuration flexible | ✅ Fait | Nombre de tireurs/poule, tours multiples |
| Saisie des scores | ✅ Fait | Interface modale avec validation |
| Classement automatique | ✅ Fait | V/M, indice, TD, TR |
| Export PDF | ✅ Fait | Grille + matchs sur une page |

#### ✅ Phase de Tableau (Élimination Directe)
| Fonctionnalité | Statut | Description |
|----------------|--------|-------------|
| Génération tableau | ✅ Fait | 4, 8, 16, 32, 64 tireurs |
| Seeding FIE | ✅ Fait | Placement selon classement poules |
| Gestion des byes | ✅ Fait | Attribution automatique |
| Propagation vainqueurs | ✅ Fait | Avancement automatique |

#### ✅ Système Quest (Sabre Laser) ⭐ PRIORITÉ
| Fonctionnalité | Statut | Description |
|----------------|--------|-------------|
| Points Quest | ✅ Fait | 1-4 pts selon écart de score |
| Classement Quest | ✅ Fait | Points > TD > Victoires > V4/V3/V2/V1 |
| Affichage dédié | ✅ Fait | Colonne Quest dans les poules |

#### ✅ Fonctionnalités Techniques
| Fonctionnalité | Statut | Description |
|----------------|--------|-------------|
| Persistance session | ✅ Fait | Survit au refresh (F5) |
| Base SQLite | ✅ Fait | Stockage local portable |
| Multi-langue | ✅ Fait | FR, EN, Breton |
| Mises à jour auto | ✅ Fait | Vérification au démarrage |

### 3.2 Fonctionnalités Prioritaires (Roadmap)

#### 🔴 Priorité 1 : Interface Tablette (Q1 2026)
| Fonctionnalité | Description | Effort |
|----------------|-------------|--------|
| Zones tactiles agrandies | Boutons minimum 48x48px | M |
| Mode plein écran arbitre | Interface dédiée sans distractions | M |
| Gestes swipe | Ajouter points par glissement | S |
| Chronomètre grande taille | Visible de loin sur la piste | S |
| Commandes vocales | "Point rouge", "Point vert", "Pause" | L |
| Mode hors-ligne complet | Synchronisation différée | L |

#### 🟠 Priorité 2 : Documentation (Q1 2026)
| Document | Description | Effort |
|----------|-------------|--------|
| Guide utilisateur | Manuel complet avec captures | M |
| Tutoriels vidéo | 5-10 vidéos courtes | L |
| FAQ | Questions fréquentes | S |
| Guide arbitre tablette | Spécifique e-Arbitre | S |

#### 🟡 Priorité 3 : Stabilité & Bugs (Q1-Q2 2026)
| Action | Description | Effort |
|--------|-------------|--------|
| Tests automatisés | Couverture > 80% | L |
| Correction bugs connus | Backlog GitHub Issues | M |
| Performance | Optimisation 10 pistes simultanées | M |
| Monitoring | Logs et alertes | S |

#### 🟢 Priorité 4 : Nouvelles Fonctionnalités (Q2-Q3 2026)
| Fonctionnalité | Description | Effort |
|----------------|-------------|--------|
| Compétitions par équipes | Relais, matchs par équipe | XL |
| Export FFE officiel | Envoi résultats à la fédération | L |
| Version web/cloud | Option serveur centralisé | XL |
| Statistiques avancées | Analytics pour entraîneurs | M |

### 3.3 Matrice des Priorités (MoSCoW)

| Must Have | Should Have | Could Have | Won't Have (v1) |
|-----------|-------------|------------|-----------------|
| Interface tablette optimisée | Documentation complète | Version web/cloud | Intégration vidéo |
| Mode hors-ligne | Tests automatisés | Statistiques avancées | IA/ML prédictions |
| Système Quest stable | Export FFE | Notifications push | Réalité augmentée |
| 10 pistes simultanées | Multi-compétition | Thèmes personnalisés | Blockchain |

---

## 4. Exigences Techniques

### 4.1 Performance

| Métrique | Exigence | Actuel |
|----------|----------|--------|
| Tireurs par compétition | 200+ | ✅ OK |
| Pistes/Poules simultanées | 10 | ✅ OK |
| Temps de démarrage | < 3s | ✅ ~2s |
| Temps export PDF | < 2s | ✅ ~1s |
| Synchronisation tablette | < 500ms | ⚠️ À tester |

### 4.2 Compatibilité

| Plateforme | Version Minimum | Statut |
|------------|-----------------|--------|
| Windows | 10 (64-bit) | ✅ Supporté |
| macOS | 10.15 (Catalina) | ✅ Supporté |
| Linux x64 | Ubuntu 20.04+ | ✅ Supporté |
| Linux ARM64 | Raspberry Pi 4+ | ✅ Supporté |

### 4.3 Formats de Fichiers

| Format | Import | Export | Description |
|--------|--------|--------|-------------|
| .fff (FFE) | ✅ | 🔜 | Format Fédération Française |
| .csv | ✅ | ✅ | Universel |
| .xml | ✅ | ✅ | BellePoule legacy |
| .pdf | ❌ | ✅ | Impression/archivage |
| .json | ✅ | ✅ | Sauvegarde/échange |

### 4.4 Mode Hors-Ligne

| Fonctionnalité | Exigence |
|----------------|----------|
| Stockage local | SQLite embarqué |
| Synchronisation | Différée avec résolution conflits |
| Détection réseau | Automatique avec indicateur visuel |
| Queue d'actions | File d'attente des modifications |

---

## 5. Architecture

### 5.1 Stack Technique

```
┌─────────────────────────────────────────────────────────┐
│                    PRÉSENTATION                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│  │   React 19  │  │  Tailwind   │  │  TypeScript │      │
│  └─────────────┘  └─────────────┘  └─────────────┘      │
├─────────────────────────────────────────────────────────┤
│                      LOGIQUE                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│  │  Electron   │  │  WebSocket  │  │   Express   │      │
│  │     40+     │  │  (Socket.io)│  │   (API)     │      │
│  └─────────────┘  └─────────────┘  └─────────────┘      │
├─────────────────────────────────────────────────────────┤
│                      DONNÉES                             │
│  ┌─────────────┐  ┌─────────────┐                       │
│  │   SQLite    │  │  sql.js     │                       │
│  │  (fichier)  │  │  (mémoire)  │                       │
│  └─────────────┘  └─────────────┘                       │
└─────────────────────────────────────────────────────────┘
```

### 5.2 Composants Principaux

| Composant | Fichier | Responsabilité |
|-----------|---------|----------------|
| CompetitionView | CompetitionView.tsx | Orchestration phases |
| PoolView | PoolView.tsx | Gestion d'une poule |
| TableauView | TableauView.tsx | Élimination directe |
| FencerList | FencerList.tsx | Liste des tireurs |
| RemoteScoreManager | RemoteScoreManager.tsx | Saisie distante |

### 5.3 Flux de Données

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Tablette│────▶│ WebSocket│────▶│  Serveur │
│  Arbitre │◀────│  Server  │◀────│  Central │
└──────────┘     └──────────┘     └──────────┘
                                        │
                                        ▼
                                  ┌──────────┐
                                  │  SQLite  │
                                  │   DB     │
                                  └──────────┘
```

---

## 6. Roadmap

### 6.1 Vue d'Ensemble

```
2026
──────────────────────────────────────────────────────────▶

Q1 2026                    Q2 2026                    Q3 2026
├─────────────────────────┼─────────────────────────┼─────────
│                         │                         │
│  v1.1 - Tablette        │  v1.2 - Stabilité      │  v2.0 - Équipes
│  ┌─────────────────┐    │  ┌─────────────────┐   │  ┌─────────────────┐
│  │ Interface tactile│    │  │ Tests auto 80%  │   │  │ Compét. équipes │
│  │ Documentation    │    │  │ Bugs critiques  │   │  │ Export FFE      │
│  │ Mode hors-ligne  │    │  │ Performance 10p │   │  │ Version web ?   │
│  └─────────────────┘    │  └─────────────────┘   │  └─────────────────┘
│                         │                         │
```

### 6.2 Détail par Version

#### v1.1 - "Tablette First" (Mars 2026)

| Livrable | Description | Owner |
|----------|-------------|-------|
| Interface tactile | Boutons 48px+, zones de touch | Dev |
| Mode arbitre | Plein écran dédié | Dev |
| Hors-ligne | Sync différée | Dev |
| Guide utilisateur | PDF + web | Doc |
| Tutoriels vidéo | 5 vidéos | Doc |

#### v1.2 - "Stabilité" (Juin 2026)

| Livrable | Description | Owner |
|----------|-------------|-------|
| Tests unitaires | Couverture 80% | Dev |
| Tests E2E | Scénarios critiques | QA |
| Bugs backlog | 0 bugs critiques | Dev |
| Performance | 10 pistes fluides | Dev |

#### v2.0 - "Équipes" (Septembre 2026)

| Livrable | Description | Owner |
|----------|-------------|-------|
| Compétitions équipes | Matchs par équipe | Dev |
| Export FFE officiel | Intégration fédération | Dev |
| Version web (option) | Serveur centralisé | Dev |

---

## 7. Métriques de Succès

### 7.1 KPIs Principaux

| KPI | Cible Q2 2026 | Cible Q4 2026 |
|-----|---------------|---------------|
| Clubs actifs | 5 | 10 |
| Compétitions/mois | 10 | 30 |
| Bugs critiques ouverts | < 3 | 0 |
| Note satisfaction | 4/5 | 4.5/5 |
| Temps moyen saisie score | < 5s | < 3s |

### 7.2 Métriques Techniques

| Métrique | Cible |
|----------|-------|
| Uptime (mode réseau) | 99.5% |
| Crash rate | < 0.1% |
| Temps de sync tablette | < 500ms |
| Couverture tests | > 80% |

---

## 8. Risques & Mitigations

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Bugs critiques en compétition | Moyen | Élevé | Mode dégradé, tests intensifs |
| Adoption lente | Moyen | Moyen | Documentation, formations clubs |
| Concurrence (Engarde) | Faible | Moyen | Différenciation open source + Quest |
| Perte du mainteneur | Faible | Élevé | Documentation code, contributeurs |
| Changements règles FFE | Faible | Moyen | Architecture modulaire |

---

## 9. Annexes

### 9.1 Glossaire

| Terme | Définition |
|-------|------------|
| **Poule** | Phase de qualification en round-robin |
| **Tableau** | Phase d'élimination directe |
| **Quest** | Système de points pour Sabre Laser (1-4 pts) |
| **FFE** | Fédération Française d'Escrime |
| **FIE** | Fédération Internationale d'Escrime |
| **Serpentine** | Méthode de répartition équilibrée |
| **Bye** | Exemption quand nombre impair |
| **TD/TR** | Touches Données / Touches Reçues |
| **V/M** | Ratio Victoires / Matchs |

### 9.2 Références

- [GitHub Repository](https://github.com/klinnex/bellepoule-modern)
- [BellePoule Original](http://betton.escrime.free.fr/index.php/bellepoule)
- [Règlement FFE](https://www.escrime-ffe.fr/)
- [Règlement FIE](https://fie.org/)

### 9.3 Historique des Versions

| Version PRD | Date | Auteur | Changements |
|-------------|------|--------|-------------|
| 1.0 | 19/02/2026 | Y. Kervella | Version initiale |

---

## ✅ Validation

| Rôle | Nom | Date | Signature |
|------|-----|------|-----------|
| Product Owner | Yann Kervella | ___ | ___ |
| Tech Lead | ___ | ___ | ___ |
| Représentant Clubs | ___ | ___ | ___ |

---

*Document généré le 19 février 2026*  
*BellePoule Modern - Open Source sous licence GPL-3.0*
