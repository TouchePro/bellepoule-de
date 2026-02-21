# 🗺️ ROADMAP COMPLÈTE - Sabre Laser (ASL-FFE)
# BellePoule Modern

**Version** : 2.1  
**Date** : 21 février 2026  
**Basé sur** : Règlement FFE Saison 2025-2026 (Livret 2)  
**État du code** : Commit 135c25b (branche dev)

---

## 📊 ANALYSE DU CODE EXISTANT

> **Dernière mise à jour** : 21 février 2026 (commit 135c25b)

### ✅ Fonctionnalités Implémentées

#### Système de Saisie Distante
| Composant | Fichier | Statut | Description |
|-----------|---------|--------|-------------|
| Serveur WebSocket | `remoteScoreServer.ts` | ✅ | Express + Socket.IO sur port 8066 |
| Gestionnaire distant | `RemoteScoreManager.tsx` | ✅ | Interface de contrôle central |
| Interface tablette | `TouchOptimizedReferee.tsx` | ✅ | Boutons +1/-1, swipe, voix |
| Interface arbitre web | `referee.html` | ✅ | **Page HTML avec boutons zones A/B/C** |
| Affichage public | `arena.html` | ✅ | Affichage score en direct |
| Gestion arènes | `remoteScoreServer.ts` | ✅ | Multi-arènes (jusqu'à 20) |

#### Système Quest
| Composant | Fichier | Statut |
|-----------|---------|--------|
| Points Quest (1-4) | `poolCalculations.ts` | ✅ |
| Stats V1/V2/V3/V4 | `poolCalculations.ts` | ✅ |
| Classement Quest | `poolCalculations.ts` | ✅ |

#### Système de Cartons (NOUVEAU ✅)
| Composant | Fichier | Statut |
|-----------|---------|--------|
| Types CardGroup, CardReason | `types/index.ts` | ✅ |
| Escalade FFE (G1→G4) | `cardSystem.ts` | ✅ |
| CardType (YELLOW/RED/BLACK) | `penalty.types.ts` | ✅ |
| Labels français | `cardSystem.ts` | ✅ |
| Exclusion carton noir | `cardSystem.ts` | ✅ |

#### Système de Zones/Touches (NOUVEAU ✅)
| Composant | Fichier | Statut |
|-----------|---------|--------|
| Types TargetZone, Touch | `types/index.ts` | ✅ |
| ZONE_POINTS (1/3/5) | `types/index.ts` | ✅ |
| touchSystem.ts | `utils/touchSystem.ts` | ✅ |
| Interface zones A/B/C | `referee.html` | ✅ |

#### Système Mort Subite (NOUVEAU ✅)
| Composant | Fichier | Statut |
|-----------|---------|--------|
| Type MatchMode | `types/index.ts` | ✅ |
| Détection challenger (10pts) | `suddenDeath.ts` | ✅ |
| Détection timeout | `suddenDeath.ts` | ✅ |
| Validation touche zone C | `suddenDeath.ts` | ✅ |
| Tirage au sort | `suddenDeath.ts` | ✅ |

#### Sortie d'Arène (NOUVEAU ✅)
| Composant | Fichier | Statut |
|-----------|---------|--------|
| Modal sortie | `referee.html` | ✅ |
| Sortie normale (+3 pts) | `referee.html` | ✅ |
| Sortie volontaire (+3 + carton) | `referee.html` | ✅ |

### 🔜 Fonctionnalités Restantes

| Fonctionnalité | Priorité | Impact |
|----------------|----------|--------|
| **Mode hors-ligne tablette** | 🟠 Haute | Fiabilité réseau |
| **Dashboard classement live** | 🟡 Moyenne | UX spectateurs |
| **Formule ASL Compétition** | 🟡 Basse | Alternative à Quest |
| **Tests unitaires complets** | 🟡 Moyenne | Qualité code |

---

## 🏗️ ARCHITECTURE CIBLE

### Vue d'Ensemble

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PC CENTRAL (Electron)                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐          │
│  │ CompetitionView │  │ RemoteScore     │  │ Database        │          │
│  │ PoolView        │  │ Manager         │  │ (SQLite)        │          │
│  │ TableauView     │  │                 │  │                 │          │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘          │
│           │                    │                    │                    │
│           └────────────────────┼────────────────────┘                    │
│                                │                                         │
│  ┌─────────────────────────────▼─────────────────────────────────────┐  │
│  │              RemoteScoreServer (Express + Socket.IO)              │  │
│  │                         Port 8066                                  │  │
│  └─────────────────────────────┬─────────────────────────────────────┘  │
└────────────────────────────────┼────────────────────────────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
          ┌─────────▼────┐ ┌─────▼─────┐ ┌────▼──────┐
          │   TABLETTE   │ │  TABLETTE │ │ AFFICHAGE │
          │   ARBITRE    │ │  ARBITRE  │ │  PUBLIC   │
          │   Arène 1    │ │  Arène 2  │ │  (TV/PC)  │
          │              │ │           │ │           │
          │ referee.html │ │referee.html│ │ arena.html│
          └──────────────┘ └───────────┘ └───────────┘
```

### Flux de Données Temps Réel

```
┌──────────────┐     WebSocket      ┌──────────────┐     WebSocket      ┌──────────────┐
│   ARBITRE    │ ─────────────────▶ │   SERVEUR    │ ─────────────────▶ │  AFFICHAGE   │
│  (Tablette)  │                    │   CENTRAL    │                    │   PUBLIC     │
│              │ ◀───────────────── │              │ ◀───────────────── │              │
│ - Score +1/3/5                    │ - Validation │                    │ - Score live │
│ - Cartons    │                    │ - Stockage   │                    │ - Timer      │
│ - Chrono     │                    │ - Broadcast  │                    │ - Cartons    │
│ - Sortie     │                    │ - Règles     │                    │ - Classement │
└──────────────┘                    └──────────────┘                    └──────────────┘
```

---

## 🎯 SPRINT 1 : Système de Cartons Complet (2 semaines)

### 1.1 Objectif
Implémenter le système de cartons conforme au règlement FFE avec :
- Escalade automatique (Groupe 1: J→R→R→Noir)
- Attribution de points (+1 pt sur rouge)
- Exclusion sur carton noir
- Historique par combattant

### 1.2 Modèle de Données

**Fichier** : `src/shared/types/index.ts`

```typescript
// === AJOUTS ===

export enum CardType {
  WHITE = 'white',     // Matériel non conforme (avant contrôle)
  YELLOW = 'yellow',   // Avertissement
  RED = 'red',         // +1 pt adversaire
  BLACK = 'black',     // Exclusion immédiate
}

export enum CardGroup {
  GROUP_1 = 1,  // J → R → R → Exclusion
  GROUP_2 = 2,  // R → R → Exclusion
  GROUP_3 = 3,  // R → Exclusion
  GROUP_4 = 4,  // Noir immédiat
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
  NON_COMPLIANT_GEAR = 'gear',           // Matériel non conforme (après avert.)
  
  // Groupe 2 - Rouge direct
  ESTOC = 'estoc',                       // Coup de pointe (interdit)
  UNARMED_HAND = 'unarmed_hand',         // Usage main/bras non armé
  VOLUNTARY_EXIT = 'voluntary_exit',     // Sortie volontaire d'arène
  HEAVY_HIT = 'heavy_hit',               // Frappe lourde
  
  // Groupe 3 - Rouge puis Exclusion
  BRUTALITY = 'brutality',               // Brutalité volontaire
  DANGEROUS = 'dangerous',               // Comportement dangereux répété
  
  // Groupe 4 - Noir immédiat
  REFUSAL = 'refusal',                   // Refus de combattre
  UNSPORTSMANLIKE = 'unsportsmanlike',   // Anti-sportif grave
  CHEATING = 'cheating',                 // Tricherie avérée
}

export interface Card {
  id: string;
  matchId: string;
  fencerId: string;
  type: CardType;
  reason: CardReason;
  group: CardGroup;
  timestamp: Date;
  pointsAwarded: number;      // 0 pour jaune, 1 pour rouge
  resultingExclusion: boolean; // true si exclusion suite au carton
}

// Modifier Match
export interface Match extends BaseEntity {
  // ... existant ...
  cards: Card[];              // Cartons du match
}

// Modifier Fencer
export interface Fencer extends BaseEntity {
  // ... existant ...
  competitionCards: Card[];   // Historique cartons compétition
  isExcluded: boolean;        // Exclu de la compétition
}
```

### 1.3 Logique des Cartons

**Fichier** : `src/shared/utils/cardSystem.ts` (NOUVEAU)

```typescript
/**
 * BellePoule Modern - Card System (FFE Sabre Laser)
 * Gestion des cartons selon le règlement 2025-2026
 */

import { Card, CardType, CardGroup, CardReason, Fencer, Match } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Mapping raison → groupe
const REASON_TO_GROUP: Record<CardReason, CardGroup> = {
  // Groupe 1
  [CardReason.EARLY_START]: CardGroup.GROUP_1,
  [CardReason.LATE_STOP]: CardGroup.GROUP_1,
  [CardReason.BODY_CONTACT]: CardGroup.GROUP_1,
  [CardReason.COUNTER_ATTACK]: CardGroup.GROUP_1,
  [CardReason.TARGET_SUBSTITUTION]: CardGroup.GROUP_1,
  [CardReason.VOLUNTARY_DROP]: CardGroup.GROUP_1,
  [CardReason.TIME_WASTING]: CardGroup.GROUP_1,
  [CardReason.NON_COMPLIANT_GEAR]: CardGroup.GROUP_1,
  
  // Groupe 2
  [CardReason.ESTOC]: CardGroup.GROUP_2,
  [CardReason.UNARMED_HAND]: CardGroup.GROUP_2,
  [CardReason.VOLUNTARY_EXIT]: CardGroup.GROUP_2,
  [CardReason.HEAVY_HIT]: CardGroup.GROUP_2,
  
  // Groupe 3
  [CardReason.BRUTALITY]: CardGroup.GROUP_3,
  [CardReason.DANGEROUS]: CardGroup.GROUP_3,
  
  // Groupe 4
  [CardReason.REFUSAL]: CardGroup.GROUP_4,
  [CardReason.UNSPORTSMANLIKE]: CardGroup.GROUP_4,
  [CardReason.CHEATING]: CardGroup.GROUP_4,
};

// Labels français
export const CARD_REASON_LABELS: Record<CardReason, string> = {
  [CardReason.EARLY_START]: 'Départ anticipé',
  [CardReason.LATE_STOP]: 'Continue après "Cessez!"',
  [CardReason.BODY_CONTACT]: 'Corps à corps volontaire',
  [CardReason.COUNTER_ATTACK]: 'Contre-attaque',
  [CardReason.TARGET_SUBSTITUTION]: 'Substitution de cible',
  [CardReason.VOLUNTARY_DROP]: 'Lâcher de sabre volontaire',
  [CardReason.TIME_WASTING]: 'Perte de temps',
  [CardReason.NON_COMPLIANT_GEAR]: 'Matériel non conforme',
  [CardReason.ESTOC]: 'Coup de pointe (estoc)',
  [CardReason.UNARMED_HAND]: 'Usage main non armée',
  [CardReason.VOLUNTARY_EXIT]: 'Sortie volontaire',
  [CardReason.HEAVY_HIT]: 'Frappe lourde',
  [CardReason.BRUTALITY]: 'Brutalité',
  [CardReason.DANGEROUS]: 'Comportement dangereux',
  [CardReason.REFUSAL]: 'Refus de combattre',
  [CardReason.UNSPORTSMANLIKE]: 'Anti-sportif',
  [CardReason.CHEATING]: 'Tricherie',
};

/**
 * Détermine le type de carton selon le groupe et l'historique
 */
export function determineCardType(
  reason: CardReason,
  previousCards: Card[]
): { type: CardType; shouldExclude: boolean; points: number } {
  const group = REASON_TO_GROUP[reason];
  
  // Compter les cartons du même groupe
  const sameGroupCards = previousCards.filter(c => c.group === group);
  const count = sameGroupCards.length;
  
  switch (group) {
    case CardGroup.GROUP_1:
      // 1ère: Jaune, 2ème: Rouge, 3ème: Rouge, 4ème+: Exclusion
      if (count === 0) return { type: CardType.YELLOW, shouldExclude: false, points: 0 };
      if (count <= 2) return { type: CardType.RED, shouldExclude: false, points: 1 };
      return { type: CardType.BLACK, shouldExclude: true, points: 0 };
      
    case CardGroup.GROUP_2:
      // 1ère: Rouge, 2ème: Rouge, 3ème+: Exclusion
      if (count <= 1) return { type: CardType.RED, shouldExclude: false, points: 1 };
      return { type: CardType.BLACK, shouldExclude: true, points: 0 };
      
    case CardGroup.GROUP_3:
      // 1ère: Rouge, 2ème+: Exclusion
      if (count === 0) return { type: CardType.RED, shouldExclude: false, points: 1 };
      return { type: CardType.BLACK, shouldExclude: true, points: 0 };
      
    case CardGroup.GROUP_4:
      // Toujours noir
      return { type: CardType.BLACK, shouldExclude: true, points: 0 };
      
    default:
      return { type: CardType.YELLOW, shouldExclude: false, points: 0 };
  }
}

/**
 * Crée un carton avec toutes les informations
 */
export function createCard(
  matchId: string,
  fencerId: string,
  reason: CardReason,
  previousCards: Card[]
): Card {
  const { type, shouldExclude, points } = determineCardType(reason, previousCards);
  
  return {
    id: uuidv4(),
    matchId,
    fencerId,
    type,
    reason,
    group: REASON_TO_GROUP[reason],
    timestamp: new Date(),
    pointsAwarded: points,
    resultingExclusion: shouldExclude,
  };
}

/**
 * Groupe les raisons par groupe pour l'UI
 */
export function getReasonsByGroup(): Record<CardGroup, CardReason[]> {
  const grouped: Record<CardGroup, CardReason[]> = {
    [CardGroup.GROUP_1]: [],
    [CardGroup.GROUP_2]: [],
    [CardGroup.GROUP_3]: [],
    [CardGroup.GROUP_4]: [],
  };
  
  for (const [reason, group] of Object.entries(REASON_TO_GROUP)) {
    grouped[group as CardGroup].push(reason as CardReason);
  }
  
  return grouped;
}
```

### 1.4 Interface Utilisateur - Modal Carton

**Fichier** : `src/renderer/components/CardModal.tsx` (NOUVEAU)

```typescript
/**
 * Modal de saisie de carton
 * Affiche les raisons groupées et le type de carton résultant
 */

import React, { useState, useMemo } from 'react';
import { CardReason, CardGroup, Card, Fencer } from '../../shared/types';
import { 
  determineCardType, 
  getReasonsByGroup, 
  CARD_REASON_LABELS 
} from '../../shared/utils/cardSystem';

interface CardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: CardReason) => void;
  fencer: Fencer;
  previousCards: Card[];
  opponentName: string;
}

