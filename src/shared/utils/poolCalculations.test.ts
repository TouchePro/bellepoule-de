/**
 * Tests unitaires pour les calculs de poules
 * BellePoule Modern
 */

import { describe, it, expect } from 'vitest';
import {
  generatePoolMatchOrder,
  calculateFencerPoolStats,
  calculatePoolRanking,
  formatRatio,
  formatIndex,
} from './poolCalculations';
import { Fencer, FencerStatus, Match, MatchStatus, Pool, Score, Weapon, Gender } from '../types';

// ============================================================================
// Helper Functions for Tests
// ============================================================================

const createMockFencer = (id: string, ref: number, lastName: string): Fencer => ({
  id,
  ref,
  lastName,
  firstName: 'Test',
  gender: Gender.MALE,
  nationality: 'FRA',
  status: FencerStatus.CHECKED_IN,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const createMockMatch = (
  id: string,
  fencerA: Fencer,
  fencerB: Fencer,
  scoreA: number | null,
  scoreB: number | null,
  status: MatchStatus = MatchStatus.FINISHED
): Match => {
  const createScore = (value: number | null, isWinner: boolean = false): Score | null => {
    if (value === null) return null;
    return {
      value,
      isVictory: isWinner,
      isAbstention: false,
      isExclusion: false,
      isForfait: false,
    };
  };

  // Détermine qui est le vainqueur
  const isAWinner = scoreA !== null && scoreB !== null && scoreA > scoreB;

  return {
    id,
    number: 1,
    fencerA,
    fencerB,
    scoreA: createScore(scoreA, isAWinner),
    scoreB: createScore(scoreB, !isAWinner),
    maxScore: 5,
    status,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

// ============================================================================
// Tests pour generatePoolMatchOrder
// ============================================================================

describe('generatePoolMatchOrder', () => {
  it('should generate correct match order for pool of 3 fencers', () => {
    const order = generatePoolMatchOrder(3);
    expect(order).toHaveLength(3);
    expect(order).toEqual([
      [1, 2],
      [2, 3],
      [1, 3],
    ]);
  });

  it('should generate correct match order for pool of 4 fencers', () => {
    const order = generatePoolMatchOrder(4);
    expect(order).toHaveLength(6);
  });

  it('should generate correct match order for pool of 5 fencers', () => {
    const order = generatePoolMatchOrder(5);
    expect(order).toHaveLength(10);
  });

  it('should generate correct match order for pool of 6 fencers', () => {
    const order = generatePoolMatchOrder(6);
    expect(order).toHaveLength(15);
  });

  it('should generate correct match order for pool of 7 fencers', () => {
    const order = generatePoolMatchOrder(7);
    expect(order).toHaveLength(21);
  });

  it('should generate correct match order for pool of 8 fencers', () => {
    const order = generatePoolMatchOrder(8);
    expect(order).toHaveLength(28);
  });

  it('should generate generic order for non-standard pool sizes', () => {
    const order = generatePoolMatchOrder(9);
    // Should use generic algorithm for 9 fencers
    expect(order.length).toBeGreaterThan(0);
  });

  it('should not have duplicate matches', () => {
    const order = generatePoolMatchOrder(6);
    const uniqueMatches = new Set(order.map(([a, b]) => `${a}-${b}`));
    expect(uniqueMatches.size).toBe(order.length);
  });
});

// ============================================================================
// Tests pour calculateFencerPoolStats
// ============================================================================

describe('calculateFencerPoolStats', () => {
  const fencer1 = createMockFencer('f1', 1, 'FencerOne');
  const fencer2 = createMockFencer('f2', 2, 'FencerTwo');
  const fencer3 = createMockFencer('f3', 3, 'FencerThree');

  it('should calculate stats correctly for a winner', () => {
    const matches: Match[] = [
      createMockMatch('m1', fencer1, fencer2, 5, 3),
      createMockMatch('m2', fencer1, fencer3, 5, 2),
    ];

    const stats = calculateFencerPoolStats(fencer1, matches);

    expect(stats.victories).toBe(2);
    expect(stats.defeats).toBe(0);
    expect(stats.touchesScored).toBe(10);
    expect(stats.touchesReceived).toBe(5);
    expect(stats.index).toBe(5);
    expect(stats.matchesPlayed).toBe(2);
    expect(stats.victoryRatio).toBe(1);
  });

  it('should calculate stats correctly for a loser', () => {
    const matches: Match[] = [
      createMockMatch('m1', fencer1, fencer2, 5, 3),
      createMockMatch('m2', fencer1, fencer3, 2, 5),
    ];

    const stats = calculateFencerPoolStats(fencer2, matches);

    expect(stats.victories).toBe(0);
    expect(stats.defeats).toBe(1);
    expect(stats.touchesScored).toBe(3);
    expect(stats.touchesReceived).toBe(5);
    expect(stats.index).toBe(-2);
    expect(stats.matchesPlayed).toBe(1);
    expect(stats.victoryRatio).toBe(0);
  });

  it('should ignore unfinished matches', () => {
    const matches: Match[] = [
      createMockMatch('m1', fencer1, fencer2, 5, 3),
      createMockMatch('m2', fencer1, fencer3, null, null, MatchStatus.NOT_STARTED),
    ];

    const stats = calculateFencerPoolStats(fencer1, matches);

    expect(stats.matchesPlayed).toBe(1);
    expect(stats.victories).toBe(1);
  });

  it('should return zero stats when no matches played', () => {
    const matches: Match[] = [];
    const stats = calculateFencerPoolStats(fencer1, matches);

    expect(stats.victories).toBe(0);
    expect(stats.defeats).toBe(0);
    expect(stats.matchesPlayed).toBe(0);
    expect(stats.victoryRatio).toBe(0);
  });
});

// ============================================================================
// Tests pour calculatePoolRanking
// ============================================================================

describe('calculatePoolRanking', () => {
  it('should rank fencers by victory ratio', () => {
    const fencer1 = createMockFencer('f1', 1, 'Winner');
    const fencer2 = createMockFencer('f2', 2, 'Loser');

    const pool: Pool = {
      id: 'p1',
      number: 1,
      phaseId: 'ph1',
      fencers: [fencer1, fencer2],
      matches: [createMockMatch('m1', fencer1, fencer2, 5, 2)],
      referees: [],
      isComplete: true,
      hasError: false,
      ranking: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const ranking = calculatePoolRanking(pool);

    expect(ranking).toHaveLength(2);
    expect(ranking[0].fencer.id).toBe(fencer1.id);
    expect(ranking[0].victories).toBe(1);
    expect(ranking[1].fencer.id).toBe(fencer2.id);
    expect(ranking[1].victories).toBe(0);
  });

  it('should exclude excluded, forfeit and abandoned fencers', () => {
    const fencer1 = createMockFencer('f1', 1, 'Active');
    const fencer2 = createMockFencer('f2', 2, 'Excluded');
    const fencer3 = createMockFencer('f3', 3, 'Forfeit');
    const fencer4 = createMockFencer('f4', 4, 'Abandoned');

    fencer2.status = FencerStatus.EXCLUDED;
    fencer3.status = FencerStatus.FORFAIT;
    fencer4.status = FencerStatus.ABANDONED;

    const pool: Pool = {
      id: 'p1',
      number: 1,
      phaseId: 'ph1',
      fencers: [fencer1, fencer2, fencer3, fencer4],
      matches: [],
      referees: [],
      isComplete: false,
      hasError: false,
      ranking: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const ranking = calculatePoolRanking(pool);

    expect(ranking).toHaveLength(1);
    expect(ranking[0].fencer.id).toBe(fencer1.id);
  });
});

// ============================================================================
// Tests pour formatRatio
// ============================================================================

describe('formatRatio', () => {
  it('should format perfect ratio', () => {
    expect(formatRatio(1)).toBe('1.000');
  });

  it('should format zero ratio', () => {
    expect(formatRatio(0)).toBe('0.000');
  });

  it('should format ratio with 3 decimal places', () => {
    expect(formatRatio(0.5)).toBe('0.500');
    expect(formatRatio(0.333)).toBe('0.333');
    expect(formatRatio(0.6667)).toBe('0.667');
  });
});

// ============================================================================
// Tests pour formatIndex
// ============================================================================

describe('formatIndex', () => {
  it('should format positive index', () => {
    expect(formatIndex(5)).toBe('+5');
    expect(formatIndex(10)).toBe('+10');
  });

  it('should format negative index', () => {
    expect(formatIndex(-5)).toBe('-5');
    expect(formatIndex(-10)).toBe('-10');
  });

  it('should format zero index', () => {
    expect(formatIndex(0)).toBe('+0');
  });
});
