# 🗺️ ROADMAP - Sabre Laser (ASL-FFE)
# BellePoule Modern

**Version** : 1.0  
**Date** : 19 février 2026  
**Basé sur** : Règlement FFE Saison 2025-2026 (Livret 2)

---

## 📊 État Actuel du Code (Branche dev)

### ✅ Fonctionnalités Implémentées

| Fonctionnalité | Fichier | Statut |
|----------------|---------|--------|
| Arme Sabre Laser (LASER) | `types/index.ts` | ✅ Enum `Weapon.LASER` |
| Points Quest (1-4 pts) | `poolCalculations.ts` | ✅ `calculateQuestPoints()` |
| Stats Quest (V1/V2/V3/V4) | `poolCalculations.ts` | ✅ `calculateFencerQuestStats()` |
| Classement Quest poule | `poolCalculations.ts` | ✅ `calculatePoolRankingQuest()` |
| Classement Quest général | `poolCalculations.ts` | ✅ `calculateOverallRankingQuest()` |
| Statut Abandon | `types/index.ts` | ✅ `FencerStatus.ABANDONED` |
| Statut Forfait | `types/index.ts` | ✅ `FencerStatus.FORFAIT` |
| Statut Exclusion | `types/index.ts` | ✅ `FencerStatus.EXCLUDED` |
| Score Abandon/Forfait | `types/index.ts` | ✅ `Score.isAbstention/isForfait` |

### ❌ Fonctionnalités Manquantes

| Fonctionnalité | Priorité | Complexité |
|----------------|----------|------------|
| Système de cartons (J/R/N) | 🔴 Haute | Moyenne |
| Sortie d'arène (+3 pts) | 🔴 Haute | Faible |
| Saisie par cible (1/3/5 pts) | 🔴 Haute | Moyenne |
| Mort Subite | 🟠 Moyenne | Haute |
| Chronomètre temps réel | 🟠 Moyenne | Moyenne |
| Formule ASL Compétition | 🟡 Basse | Haute |

---

## 🎯 SPRINT 1 : Cartons et Pénalités (2 semaines)

### 1.1 Modèle de Données - Cartons

**Fichier** : `src/shared/types/index.ts`

```typescript
// === NOUVEAU : Types pour les cartons ===

export enum CardType {
  YELLOW = 'yellow',   // Avertissement
  RED = 'red',         // +1 pt adversaire
  BLACK = 'black',     // Exclusion immédiate
}

export enum CardReason {
  // Groupe 1 - Jaune puis Rouge
  EARLY_START = 'early_start',           // Départ avant "Combattez!"
  LATE_STOP = 'late_stop',               // Continue après "Cessez!"
  BODY_CONTACT = 'body_contact',         // Corps à corps volontaire
  COUNTER_ATTACK = 'counter_attack',     // Contre-attaque
  TARGET_SUBSTITUTION = 'target_sub',    // Substitution de cible
  VOLUNTARY_DROP = 'voluntary_drop',     // Lâcher de sabre volontaire
  TIME_WASTING = 'time_wasting',         // Faire perdre du temps
  NON_COMPLIANT_GEAR = 'gear',           // Matériel non conforme
  
  // Groupe 2 - Rouge direct
  ESTOC = 'estoc',                       // Coup de pointe
  UNARMED_HAND = 'unarmed_hand',         // Usage main non armée
  VOLUNTARY_EXIT = 'voluntary_exit',     // Sortie volontaire
  HEAVY_HIT = 'heavy_hit',               // Frappe lourde
  
  // Groupe 3 - Rouge puis Exclusion
  BRUTALITY = 'brutality',               // Brutalité volontaire
  DANGEROUS = 'dangerous',               // Comportement dangereux
  
  // Groupe 4 - Noir immédiat
  REFUSAL = 'refusal',                   // Refus de combattre
  UNSPORTSMANLIKE = 'unsportsmanlike',   // Anti-sportif grave
  CHEATING = 'cheating',                 // Tricherie
}

export interface Card {
  id: string;
  matchId: string;
  fencerId: string;
  type: CardType;
  reason: CardReason;
  timestamp: Date;
  pointsAwarded: number;  // 0 pour jaune, 1 pour rouge, 0 pour noir (exclusion)
}

// Ajouter à Match
export interface Match extends BaseEntity {
  // ... existant ...
  cards?: Card[];  // Historique des cartons du match
}

// Ajouter à Fencer
export interface Fencer extends BaseEntity {
  // ... existant ...
  cardsReceived?: Card[];  // Historique des cartons de la compétition
  yellowCardCount?: number;
  redCardCount?: number;
}
```