const GROUP_LABELS: Record<CardGroup, string> = {
  [CardGroup.GROUP_1]: 'Groupe 1 (Jaune → Rouge)',
  [CardGroup.GROUP_2]: 'Groupe 2 (Rouge direct)',
  [CardGroup.GROUP_3]: 'Groupe 3 (Rouge → Exclusion)',
  [CardGroup.GROUP_4]: 'Groupe 4 (Exclusion immédiate)',
};

export const CardModal: React.FC<CardModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  fencer,
  previousCards,
  opponentName,
}) => {
  const [selectedReason, setSelectedReason] = useState<CardReason | null>(null);
  
  const reasonsByGroup = useMemo(() => getReasonsByGroup(), []);
  
  const preview = useMemo(() => {
    if (!selectedReason) return null;
    return determineCardType(selectedReason, previousCards);
  }, [selectedReason, previousCards]);
  
  if (!isOpen) return null;
  
  const handleConfirm = () => {
    if (selectedReason) {
      onConfirm(selectedReason);
      setSelectedReason(null);
      onClose();
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">
          Carton pour {fencer.lastName} {fencer.firstName}
        </h2>
        
        {/* Historique des cartons */}
        {previousCards.length > 0 && (
          <div className="mb-4 p-3 bg-gray-100 rounded">
            <p className="text-sm font-medium">Cartons précédents :</p>
            <div className="flex gap-2 mt-1">
              {previousCards.map(card => (
                <span
                  key={card.id}
                  className={`px-2 py-1 rounded text-xs font-bold ${
                    card.type === 'yellow' ? 'bg-yellow-400' :
                    card.type === 'red' ? 'bg-red-500 text-white' :
                    'bg-black text-white'
                  }`}
                >
                  {card.type === 'yellow' ? 'J' : card.type === 'red' ? 'R' : 'N'}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* Sélection de la raison */}
        <div className="space-y-4">
          {Object.entries(reasonsByGroup).map(([group, reasons]) => (
            <div key={group}>
              <h3 className="font-semibold text-sm text-gray-600 mb-2">
                {GROUP_LABELS[group as unknown as CardGroup]}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {reasons.map(reason => (
                  <button
                    key={reason}
                    onClick={() => setSelectedReason(reason)}
                    className={`p-2 text-left rounded border text-sm ${
                      selectedReason === reason
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {CARD_REASON_LABELS[reason]}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        {/* Preview du carton */}
        {preview && (
          <div className={`mt-4 p-4 rounded-lg ${
            preview.type === 'yellow' ? 'bg-yellow-100 border-yellow-400' :
            preview.type === 'red' ? 'bg-red-100 border-red-400' :
            'bg-black text-white'
          } border-2`}>
            <p className="font-bold text-lg">
              {preview.type === 'yellow' ? '🟨 CARTON JAUNE' :
               preview.type === 'red' ? '🟥 CARTON ROUGE' :
               '⬛ CARTON NOIR'}
            </p>
            {preview.points > 0 && (
              <p className="text-sm mt-1">
                +{preview.points} point pour {opponentName}
              </p>
            )}
            {preview.shouldExclude && (
              <p className="text-sm mt-1 font-bold">
                ⚠️ EXCLUSION DE LA COMPÉTITION
              </p>
            )}
          </div>
        )}
        
        {/* Boutons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border rounded hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedReason}
            className={`flex-1 px-4 py-2 rounded text-white ${
              preview?.type === 'yellow' ? 'bg-yellow-500 hover:bg-yellow-600' :
              preview?.type === 'red' ? 'bg-red-500 hover:bg-red-600' :
              preview?.type === 'black' ? 'bg-black hover:bg-gray-800' :
              'bg-gray-300'
            } disabled:opacity-50`}
          >
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
};
```

### 1.5 Mise à jour Interface Arbitre Web

**Fichier** : `src/remote/referee.html` (MODIFIER)

Ajouter après les boutons de carton existants :

```html
<!-- Modal de sélection de raison de carton -->
<div id="card-modal" class="modal" style="display: none;">
  <div class="modal-content">
    <h3>Raison du carton pour <span id="card-fencer-name"></span></h3>
    
    <div class="card-groups">
      <!-- Groupe 1 -->
      <div class="card-group">
        <h4>Groupe 1 (Jaune → Rouge)</h4>
        <button onclick="selectCardReason('early_start')">Départ anticipé</button>
        <button onclick="selectCardReason('late_stop')">Continue après Cessez</button>
        <button onclick="selectCardReason('body_contact')">Corps à corps</button>
        <button onclick="selectCardReason('counter_attack')">Contre-attaque</button>
        <!-- ... autres -->
      </div>
      
      <!-- Groupe 2 -->
      <div class="card-group">
        <h4>Groupe 2 (Rouge direct)</h4>
        <button onclick="selectCardReason('estoc')">Estoc</button>
        <button onclick="selectCardReason('voluntary_exit')">Sortie volontaire</button>
        <!-- ... -->
      </div>
      
      <!-- Groupe 4 -->
      <div class="card-group danger">
        <h4>Groupe 4 (Exclusion immédiate)</h4>
        <button onclick="selectCardReason('refusal')">Refus de combattre</button>
        <button onclick="selectCardReason('cheating')">Tricherie</button>
      </div>
    </div>
    
    <div id="card-preview"></div>
    
    <div class="modal-buttons">
      <button onclick="closeCardModal()">Annuler</button>
      <button id="confirm-card-btn" onclick="confirmCard()">Confirmer</button>
    </div>
  </div>
</div>
```

### 1.6 Tâches Sprint 1

| # | Tâche | Fichier | Effort | Dépendance |
|---|-------|---------|--------|------------|
| 1.1 | Types Card/CardType/CardReason | types/index.ts | 1h | - |
| 1.2 | Logique cardSystem.ts | utils/cardSystem.ts | 3h | 1.1 |
| 1.3 | CardModal.tsx (React) | components/CardModal.tsx | 4h | 1.1, 1.2 |
| 1.4 | Intégration PoolView | components/PoolView.tsx | 2h | 1.3 |
| 1.5 | Modal carton referee.html | remote/referee.html | 3h | 1.2 |
| 1.6 | WebSocket events cartons | remoteScoreServer.ts | 2h | 1.5 |
| 1.7 | Affichage cartons arena.html | remote/arena.html | 2h | 1.6 |
| 1.8 | Persistance DB cartons | database/index.ts | 2h | 1.1 |
| 1.9 | Tests unitaires | tests/cardSystem.test.ts | 3h | 1.2 |
| 1.10 | Tests intégration | tests/cardIntegration.test.ts | 2h | 1.8 |

**Total Sprint 1** : ~24h (3 jours)

---

## 🎯 SPRINT 2 : Sortie d'Arène et Pénalités (1 semaine)

### 2.1 Objectif
- Sortie standard : +3 pts adversaire
- Sortie volontaire : +3 pts + Carton Rouge
- Distinction dans l'interface

### 2.2 Modèle de Données

**Fichier** : `src/shared/types/index.ts`

```typescript
export enum PenaltyType {
  ARENA_EXIT = 'arena_exit',           // Sortie normale (+3 pts)
  ARENA_EXIT_VOLUNTARY = 'arena_exit_voluntary', // Sortie volontaire (+3 pts + carton)
}

export interface Penalty {
  id: string;
  matchId: string;
  fencerId: string;
  type: PenaltyType;
  pointsAwarded: number;
  timestamp: Date;
  associatedCardId?: string;  // ID du carton rouge si sortie volontaire
}

// Ajouter à Match
export interface Match extends BaseEntity {
  // ... existant ...
  penalties: Penalty[];
}
```

### 2.3 Interface Utilisateur

**Fichier** : `src/remote/referee.html` (MODIFIER)

```html
<!-- Bouton Sortie d'Arène -->
<div class="penalty-controls">
  <button class="penalty-btn" onclick="showExitModal('A')">
    🚪 Sortie Rouge
  </button>
  <button class="penalty-btn" onclick="showExitModal('B')">
    🚪 Sortie Vert
  </button>
</div>

<!-- Modal de sortie -->
<div id="exit-modal" class="modal" style="display: none;">
  <div class="modal-content">
    <h3>Sortie d'arène - <span id="exit-fencer-name"></span></h3>
    
    <div class="exit-options">
      <button class="exit-btn normal" onclick="confirmExit(false)">
        🚪 Sortie normale<br>
        <span class="points">+3 pts adversaire</span>
      </button>
      
      <button class="exit-btn voluntary" onclick="confirmExit(true)">
        🚪 Sortie volontaire<br>
        <span class="points">+3 pts + Carton Rouge (+1 pt)</span>
        <span class="total">= +4 pts adversaire</span>
      </button>
    </div>
    
    <button onclick="closeExitModal()">Annuler</button>
  </div>
</div>
```

### 2.4 Tâches Sprint 2

| # | Tâche | Fichier | Effort |
|---|-------|---------|--------|
| 2.1 | Type Penalty | types/index.ts | 30min |
| 2.2 | Logique pénalités | utils/penaltySystem.ts | 1h |
| 2.3 | Modal sortie referee.html | remote/referee.html | 2h |
| 2.4 | WebSocket events | remoteScoreServer.ts | 1h |
| 2.5 | Affichage arena.html | remote/arena.html | 1h |
| 2.6 | Intégration PoolView | components/PoolView.tsx | 1h |
| 2.7 | Tests | tests/penaltySystem.test.ts | 1h |

**Total Sprint 2** : ~8h (1 jour)

---

## 🎯 SPRINT 3 : Saisie par Zone/Cible (1 semaine)

### 3.1 Objectif
Interface optimisée tablette avec 3 boutons par tireur :
- Zone A (1 pt) : Mains, poignets, arme
- Zone B (3 pts) : Bras, jambes
- Zone C (5 pts) : Tête, tronc

### 3.2 Interface Arbitre Optimisée

**Fichier** : `src/remote/referee.html` (REFONTE)

```html
<!-- Interface principale de score -->
<div class="score-interface">
  <!-- Tireur Rouge -->
  <div class="fencer-panel red">
    <div class="fencer-header">
      <span class="fencer-name" id="fencer-a-name">DUPONT</span>
      <span class="fencer-score" id="fencer-a-score">0</span>
    </div>
    
    <div class="touch-buttons">
      <button class="touch-btn zone-a" onclick="addTouch('A', 1)">
        <span class="zone-label">A</span>
        <span class="zone-points">+1</span>
        <span class="zone-desc">Main/Arme</span>
      </button>
      
      <button class="touch-btn zone-b" onclick="addTouch('A', 3)">
        <span class="zone-label">B</span>
        <span class="zone-points">+3</span>
        <span class="zone-desc">Membre</span>
      </button>
      
      <button class="touch-btn zone-c" onclick="addTouch('A', 5)">
        <span class="zone-label">C</span>
        <span class="zone-points">+5</span>
        <span class="zone-desc">Tête/Tronc</span>
      </button>
    </div>
    
    <div class="quick-actions">
      <button class="action-btn" onclick="undoTouch('A')">↩️ Annuler</button>
      <button class="action-btn card" onclick="showCardModal('A')">🟨🟥 Carton</button>
      <button class="action-btn exit" onclick="showExitModal('A')">🚪 Sortie</button>
    </div>
  </div>
  
  <!-- Timer Central -->
  <div class="timer-panel">
    <div class="timer-display" id="timer">03:00</div>
    <div class="timer-controls">
      <button id="timer-toggle" onclick="toggleTimer()">▶️</button>
      <button onclick="resetTimer()">🔄</button>
    </div>
  </div>
  
  <!-- Tireur Vert (miroir) -->
  <div class="fencer-panel green">
    <!-- Même structure -->
  </div>
</div>

<style>
/* Boutons zone optimisés tactile */
.touch-btn {
  width: 100%;
  min-height: 100px;
  font-size: 24px;
  font-weight: bold;
  border: none;
  border-radius: 12px;
  margin: 8px 0;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: transform 0.1s;
}

.touch-btn:active {
  transform: scale(0.95);
}

.zone-a { background: #60a5fa; color: white; }  /* Bleu */
.zone-b { background: #a78bfa; color: white; }  /* Violet */
.zone-c { background: #f472b6; color: white; }  /* Rose */

.zone-label { font-size: 32px; }
.zone-points { font-size: 28px; }
.zone-desc { font-size: 14px; opacity: 0.8; }

/* Responsive tablette */
@media (min-width: 768px) {
  .touch-btn {
    min-height: 150px;
    font-size: 32px;
  }
  .zone-label { font-size: 48px; }
  .zone-points { font-size: 36px; }
}
</style>
```

### 3.3 Composant React TouchOptimizedReferee

**Fichier** : `src/renderer/components/TouchOptimizedReferee.tsx` (REFONTE)

```typescript
// Ajouter les boutons par zone
const ZONES = [
  { zone: 'A', points: 1, label: 'Main/Arme', color: 'bg-blue-400' },
  { zone: 'B', points: 3, label: 'Membre', color: 'bg-purple-400' },
  { zone: 'C', points: 5, label: 'Tête/Tronc', color: 'bg-pink-400' },
];

// Dans le render
{ZONES.map(({ zone, points, label, color }) => (
  <button
    key={zone}
    onClick={() => handleScoreIncrement(fencer, points)}
    className={`${color} w-full min-h-[100px] md:min-h-[150px] 
                text-white font-bold rounded-xl flex flex-col 
                items-center justify-center active:scale-95 transition-transform`}
  >
    <span className="text-3xl md:text-5xl">{zone}</span>
    <span className="text-2xl md:text-4xl">+{points}</span>
    <span className="text-sm md:text-lg opacity-80">{label}</span>
  </button>
))}
```

### 3.4 Tâches Sprint 3

| # | Tâche | Fichier | Effort |
|---|-------|---------|--------|
| 3.1 | Types Touch/TargetZone | types/index.ts | 30min |
| 3.2 | Refonte referee.html | remote/referee.html | 4h |
| 3.3 | CSS tactile responsive | remote/styles.css | 2h |
| 3.4 | Refonte TouchOptimizedReferee | components/TouchOptimizedReferee.tsx | 3h |
| 3.5 | Historique touches | utils/touchHistory.ts | 1h |
| 3.6 | Annulation dernière touche | remote/referee.html | 1h |
| 3.7 | Tests | tests/touchSystem.test.ts | 1h |

**Total Sprint 3** : ~12h (1.5 jours)

---

## 🎯 SPRINT 4 : Mort Subite (2 semaines)

### 4.1 Règles FFE

1. **Cas Challenger** : Quand les 2 tireurs atteignent 10 pts
   - Seule zone C (5 pts) met fin au match
   - Zones A et B conservent la priorité mais ne comptent pas
   
2. **Cas Égalité** : Fin du temps avec score égal
   - 30 secondes supplémentaires
   - Seule zone C ou pénalité met fin
   - Si toujours égalité → Tirage au sort

### 4.2 Modèle de Données

```typescript
export enum MatchMode {
  NORMAL = 'normal',
  SUDDEN_DEATH_CHALLENGER = 'sudden_death_challenger',
  SUDDEN_DEATH_TIMEOUT = 'sudden_death_timeout',
}

export interface Match extends BaseEntity {
  // ... existant ...
  mode: MatchMode;
  suddenDeathStartTime?: Date;
}
```

### 4.3 Logique Mort Subite

**Fichier** : `src/shared/utils/suddenDeath.ts` (NOUVEAU)

```typescript
/**
 * Gestion de la mort subite FFE Sabre Laser
 */

import { Match, MatchMode, TargetZone } from '../types';

const CHALLENGER_THRESHOLD = 10;
const SUDDEN_DEATH_DURATION = 30; // secondes

/**
 * Vérifie si la mort subite challenger doit être déclenchée
 */
export function checkChallengerSuddenDeath(scoreA: number, scoreB: number): boolean {
  return scoreA >= CHALLENGER_THRESHOLD && scoreB >= CHALLENGER_THRESHOLD;
}

/**
 * Vérifie si c'est une touche valide en mort subite
 */
export function isValidSuddenDeathTouch(zone: TargetZone): boolean {
  return zone === TargetZone.ZONE_C; // Seule zone C compte
}

/**
 * Détermine si le match doit se terminer
 */
export function shouldEndMatch(
  match: Match,
  scoreA: number,
  scoreB: number,
  lastTouchZone?: TargetZone
): boolean {
  if (match.mode === MatchMode.NORMAL) {
    return scoreA >= 15 || scoreB >= 15;
  }
  
  // En mort subite, seule zone C met fin
  if (lastTouchZone === TargetZone.ZONE_C) {
    return scoreA !== scoreB; // Un écart existe
  }
  
  return false;
}

/**
 * Gère le tirage au sort
 */
export function drawWinner(): 'A' | 'B' {
  return Math.random() < 0.5 ? 'A' : 'B';
}
```

### 4.4 Interface Mort Subite

**Fichier** : `src/remote/referee.html` (AJOUTER)

```html
<!-- Overlay Mort Subite -->
<div id="sudden-death-overlay" class="sudden-death-overlay" style="display: none;">
  <div class="sudden-death-content">
    <h2>⚔️ MORT SUBITE</h2>
    <p id="sudden-death-reason">Les deux combattants ont atteint 10 points</p>
    
    <div class="sudden-death-rules">
      <p>✅ Seule la <strong>ZONE C</strong> (Tête/Tronc) compte</p>
      <p>⚠️ Les autres zones maintiennent la priorité mais ne marquent pas</p>
    </div>
    
    <div id="sudden-death-timer" class="sudden-death-timer" style="display: none;">
      <span id="sd-timer">00:30</span>
    </div>
    
    <!-- Boutons Zone C uniquement en mode mort subite -->
    <div class="sudden-death-buttons">
      <button class="sd-touch-btn red" onclick="addSuddenDeathTouch('A')">
        ZONE C<br>ROUGE<br>+5
      </button>
      <button class="sd-touch-btn green" onclick="addSuddenDeathTouch('B')">
        ZONE C<br>VERT<br>+5
      </button>
    </div>
    
    <button id="draw-btn" style="display: none;" onclick="performDraw()">
      🎲 Tirage au Sort
    </button>
  </div>
</div>

<style>
.sudden-death-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(220, 38, 38, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: pulse-bg 2s infinite;
}

@keyframes pulse-bg {
  0%, 100% { background: rgba(220, 38, 38, 0.95); }
  50% { background: rgba(185, 28, 28, 0.95); }
}

.sudden-death-content {
  text-align: center;
  color: white;
  padding: 2rem;
}

.sudden-death-content h2 {
  font-size: 3rem;
  margin-bottom: 1rem;
  animation: pulse-text 1s infinite;
}

.sd-touch-btn {
  width: 150px;
  height: 150px;
  font-size: 1.5rem;
  font-weight: bold;
  border: 4px solid white;
  border-radius: 1rem;
  margin: 1rem;
  cursor: pointer;
}

.sd-touch-btn.red { background: #dc2626; color: white; }
.sd-touch-btn.green { background: #16a34a; color: white; }
</style>
```

### 4.5 Tâches Sprint 4

| # | Tâche | Fichier | Effort |
|---|-------|---------|--------|
| 4.1 | Type MatchMode | types/index.ts | 30min |
| 4.2 | Logique suddenDeath.ts | utils/suddenDeath.ts | 3h |
| 4.3 | Détection auto (2x 10 pts) | remote/referee.html | 2h |
| 4.4 | Overlay mort subite | remote/referee.html | 3h |
| 4.5 | CSS animations | remote/styles.css | 1h |
| 4.6 | Chrono 30s supplémentaires | remote/referee.html | 2h |
| 4.7 | Tirage au sort | remote/referee.html | 1h |
| 4.8 | Sync avec affichage | remote/arena.html | 2h |
| 4.9 | WebSocket events | remoteScoreServer.ts | 2h |
| 4.10 | Intégration PoolView | components/PoolView.tsx | 2h |
| 4.11 | Tests | tests/suddenDeath.test.ts | 2h |

**Total Sprint 4** : ~21h (2.5 jours)

---

## 🎯 SPRINT 5 : Chronomètre Temps Réel (1 semaine)

### 5.1 Spécifications FFE

- **Durée** : 3 minutes (180s)
- **Mode** : Temps réel SANS arrêt au "Cessez!"
- **Arrêt** : Uniquement sur décision arbitre (blessure, matériel)
- **Synchronisation** : Tablette ↔ Affichage public

### 5.2 Composant Chronomètre

**Fichier** : `src/renderer/components/MatchTimer.tsx` (NOUVEAU)

```typescript
import React, { useState, useEffect, useRef, useCallback } from 'react';

interface MatchTimerProps {
  duration: number;           // 180s par défaut
  isRunning: boolean;
  isPaused: boolean;
  onTimeUp: () => void;
  onTick?: (remaining: number) => void;
  size?: 'small' | 'large';
  showControls?: boolean;
  onPause?: () => void;
  onResume?: () => void;
}

export const MatchTimer: React.FC<MatchTimerProps> = ({
  duration = 180,
  isRunning,
  isPaused,
  onTimeUp,
  onTick,
  size = 'large',
  showControls = false,
  onPause,
  onResume,
}) => {
  const [remaining, setRemaining] = useState(duration);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Timer logic
  useEffect(() => {
    if (isRunning && !isPaused && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining(prev => {
          const newVal = prev - 1;
          onTick?.(newVal);
          
          if (newVal <= 0) {
            clearInterval(intervalRef.current!);
            onTimeUp();
            playEndSound();
          }
          
          return newVal;
        });
      }, 1000);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isPaused, remaining]);
  
  const playEndSound = () => {
    // Jouer un son de fin
    try {
      audioRef.current = new Audio('/sounds/timer-end.mp3');
      audioRef.current.play();
    } catch (e) {
      console.log('Sound not available');
    }
  };
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const getTimerStyle = () => {
    if (remaining <= 10) return 'bg-red-500 text-white animate-pulse';
    if (remaining <= 30) return 'bg-red-100 text-red-600';
    if (remaining <= 60) return 'bg-yellow-100 text-yellow-600';
    return 'bg-gray-100 text-gray-800';
  };
  
  const sizeClasses = size === 'large' 
    ? 'text-8xl md:text-9xl px-12 py-8' 
    : 'text-4xl px-6 py-3';
  
  return (
    <div className="timer-container flex flex-col items-center gap-4">
      <div className={`timer font-mono font-bold rounded-2xl ${sizeClasses} ${getTimerStyle()}`}>
        {formatTime(remaining)}
      </div>
      
      {showControls && (
        <div className="flex gap-4">
          {isPaused ? (
            <button
              onClick={onResume}
              className="px-6 py-3 bg-green-500 text-white rounded-lg font-bold"
            >
              ▶️ Reprendre
            </button>
          ) : (
            <button
              onClick={onPause}
              className="px-6 py-3 bg-yellow-500 text-white rounded-lg font-bold"
            >
              ⏸️ Pause (Incident)
            </button>
          )}
        </div>
      )}
      
      {isPaused && (
        <div className="text-yellow-600 font-bold animate-pulse">
          ⚠️ PAUSE - Incident en cours
        </div>
      )}
    </div>
  );
};
```

### 5.3 Synchronisation WebSocket

**Fichier** : `src/main/remoteScoreServer.ts` (MODIFIER)

```typescript
// Ajouter la synchronisation du chrono
private broadcastTimerUpdate(arenaId: string, remaining: number, status: 'running' | 'paused'): void {
  this.io.emit(`arena:${arenaId}:timer`, {
    remaining,
    status,
    timestamp: Date.now(),
  });
}

// Dans handleArenaControl
case 'timer_update':
  this.broadcastTimerUpdate(data.arenaId, data.remaining, data.status);
  break;
```

### 5.4 Tâches Sprint 5

| # | Tâche | Fichier | Effort |
|---|-------|---------|--------|
| 5.1 | MatchTimer.tsx | components/MatchTimer.tsx | 3h |
| 5.2 | Refonte timer referee.html | remote/referee.html | 2h |
| 5.3 | Timer grand format arena.html | remote/arena.html | 2h |
| 5.4 | Sync WebSocket timer | remoteScoreServer.ts | 2h |
| 5.5 | Son fin de temps | assets/sounds/ | 30min |
| 5.6 | Persistance état pause | database/index.ts | 1h |
| 5.7 | Tests | tests/timer.test.ts | 1h |

**Total Sprint 5** : ~12h (1.5 jours)

---

## 🎯 SPRINT 6 : Abandon, Forfait et Mode Hors-ligne (1 semaine)

### 6.1 Gestion Abandon/Forfait

**Règles FFE** :
| Formule | Forfait | Abandon |
|---------|---------|---------|
| QUEST | Points conservés tous | Points conservés |
| ASL | Points annulés en poule | Points conservés |

### 6.2 Mode Hors-ligne Tablette

**Architecture** :
```
┌─────────────────────────────────────────┐
│           TABLETTE ARBITRE              │
│  ┌─────────────────────────────────┐    │
│  │      IndexedDB Local            │    │
│  │  - Queue d'actions              │    │
│  │  - État match local             │    │
│  └─────────────────────────────────┘    │
│                 │                        │
│    ┌────────────▼────────────┐          │
│    │   Service Worker        │          │
│    │  - Cache pages          │          │
│    │  - Sync différée        │          │
│    └─────────────────────────┘          │
└─────────────────────────────────────────┘
           │
           │ Quand connexion disponible
           ▼
┌─────────────────────────────────────────┐
│         SERVEUR CENTRAL                 │
│  - Réception actions en queue           │
│  - Résolution conflits                  │
│  - Mise à jour base                     │
└─────────────────────────────────────────┘
```

### 6.3 Service Worker

**Fichier** : `src/remote/sw.js` (NOUVEAU)

```javascript
const CACHE_NAME = 'bellepoule-referee-v1';
const ASSETS = [
  '/',
  '/referee.html',
  '/arena.html',
  '/styles.css',
  '/app.js',
];

// Installation
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

// Fetch avec fallback cache
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
  );
});

// Sync en arrière-plan
self.addEventListener('sync', event => {
  if (event.tag === 'sync-scores') {
    event.waitUntil(syncScores());
  }
});

async function syncScores() {
  const db = await openDB('offline-queue');
  const actions = await db.getAll('actions');
  
  for (const action of actions) {
    try {
      await fetch('/api/sync', {
        method: 'POST',
        body: JSON.stringify(action),
      });
      await db.delete('actions', action.id);
    } catch (e) {
      // Réessayer plus tard
    }
  }
}
```

### 6.4 Tâches Sprint 6

| # | Tâche | Fichier | Effort |
|---|-------|---------|--------|
| 6.1 | Logique forfait/abandon | utils/forfaitHandling.ts | 2h |
| 6.2 | UI distinction statuts | components/PoolView.tsx | 1h |
| 6.3 | Service Worker | remote/sw.js | 3h |
| 6.4 | IndexedDB queue | remote/offlineQueue.js | 3h |
| 6.5 | Indicateur connexion | remote/referee.html | 1h |
| 6.6 | Sync différée | remoteScoreServer.ts | 2h |
| 6.7 | Résolution conflits | utils/conflictResolution.ts | 2h |
| 6.8 | Tests | tests/offline.test.ts | 2h |

**Total Sprint 6** : ~16h (2 jours)

---

## 🎯 SPRINT 7 : Affichage Public et Dashboard (1 semaine)

### 7.1 Affichage Arène Amélioré

**Fichier** : `src/remote/arena.html` (REFONTE)

```html
<!-- Affichage optimisé grand écran -->
<div class="arena-display">
  <!-- Header -->
  <header class="arena-header">
    <div class="competition-info">
      <span id="competition-name">Coupe Régionale</span>
      <span id="pool-info">Poule 3</span>
    </div>
    <div class="arena-badge">ARÈNE <span id="arena-num">1</span></div>
  </header>
  
  <!-- Zone Score Principale -->
  <main class="score-zone">
    <!-- Tireur Rouge -->
    <div class="fencer-panel red">
      <div class="color-indicator"></div>
      <div class="fencer-name" id="fencer-a-name">DUPONT Jean</div>
      <div class="fencer-club" id="fencer-a-club">Club Paris</div>
      <div class="fencer-score" id="fencer-a-score">0</div>
      
      <!-- Cartons affichés -->
      <div class="cards-display" id="fencer-a-cards"></div>
    </div>
    
    <!-- Timer Central -->
    <div class="timer-zone">
      <div class="timer" id="timer">03:00</div>
      <div class="match-status" id="match-status">En attente</div>
      
      <!-- Indicateur Mort Subite -->
      <div id="sudden-death-indicator" class="sudden-death-indicator" style="display: none;">
        ⚔️ MORT SUBITE
      </div>
    </div>
    
    <!-- Tireur Vert -->
    <div class="fencer-panel green">
      <!-- Miroir -->
    </div>
  </main>
  
  <!-- Pied de page avec infos match -->
  <footer class="arena-footer">
    <div class="match-number">Match #<span id="match-num">1</span></div>
    <div class="next-match">
      Suivant: <span id="next-match">MARTIN vs BERNARD</span>
    </div>
  </footer>
</div>

<style>
/* Design pour affichage TV/Projecteur */
.arena-display {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  color: white;
  display: flex;
  flex-direction: column;
}

.score-zone {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 2rem;
  padding: 2rem;
  align-items: center;
}

.fencer-score {
  font-size: 15rem;
  font-weight: 900;
  text-shadow: 0 0 30px currentColor;
}

.timer {
  font-size: 8rem;
  font-family: 'Courier New', monospace;
  background: rgba(255,255,255,0.1);
  padding: 1rem 3rem;
  border-radius: 1rem;
}

.sudden-death-indicator {
  font-size: 2rem;
  color: #ef4444;
  animation: pulse 1s infinite;
}

/* Cartons affichés */
.cards-display {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.card-badge {
  width: 40px;
  height: 60px;
  border-radius: 4px;
}

.card-yellow { background: #fbbf24; }
.card-red { background: #ef4444; }
</style>
```

### 7.2 Dashboard Classement Live

**Fichier** : `src/remote/dashboard.html` (NOUVEAU)

```html
<!-- Dashboard multi-poules -->
<div class="dashboard">
  <header>
    <h1>🏆 Classement en Direct</h1>
    <div id="last-update">Mis à jour: --:--:--</div>
  </header>
  
  <div class="pools-grid" id="pools-container">
    <!-- Généré dynamiquement -->
  </div>
  
  <div class="overall-ranking" id="overall-ranking">
    <h2>Classement Général Quest</h2>
    <table>
      <thead>
        <tr>
          <th>Rg</th>
          <th>Tireur</th>
          <th>Club</th>
          <th>V</th>
          <th>Quest</th>
          <th>Ind</th>
        </tr>
      </thead>
      <tbody id="ranking-body">
        <!-- Généré dynamiquement -->
      </tbody>
    </table>
  </div>
</div>

<script>
// Auto-refresh toutes les 5 secondes
setInterval(fetchRankings, 5000);

async function fetchRankings() {
  const response = await fetch('/api/rankings');
  const data = await response.json();
  updateDisplay(data);
}
</script>
```

### 7.3 Tâches Sprint 7

| # | Tâche | Fichier | Effort |
|---|-------|---------|--------|
| 7.1 | Refonte arena.html | remote/arena.html | 4h |
| 7.2 | CSS grand écran | remote/styles.css | 2h |
| 7.3 | Affichage cartons | remote/arena.html | 1h |
| 7.4 | Dashboard classement | remote/dashboard.html | 4h |
| 7.5 | API classement live | remoteScoreServer.ts | 2h |
| 7.6 | WebSocket rankings | remoteScoreServer.ts | 2h |
| 7.7 | Tests | tests/display.test.ts | 1h |

**Total Sprint 7** : ~16h (2 jours)

---

## 📅 PLANNING GLOBAL

```
Février 2026                                              Mars 2026
├────────────────────────────────────────────────────────────────────────────────────────
│ Sem 1-2        │ Sem 3        │ Sem 4        │ Sem 5-6      │ Sem 7        │ Sem 8
│                │              │              │              │              │
│ SPRINT 1       │ SPRINT 2     │ SPRINT 3     │ SPRINT 4     │ SPRINT 5     │ SPRINT 6-7
│ Cartons        │ Sortie       │ Zones        │ Mort Subite  │ Chronomètre  │ Hors-ligne
│ 24h            │ 8h           │ 12h          │ 21h          │ 12h          │ + Affichage
│                │              │              │              │              │ 32h
├────────────────────────────────────────────────────────────────────────────────────────
│                                                                            │
│                           TOTAL: ~109h (~14 jours de dev)                  │
│                                                                            │
```

---

## ✅ CHECKLIST FINALE

### Conformité Règlement FFE

- [ ] Cartons avec escalade automatique
- [ ] Points Quest (1-4)
- [ ] Zones 1/3/5 pts
- [ ] Sortie arène +3 pts
- [ ] Mort subite (challenger + timeout)
- [ ] Chrono 3 min temps réel
- [ ] Tirage au sort si égalité
- [ ] Exclusion carton noir

### Interface e-Arbitre (Tablette)

- [ ] Boutons tactiles 100px+
- [ ] Zones A/B/C bien identifiées
- [ ] Cartons accessibles facilement
- [ ] Chrono visible
- [ ] Mode hors-ligne fonctionnel
- [ ] Feedback haptic/visuel

### Affichage Public

- [ ] Score lisible de loin (15rem+)
- [ ] Timer grande taille
- [ ] Cartons affichés
- [ ] Indicateur mort subite
- [ ] Classement en direct

### Synchronisation

- [ ] Temps réel tablette ↔ affichage
- [ ] Mode hors-ligne avec sync
- [ ] Résolution conflits
- [ ] Persistance session

---

## 📚 RÉFÉRENCES

- [Règlement FFE Sabre Laser 2025-2026](https://www.ffescrime.fr/wp-content/uploads/2024/09/Livret2_CombatSportif_v.Sept25-FR.pdf)
- [PRD BellePoule Modern](./PRD.md)
- [Architecture Technique](./ARCHITECTURE.md)

---

*Document créé le 19 février 2026*  
*BellePoule Modern - Open Source sous licence GPL-3.0*

