/**
 * Tests unitaires pour le système de cartons FFE Sabre Laser
 * BellePoule Modern
 */

import { describe, it, expect } from 'vitest';
import {
  determineCardType,
  createCard,
  getReasonsByGroup,
  getCardsForFencer,
  isFencerExcluded,
  CARD_REASON_LABELS,
  CARD_GROUP_LABELS,
} from './cardSystem';
import { Card, CardGroup, CardReason } from '../types';
import { CardType } from '../../features/penalties/types/penalty.types';

// ============================================================================
// Helper pour créer des cartons de test
// ============================================================================

const createMockCard = (
  group: CardGroup,
  type: CardType = CardType.YELLOW,
  fencerId: string = 'f1'
): Card => ({
  id: `card-${Date.now()}`,
  matchId: 'm1',
  fencerId,
  type,
  reason: CardReason.EARLY_START,
  group,
  timestamp: new Date(),
  pointsAwarded: type === CardType.RED ? 1 : 0,
  resultingExclusion: type === CardType.BLACK,
});

// ============================================================================
// Tests pour determineCardType - Escalade FFE
// ============================================================================

describe("determineCardType - Système d'escalade FFE", () => {
  describe('Groupe 1: Blanc → Jaune → Jaune', () => {
    it('1ère faute Groupe 1 = Carton BLANC (0 point)', () => {
      const result = determineCardType(CardReason.EARLY_START, []);

      expect(result.type).toBe(CardType.WHITE);
      expect(result.points).toBe(0);
      expect(result.shouldExclude).toBe(false);
    });

    it('2ème faute Groupe 1 = Carton JAUNE (+1 point)', () => {
      const previousCards = [createMockCard(CardGroup.GROUP_1, CardType.WHITE)];

      const result = determineCardType(CardReason.LATE_STOP, previousCards);

      expect(result.type).toBe(CardType.YELLOW);
      expect(result.points).toBe(1);
      expect(result.shouldExclude).toBe(false);
    });

    it('3ème faute Groupe 1 = Carton JAUNE (+1 point)', () => {
      const previousCards = [
        createMockCard(CardGroup.GROUP_1, CardType.WHITE),
        createMockCard(CardGroup.GROUP_1, CardType.YELLOW),
      ];

      const result = determineCardType(CardReason.BODY_CONTACT, previousCards);

      expect(result.type).toBe(CardType.YELLOW);
      expect(result.points).toBe(1);
      expect(result.shouldExclude).toBe(false);
    });

    it('4ème faute Groupe 1 = Carton JAUNE (+1 point, pas de Noir)', () => {
      const previousCards = [
        createMockCard(CardGroup.GROUP_1, CardType.WHITE),
        createMockCard(CardGroup.GROUP_1, CardType.YELLOW),
        createMockCard(CardGroup.GROUP_1, CardType.YELLOW),
      ];

      const result = determineCardType(CardReason.COUNTER_ATTACK, previousCards);

      expect(result.type).toBe(CardType.YELLOW);
      expect(result.points).toBe(1);
      expect(result.shouldExclude).toBe(false);
    });
  });

  describe('Groupe 2: Jaune → Rouge → Rouge', () => {
    it('1ère faute Groupe 2 = Carton JAUNE (+1 point)', () => {
      const result = determineCardType(CardReason.ESTOC, []);

      expect(result.type).toBe(CardType.YELLOW);
      expect(result.points).toBe(1);
      expect(result.shouldExclude).toBe(false);
    });

    it('2ème faute Groupe 2 = Carton ROUGE (+1 point)', () => {
      const previousCards = [createMockCard(CardGroup.GROUP_2, CardType.YELLOW)];

      const result = determineCardType(CardReason.VOLUNTARY_EXIT, previousCards);

      expect(result.type).toBe(CardType.RED);
      expect(result.points).toBe(1);
      expect(result.shouldExclude).toBe(false);
    });

    it('3ème faute Groupe 2 = Carton ROUGE (+1 point, pas de Noir)', () => {
      const previousCards = [
        createMockCard(CardGroup.GROUP_2, CardType.YELLOW),
        createMockCard(CardGroup.GROUP_2, CardType.RED),
      ];

      const result = determineCardType(CardReason.HEAVY_HIT, previousCards);

      expect(result.type).toBe(CardType.RED);
      expect(result.points).toBe(1);
      expect(result.shouldExclude).toBe(false);
    });
  });

  describe('Groupe 3: Rouge → Exclusion', () => {
    it('1ère faute Groupe 3 = Carton ROUGE (+1 point)', () => {
      const result = determineCardType(CardReason.BRUTALITY, []);

      expect(result.type).toBe(CardType.RED);
      expect(result.points).toBe(1);
      expect(result.shouldExclude).toBe(false);
    });

    it('2ème faute Groupe 3 = Carton NOIR (exclusion)', () => {
      const previousCards = [createMockCard(CardGroup.GROUP_3, CardType.RED)];

      const result = determineCardType(CardReason.DANGEROUS, previousCards);

      expect(result.type).toBe(CardType.BLACK);
      expect(result.shouldExclude).toBe(true);
    });
  });

  describe('Groupe 4: Exclusion immédiate', () => {
    it('Refus de combattre = Carton NOIR direct', () => {
      const result = determineCardType(CardReason.REFUSAL, []);

      expect(result.type).toBe(CardType.BLACK);
      expect(result.shouldExclude).toBe(true);
      expect(result.points).toBe(0);
    });

    it('Tricherie = Carton NOIR direct', () => {
      const result = determineCardType(CardReason.CHEATING, []);

      expect(result.type).toBe(CardType.BLACK);
      expect(result.shouldExclude).toBe(true);
    });

    it('Anti-sportif = Carton NOIR direct', () => {
      const result = determineCardType(CardReason.UNSPORTSMANLIKE, []);

      expect(result.type).toBe(CardType.BLACK);
      expect(result.shouldExclude).toBe(true);
    });
  });

  describe('Isolation entre groupes', () => {
    it("Les cartons d'un groupe n'affectent pas les autres groupes", () => {
      // 3 cartons Groupe 1 (séquence complète B→J→R)
      const previousCards = [
        createMockCard(CardGroup.GROUP_1, CardType.WHITE),
        createMockCard(CardGroup.GROUP_1, CardType.YELLOW),
        createMockCard(CardGroup.GROUP_1, CardType.RED),
      ];

      // Faute Groupe 2 = Jaune (pas noir, pas rouge)
      const result = determineCardType(CardReason.ESTOC, previousCards);

      expect(result.type).toBe(CardType.YELLOW);
      expect(result.shouldExclude).toBe(false);
    });
  });
});