### 1.2 Logique des Cartons

**Fichier** : `src/shared/utils/cardSystem.ts` (NOUVEAU)

```typescript
/**
 * Système de gestion des cartons FFE Sabre Laser
 */

import { Card, CardType, CardReason, Fencer, Match } from '../types';

// Mapping des raisons vers les groupes
const CARD_GROUPS: Record<CardReason, 1 | 2 | 3 | 4> = {
  // Groupe 1
  [CardReason.EARLY_START]: 1,
  [CardReason.LATE_STOP]: 1,
  [CardReason.BODY_CONTACT]: 1,
  [CardReason.COUNTER_ATTACK]: 1,
  [CardReason.TARGET_SUBSTITUTION]: 1,
  [CardReason.VOLUNTARY_DROP]: 1,
  [CardReason.TIME_WASTING]: 1,
  [CardReason.NON_COMPLIANT_GEAR]: 1,
  
  // Groupe 2
  [CardReason.ESTOC]: 2,
  [CardReason.UNARMED_HAND]: 2,
  [CardReason.VOLUNTARY_EXIT]: 2,
  [CardReason.HEAVY_HIT]: 2,
  
  // Groupe 3
  [CardReason.BRUTALITY]: 3,
  [CardReason.DANGEROUS]: 3,
  
  // Groupe 4
  [CardReason.REFUSAL]: 4,
  [CardReason.UNSPORTSMANLIKE]: 4,
  [CardReason.CHEATING]: 4,
};

/**
 * Détermine le type de carton à donner selon le groupe et l'historique
 */
export function determineCardType(
  reason: CardReason,
  previousCards: Card[]
): CardType {
  const group = CARD_GROUPS[reason];
  const sameGroupCards = previousCards.filter(
    c => CARD_GROUPS[c.reason] === group
  );
  const count = sameGroupCards.length;
  
  switch (group) {
    case 1:
      // Groupe 1: Jaune → Rouge → Rouge → Exclusion
      if (count === 0) return CardType.YELLOW;
      if (count <= 2) return CardType.RED;
      return CardType.BLACK;
      
    case 2:
      // Groupe 2: Rouge → Rouge → Exclusion
      if (count <= 1) return CardType.RED;
      return CardType.BLACK;
      
    case 3:
      // Groupe 3: Rouge → Exclusion
      if (count === 0) return CardType.RED;
      return CardType.BLACK;
      
    case 4:
      // Groupe 4: Noir immédiat
      return CardType.BLACK;
      
    default:
      return CardType.YELLOW;
  }
}

/**
 * Calcule les points attribués à l'adversaire
 */
export function calculateCardPoints(cardType: CardType): number {
  switch (cardType) {
    case CardType.RED:
      return 1;  // +1 point à l'adversaire
    case CardType.YELLOW:
    case CardType.BLACK:
      return 0;  // Pas de point (noir = exclusion)
    default:
      return 0;
  }
}

/**
 * Vérifie si le tireur doit être exclu
 */
export function shouldExclude(cardType: CardType): boolean {
  return cardType === CardType.BLACK;
}
```

### 1.3 Interface Utilisateur - Cartons

**Fichier** : `src/renderer/components/CardModal.tsx` (NOUVEAU)

```typescript
// Modal de saisie de carton avec:
// - Sélection du tireur (A ou B)
// - Sélection de la raison (groupée par groupe)
// - Affichage du type de carton résultant
// - Confirmation avec impact sur le score
```

**Fichier** : `src/renderer/components/PoolView.tsx` (MODIFIER)

```typescript
// Ajouter bouton "Carton" dans la modal de saisie de score
// Afficher l'historique des cartons dans la grille
// Icônes: 🟨 (jaune) 🟥 (rouge) ⬛ (noir)
```

### 1.4 Tâches Sprint 1

| Tâche | Fichier | Effort | Priorité |
|-------|---------|--------|----------|
| Ajouter types Card/CardType/CardReason | types/index.ts | 1h | P0 |
| Créer cardSystem.ts | utils/cardSystem.ts | 2h | P0 |
| Créer CardModal.tsx | components/CardModal.tsx | 4h | P0 |
| Modifier PoolView (bouton carton) | components/PoolView.tsx | 2h | P0 |
| Afficher cartons dans grille | components/PoolView.tsx | 2h | P1 |
| Sauvegarder cartons en base | database/index.ts | 2h | P1 |
| Tests unitaires cardSystem | tests/cardSystem.test.ts | 2h | P1 |

**Total estimé** : 15h (~2 jours)

---

## 🎯 SPRINT 2 : Sortie d'Arène (1 semaine)

### 2.1 Modèle de Données

**Fichier** : `src/shared/types/index.ts`

```typescript
export enum PenaltyType {
  ARENA_EXIT = 'arena_exit',           // Sortie normale (+3 pts)
  VOLUNTARY_ARENA_EXIT = 'voluntary',  // Sortie volontaire (+3 pts + carton rouge)
}

export interface Penalty {
  id: string;
  matchId: string;
  fencerId: string;
  type: PenaltyType;
  pointsAwarded: number;
  timestamp: Date;
  associatedCard?: Card;  // Si carton rouge associé
}
```

### 2.2 Interface Utilisateur

**Fichier** : `src/renderer/components/PoolView.tsx` (MODIFIER)

```typescript
// Dans la modal de score, ajouter:
// - Bouton "Sortie d'arène" (+3 pts)
// - Option "Sortie volontaire" (coche) → +3 pts + carton rouge
```

### 2.3 Tâches Sprint 2

| Tâche | Fichier | Effort | Priorité |
|-------|---------|--------|----------|
| Ajouter type Penalty | types/index.ts | 30min | P0 |
| Bouton sortie dans modal | components/PoolView.tsx | 2h | P0 |
| Attribution +3 pts auto | utils/poolCalculations.ts | 1h | P0 |
| Option sortie volontaire | components/PoolView.tsx | 1h | P1 |
| Affichage dans historique | components/PoolView.tsx | 1h | P1 |

**Total estimé** : 5h30 (~1 jour)

---

## 🎯 SPRINT 3 : Saisie par Cible (1 semaine)

### 3.1 Modèle de Données

**Fichier** : `src/shared/types/index.ts`

```typescript
export enum TargetZone {
  ZONE_A = 'A',  // Mains, poignets, arme (1 pt)
  ZONE_B = 'B',  // Bras, jambes (3 pts)
  ZONE_C = 'C',  // Tête, tronc (5 pts)
}

export const TARGET_POINTS: Record<TargetZone, number> = {
  [TargetZone.ZONE_A]: 1,
  [TargetZone.ZONE_B]: 3,
  [TargetZone.ZONE_C]: 5,
};

export interface Touch {
  id: string;
  matchId: string;
  fencerId: string;
  zone: TargetZone;
  points: number;
  timestamp: Date;
  isSalvo: boolean;  // Fait partie d'une salve
}
```

### 3.2 Interface Tablette

**Fichier** : `src/renderer/components/TouchOptimizedReferee.tsx` (MODIFIER)

```typescript
// Interface avec 3 gros boutons par combattant:
// [  1 pt  ] [  3 pts  ] [  5 pts  ]
//    (A)        (B)         (C)
// 
// Boutons de minimum 80x80 pixels
// Couleurs distinctes par zone
```

### 3.3 Tâches Sprint 3

| Tâche | Fichier | Effort | Priorité |
|-------|---------|--------|----------|
| Ajouter types TargetZone/Touch | types/index.ts | 30min | P0 |
| Interface 3 boutons par tireur | components/TouchOptimizedReferee.tsx | 4h | P0 |
| Calcul score depuis touches | utils/poolCalculations.ts | 1h | P0 |
| Historique touches (salve) | components/PoolView.tsx | 2h | P1 |
| Mode tactile optimisé | components/TouchOptimizedReferee.tsx | 2h | P1 |

**Total estimé** : 9h30 (~1.5 jours)

---

## 🎯 SPRINT 4 : Mort Subite (2 semaines)

### 4.1 Modèle de Données

**Fichier** : `src/shared/types/index.ts`

```typescript
export enum MatchMode {
  NORMAL = 'normal',
  SUDDEN_DEATH_CHALLENGER = 'sudden_death_challenger',  // 2x 10 pts
  SUDDEN_DEATH_TIMEOUT = 'sudden_death_timeout',        // Égalité fin temps
}

export interface Match extends BaseEntity {
  // ... existant ...
  mode?: MatchMode;
  suddenDeathStartTime?: Date;
  suddenDeathDuration?: number;  // 30 secondes
}
```

### 4.2 Logique Mort Subite

**Fichier** : `src/shared/utils/suddenDeath.ts` (NOUVEAU)