// ============================================================================
// Tests pour createCard
// ============================================================================

describe('createCard', () => {
  it('crée un carton avec un ID unique', () => {
    const card1 = createCard('m1', 'f1', CardReason.EARLY_START, []);
    const card2 = createCard('m1', 'f1', CardReason.EARLY_START, []);

    expect(card1.id).not.toBe(card2.id);
  });

  it('associe correctement le match et le tireur', () => {
    const card = createCard('match-123', 'fencer-456', CardReason.ESTOC, []);

    expect(card.matchId).toBe('match-123');
    expect(card.fencerId).toBe('fencer-456');
  });

  it('définit le groupe correct pour chaque raison', () => {
    const cardG1 = createCard('m1', 'f1', CardReason.EARLY_START, []);
    const cardG2 = createCard('m1', 'f1', CardReason.ESTOC, []);
    const cardG3 = createCard('m1', 'f1', CardReason.BRUTALITY, []);
    const cardG4 = createCard('m1', 'f1', CardReason.CHEATING, []);

    expect(cardG1.group).toBe(CardGroup.GROUP_1);
    expect(cardG2.group).toBe(CardGroup.GROUP_2);
    expect(cardG3.group).toBe(CardGroup.GROUP_3);
    expect(cardG4.group).toBe(CardGroup.GROUP_4);
  });

  it('ajoute un timestamp', () => {
    const before = new Date();
    const card = createCard('m1', 'f1', CardReason.LATE_STOP, []);
    const after = new Date();

    expect(card.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(card.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});

// ============================================================================
// Tests pour getReasonsByGroup
// ============================================================================

describe('getReasonsByGroup', () => {
  it('retourne les 4 groupes', () => {
    const groups = getReasonsByGroup();

    expect(Object.keys(groups)).toHaveLength(4);
    expect(groups[CardGroup.GROUP_1]).toBeDefined();
    expect(groups[CardGroup.GROUP_2]).toBeDefined();
    expect(groups[CardGroup.GROUP_3]).toBeDefined();
    expect(groups[CardGroup.GROUP_4]).toBeDefined();
  });

  it('Groupe 1 contient les bonnes raisons', () => {
    const groups = getReasonsByGroup();

    expect(groups[CardGroup.GROUP_1]).toContain(CardReason.EARLY_START);
    expect(groups[CardGroup.GROUP_1]).toContain(CardReason.LATE_STOP);
    expect(groups[CardGroup.GROUP_1]).toContain(CardReason.BODY_CONTACT);
    expect(groups[CardGroup.GROUP_1]).toContain(CardReason.TIME_WASTING);
  });

  it('Groupe 4 contient les exclusions directes', () => {
    const groups = getReasonsByGroup();

    expect(groups[CardGroup.GROUP_4]).toContain(CardReason.REFUSAL);
    expect(groups[CardGroup.GROUP_4]).toContain(CardReason.CHEATING);
    expect(groups[CardGroup.GROUP_4]).toContain(CardReason.UNSPORTSMANLIKE);
  });
});

// ============================================================================
// Tests pour getCardsForFencer
// ============================================================================

describe('getCardsForFencer', () => {
  it('filtre correctement les cartons par tireur', () => {
    const allCards: Card[] = [
      { ...createMockCard(CardGroup.GROUP_1), fencerId: 'f1', id: 'c1' },
      { ...createMockCard(CardGroup.GROUP_1), fencerId: 'f2', id: 'c2' },
      { ...createMockCard(CardGroup.GROUP_2), fencerId: 'f1', id: 'c3' },
    ];

    const f1Cards = getCardsForFencer('f1', allCards);
    const f2Cards = getCardsForFencer('f2', allCards);

    expect(f1Cards).toHaveLength(2);
    expect(f2Cards).toHaveLength(1);
  });

  it('retourne un tableau vide si pas de cartons', () => {
    const cards = getCardsForFencer('f999', []);

    expect(cards).toHaveLength(0);
  });
});

// ============================================================================
// Tests pour isFencerExcluded
// ============================================================================

describe('isFencerExcluded', () => {
  it('retourne true si carton noir reçu', () => {
    const cards: Card[] = [
      {
        ...createMockCard(CardGroup.GROUP_4, CardType.BLACK),
        fencerId: 'f1',
        resultingExclusion: true,
      },
    ];

    expect(isFencerExcluded('f1', cards)).toBe(true);
  });

  it('retourne false si pas de carton noir', () => {
    const cards: Card[] = [
      { ...createMockCard(CardGroup.GROUP_1, CardType.YELLOW), fencerId: 'f1' },
      { ...createMockCard(CardGroup.GROUP_2, CardType.RED), fencerId: 'f1' },
    ];

    expect(isFencerExcluded('f1', cards)).toBe(false);
  });

  it('retourne false pour un tireur sans cartons', () => {
    expect(isFencerExcluded('f1', [])).toBe(false);
  });
});

// ============================================================================
// Tests pour les labels français
// ============================================================================

describe('Labels français', () => {
  it('toutes les raisons ont un label', () => {
    const reasons = Object.values(CardReason);

    reasons.forEach(reason => {
      expect(CARD_REASON_LABELS[reason]).toBeDefined();
      expect(CARD_REASON_LABELS[reason].length).toBeGreaterThan(0);
    });
  });

  it('tous les groupes ont un label', () => {
    const groups = Object.values(CardGroup).filter(v => typeof v === 'number');

    groups.forEach(group => {
      expect(CARD_GROUP_LABELS[group as CardGroup]).toBeDefined();
    });
  });

  it('les labels sont en français', () => {
    expect(CARD_REASON_LABELS[CardReason.EARLY_START]).toBe('Départ anticipé');
    expect(CARD_REASON_LABELS[CardReason.CHEATING]).toBe('Tricherie');
    expect(CARD_GROUP_LABELS[CardGroup.GROUP_1]).toContain('Jaune');
  });
});