```typescript
/**
 * Gestion de la mort subite FFE Sabre Laser
 */

import { Match, MatchMode, Score, TargetZone } from '../types';

/**
 * Vérifie si la mort subite doit être déclenchée (cas Challenger)
 */
export function shouldTriggerSuddenDeathChallenger(
  scoreA: number,
  scoreB: number
): boolean {
  return scoreA >= 10 && scoreB >= 10;
}

/**
 * Vérifie si la mort subite doit être déclenchée (fin du temps)
 */
export function shouldTriggerSuddenDeathTimeout(
  scoreA: number,
  scoreB: number,
  timeRemaining: number
): boolean {
  return timeRemaining <= 0 && scoreA === scoreB;
}

/**
 * Valide une touche en mort subite
 * Seule la zone C (tête/tronc) compte
 */
export function isValidSuddenDeathTouch(zone: TargetZone): boolean {
  return zone === TargetZone.ZONE_C;
}

/**
 * Vérifie si le match doit se terminer en mort subite
 */
export function shouldEndSuddenDeath(
  scoreA: number,
  scoreB: number,
  mode: MatchMode
): boolean {
  if (mode === MatchMode.NORMAL) return false;
  
  // En mort subite, seule une touche zone C met fin au match
  // (gérée par la saisie de score)
  // Ou une pénalité qui crée un écart
  return scoreA !== scoreB;
}
```

### 4.3 Interface Utilisateur

**Fichier** : `src/renderer/components/SuddenDeathOverlay.tsx` (NOUVEAU)

```typescript
// Overlay rouge/clignotant indiquant:
// - "⚔️ MORT SUBITE"
// - Chrono 30 secondes (si fin de temps)
// - "Zone C uniquement (5 pts)"
// - Boutons désactivés pour zones A et B
```

### 4.4 Tâches Sprint 4

| Tâche | Fichier | Effort | Priorité |
|-------|---------|--------|----------|
| Ajouter MatchMode | types/index.ts | 30min | P0 |
| Créer suddenDeath.ts | utils/suddenDeath.ts | 2h | P0 |
| Détection auto (2x 10 pts) | components/PoolView.tsx | 2h | P0 |
| Détection égalité fin temps | components/PoolView.tsx | 2h | P0 |
| Overlay mort subite | components/SuddenDeathOverlay.tsx | 4h | P0 |
| Chrono 30s supplémentaires | components/PoolView.tsx | 2h | P0 |
| Restriction zones A/B | components/TouchOptimizedReferee.tsx | 2h | P1 |
| Tirage au sort si égalité | components/PoolView.tsx | 1h | P1 |
| Tests unitaires | tests/suddenDeath.test.ts | 2h | P1 |

**Total estimé** : 17h30 (~2.5 jours)

---

## 🎯 SPRINT 5 : Chronomètre Temps Réel (1 semaine)

### 5.1 Spécifications FFE

- Durée : **3 minutes**
- Mode : **Temps réel SANS arrêt** (pas d'arrêt au "Cessez!")
- Arrêt autorisé : Uniquement sur décision arbitre (blessure, matériel)
- Fin : e-Arbitre annonce "Temps!"

### 5.2 Composant Chronomètre

**Fichier** : `src/renderer/components/MatchTimer.tsx` (NOUVEAU)

```typescript
interface MatchTimerProps {
  duration: number;           // 180 secondes (3 min)
  isRunning: boolean;
  onTimeUp: () => void;
  onPause?: () => void;       // Incident uniquement
  size: 'small' | 'large';    // Large pour tablette
}

// Affichage:
// - Grand format pour visibilité piste (120px font-size)
// - Couleur rouge dernière minute
// - Clignotement dernières 10 secondes
// - Son à la fin
```

### 5.3 Tâches Sprint 5

| Tâche | Fichier | Effort | Priorité |
|-------|---------|--------|----------|
| Créer MatchTimer.tsx | components/MatchTimer.tsx | 4h | P0 |
| Intégration PoolView | components/PoolView.tsx | 2h | P0 |
| Mode grande taille tablette | components/MatchTimer.tsx | 1h | P0 |
| Son fin de temps | components/MatchTimer.tsx | 1h | P1 |
| Bouton pause (incident) | components/MatchTimer.tsx | 1h | P1 |
| Persistance état chrono | database/index.ts | 1h | P1 |

**Total estimé** : 10h (~1.5 jours)

---

## 🎯 SPRINT 6 : Abandon vs Forfait (3 jours)

### 6.1 Règles FFE

| Formule | Abandon | Forfait |
|---------|---------|---------|
| **QUEST** | Score conservé | Score conservé pour tous |
| **ASL Compétition** | Score conservé | Points annulés en poule |

### 6.2 Logique

**Fichier** : `src/shared/utils/forfaitHandling.ts` (NOUVEAU)

```typescript
/**
 * Gestion des abandons et forfaits selon la formule
 */

export type CompetitionFormula = 'quest' | 'asl';

export function handleForfait(
  fencerId: string,
  pool: Pool,
  formula: CompetitionFormula
): Pool {
  if (formula === 'quest') {
    // Points conservés pour tout le monde
    return markFencerAsForfait(pool, fencerId);
  } else {
    // ASL: Annuler les points en poule
    return annulFencerPoints(pool, fencerId);
  }
}

export function handleAbandon(
  fencerId: string,
  pool: Pool
): Pool {
  // L'abandon conserve toujours les points acquis
  return markFencerAsAbandoned(pool, fencerId);
}
```

### 6.3 Tâches Sprint 6

| Tâche | Fichier | Effort | Priorité |
|-------|---------|--------|----------|
| Créer forfaitHandling.ts | utils/forfaitHandling.ts | 2h | P0 |
| Sélection formule compétition | components/NewCompetitionModal.tsx | 1h | P0 |
| Traitement différencié forfait | utils/poolCalculations.ts | 2h | P0 |
| UI distinction abandon/forfait | components/PoolView.tsx | 1h | P1 |
| Tests unitaires | tests/forfaitHandling.test.ts | 1h | P1 |

**Total estimé** : 7h (~1 jour)

---

## 📅 Planning Récapitulatif

```
Février 2026                                    Mars 2026
├─────────────────────────────────────────────────────────────────
│ Semaine 1-2     │ Semaine 3     │ Semaine 4     │ Semaine 5-6   
│                 │               │               │               
│ SPRINT 1        │ SPRINT 2      │ SPRINT 3      │ SPRINT 4      
│ Cartons (J/R/N) │ Sortie arène  │ Cibles 1/3/5  │ Mort Subite   
│ 15h             │ 5h30          │ 9h30          │ 17h30         
├─────────────────────────────────────────────────────────────────
│ Semaine 7       │ Semaine 8     │
│                 │               │
│ SPRINT 5        │ SPRINT 6      │
│ Chronomètre     │ Abandon/Forf. │
│ 10h             │ 7h            │
```

**Total global** : ~64h (~8 jours de développement)

---

## ✅ Checklist de Validation

### Avant Mise en Production

- [ ] Tests avec arbitres FFE
- [ ] Validation règlement 2025-2026
- [ ] Tests sur tablette (tactile)
- [ ] Tests mode hors-ligne
- [ ] Documentation utilisateur
- [ ] Formation clubs pilotes

### Critères d'Acceptation par Sprint

**Sprint 1 (Cartons)** :
- [ ] Carton jaune visible dans grille
- [ ] Carton rouge ajoute 1 pt adversaire
- [ ] Carton noir exclut le tireur
- [ ] Escalade automatique groupe 1

**Sprint 2 (Sortie)** :
- [ ] Bouton sortie ajoute 3 pts
- [ ] Option sortie volontaire + carton rouge

**Sprint 3 (Cibles)** :
- [ ] 3 boutons par tireur (1/3/5)
- [ ] Taille minimum 80px
- [ ] Score cumule correctement

**Sprint 4 (Mort Subite)** :
- [ ] Détection automatique 2x 10 pts
- [ ] Overlay visuel clair
- [ ] Seule zone C active
- [ ] Chrono 30s si égalité fin temps

**Sprint 5 (Chronomètre)** :
- [ ] 3 minutes sans arrêt
- [ ] Grande taille lisible
- [ ] Alerte sonore fin

**Sprint 6 (Forfait)** :
- [ ] Sélection formule Quest/ASL
- [ ] Points annulés si ASL + forfait
- [ ] Points conservés si Quest

---

## 📚 Références

- [Règlement FFE Sabre Laser 2025-2026](https://www.ffescrime.fr/wp-content/uploads/2024/09/Livret2_CombatSportif_v.Sept25-FR.pdf)
- [PRD BellePoule Modern](./PRD.md)
- [Architecture Technique](./ARCHITECTURE.md)

---

*Document créé le 19 février 2026*  
*BellePoule Modern - Open Source sous licence GPL-3.0*
