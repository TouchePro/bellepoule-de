/**
 * Tests unitaires pour le calculateur de statistiques tireurs
 * BellePoule Modern
 */

import { describe, it, expect } from 'vitest';
import { FencerStatsCalculator } from './fencerStatsCalculator';
import { Fencer, Match, MatchStatus, FencerStatus, Gender, Score } from '../types';

// ============================================================================
// Helpers pour créer des données de test
// ============================================================================

const createMockFencer = (id: string, lastName: string): Fencer => ({
  id,
  ref: parseInt(id),
  lastName,
  firstName: 'Test',
  gender: Gender.MALE,
  nationality: 'FRA',
  status: FencerStatus.CHECKED_IN,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const createScore = (value: number, isVictory: boolean = false): Score => ({
  value,
  isVictory,
  isAbstention: false,
  isExclusion: false,
  isForfait: false,
});

const createMockMatch = (
  id: string,
  fencerA: Fencer,
  fencerB: Fencer,
  scoreA: number,
  scoreB: number,
  status: MatchStatus = MatchStatus.FINISHED
): Match => ({
  id,
  number: 1,
  fencerA,
  fencerB,
  scoreA: createScore(scoreA, scoreA > scoreB),
  scoreB: createScore(scoreB, scoreB > scoreA),
  maxScore: 5,
  status,
  createdAt: new Date(),
  updatedAt: new Date(),
});

// ============================================================================
// Tests pour calculateFencerPoolStats
// ============================================================================

describe('FencerStatsCalculator.calculateFencerPoolStats', () => {
  const fencer1 = createMockFencer('1', 'Dupont');
  const fencer2 = createMockFencer('2', 'Martin');
  const fencer3 = createMockFencer('3', 'Bernard');

  describe('Calcul des victoires et défaites', () => {
    it('compte correctement les victoires', () => {
      const matches: Match[] = [
        createMockMatch('m1', fencer1, fencer2, 5, 3), // V
        createMockMatch('m2', fencer1, fencer3, 5, 2), // V
      ];

      const stats = FencerStatsCalculator.calculateFencerPoolStats(fencer1, matches);

      expect(stats.victories).toBe(2);
      expect(stats.defeats).toBe(0);
    });

    it('compte correctement les défaites', () => {
      const matches: Match[] = [
        createMockMatch('m1', fencer1, fencer2, 2, 5), // D
        createMockMatch('m2', fencer3, fencer1, 5, 3), // D
      ];

      const stats = FencerStatsCalculator.calculateFencerPoolStats(fencer1, matches);

      expect(stats.victories).toBe(0);
      expect(stats.defeats).toBe(2);
    });

    it('calcule le ratio de victoire', () => {
      const matches: Match[] = [
        createMockMatch('m1', fencer1, fencer2, 5, 3), // V
        createMockMatch('m2', fencer1, fencer3, 2, 5), // D
      ];

      const stats = FencerStatsCalculator.calculateFencerPoolStats(fencer1, matches);

      expect(stats.victoryRatio).toBe(0.5); // 1 victoire / 2 matchs
    });
  });

  describe('Calcul des touches', () => {
    it('compte les touches données et reçues', () => {
      const matches: Match[] = [
        createMockMatch('m1', fencer1, fencer2, 5, 3),
        createMockMatch('m2', fencer1, fencer3, 4, 5),
      ];

      const stats = FencerStatsCalculator.calculateFencerPoolStats(fencer1, matches);

      expect(stats.touchesScored).toBe(9); // 5 + 4
      expect(stats.touchesReceived).toBe(8); // 3 + 5
      expect(stats.index).toBe(1); // 9 - 8
    });

    it('gère le tireur comme fencerB', () => {
      const matches: Match[] = [
        createMockMatch('m1', fencer2, fencer1, 3, 5), // fencer1 est B
      ];

      const stats = FencerStatsCalculator.calculateFencerPoolStats(fencer1, matches);

      expect(stats.touchesScored).toBe(5);
      expect(stats.touchesReceived).toBe(3);
      expect(stats.victories).toBe(1);
    });
  });

  describe('Filtrage des matchs', () => {
    it('ignore les matchs non terminés', () => {
      const matches: Match[] = [
        createMockMatch('m1', fencer1, fencer2, 5, 3, MatchStatus.FINISHED),
        createMockMatch('m2', fencer1, fencer3, 0, 0, MatchStatus.NOT_STARTED),
        createMockMatch('m3', fencer1, fencer2, 2, 2, MatchStatus.IN_PROGRESS),
      ];

      const stats = FencerStatsCalculator.calculateFencerPoolStats(fencer1, matches);

      expect(stats.matchesPlayed).toBe(1);
    });

    it('ignore les matchs où le tireur ne participe pas', () => {
      const matches: Match[] = [
        createMockMatch('m1', fencer2, fencer3, 5, 3), // pas fencer1
      ];

      const stats = FencerStatsCalculator.calculateFencerPoolStats(fencer1, matches);

      expect(stats.matchesPlayed).toBe(0);
    });
  });

  describe('Cas spéciaux (abandon, forfait, exclusion)', () => {
    it("gère l'abandon (adversaire gagne)", () => {
      const match = createMockMatch('m1', fencer1, fencer2, 2, 3);
      match.scoreA = {
        value: 2,
        isVictory: false,
        isAbstention: true,
        isExclusion: false,
        isForfait: false,
      };

      const stats = FencerStatsCalculator.calculateFencerPoolStats(fencer1, [match]);

      expect(stats.defeats).toBe(1);
      expect(stats.touchesScored).toBe(2);
    });

    it('gère le forfait adversaire (victoire automatique)', () => {
      const match = createMockMatch('m1', fencer1, fencer2, 5, 0);
      match.scoreB = {
        value: 0,
        isVictory: false,
        isAbstention: false,
        isExclusion: false,
        isForfait: true,
      };

      const stats = FencerStatsCalculator.calculateFencerPoolStats(fencer1, [match]);

      expect(stats.victories).toBe(1);
    });
  });

  describe('Stats vides', () => {
    it('retourne des stats à zéro si pas de matchs', () => {
      const stats = FencerStatsCalculator.calculateFencerPoolStats(fencer1, []);

      expect(stats.victories).toBe(0);
      expect(stats.defeats).toBe(0);
      expect(stats.touchesScored).toBe(0);
      expect(stats.touchesReceived).toBe(0);
      expect(stats.index).toBe(0);
      expect(stats.matchesPlayed).toBe(0);
      expect(stats.victoryRatio).toBe(0);
    });
  });
});

// ============================================================================
// Tests pour calculateStatsBatch
// ============================================================================

describe('FencerStatsCalculator.calculateStatsBatch', () => {
  const fencer1 = createMockFencer('1', 'Dupont');
  const fencer2 = createMockFencer('2', 'Martin');
  const fencer3 = createMockFencer('3', 'Bernard');

  it('calcule les stats pour tous les tireurs', () => {
    const fencers = [fencer1, fencer2, fencer3];
    const matches: Match[] = [
      createMockMatch('m1', fencer1, fencer2, 5, 3),
      createMockMatch('m2', fencer2, fencer3, 5, 4),
      createMockMatch('m3', fencer1, fencer3, 5, 2),
    ];

    const statsMap = FencerStatsCalculator.calculateStatsBatch(fencers, matches);

    expect(statsMap.size).toBe(3);
    expect(statsMap.get('1')?.victories).toBe(2);
    expect(statsMap.get('2')?.victories).toBe(1);
    expect(statsMap.get('3')?.victories).toBe(0);
  });

  it('retourne une Map vide si pas de tireurs', () => {
    const statsMap = FencerStatsCalculator.calculateStatsBatch([], []);

    expect(statsMap.size).toBe(0);
  });
});

// ============================================================================
// Tests pour calculateFencerQuestStats
// ============================================================================

describe('FencerStatsCalculator.calculateFencerQuestStats', () => {
  const fencer1 = createMockFencer('1', 'Dupont');
  const fencer2 = createMockFencer('2', 'Martin');
  const fencer3 = createMockFencer('3', 'Bernard');

  describe('Calcul des points Quest', () => {
    it('attribue 4 pts Quest pour écart >= 8', () => {
      const matches: Match[] = [
        createMockMatch('m1', fencer1, fencer2, 15, 5), // écart 10
      ];

      const stats = FencerStatsCalculator.calculateFencerQuestStats(fencer1, matches);

      expect(stats.questPoints).toBe(4);
      expect(stats.v4).toBe(1);
    });

    it('attribue 3 pts Quest pour écart 6-7', () => {
      const matches: Match[] = [
        createMockMatch('m1', fencer1, fencer2, 15, 9), // écart 6
      ];

      const stats = FencerStatsCalculator.calculateFencerQuestStats(fencer1, matches);

      expect(stats.questPoints).toBe(3);
      expect(stats.v3).toBe(1);
    });

    it('attribue 2 pts Quest pour écart 4-5', () => {
      const matches: Match[] = [
        createMockMatch('m1', fencer1, fencer2, 15, 11), // écart 4
      ];

      const stats = FencerStatsCalculator.calculateFencerQuestStats(fencer1, matches);

      expect(stats.questPoints).toBe(2);
      expect(stats.v2).toBe(1);
    });

    it('attribue 1 pt Quest pour écart <= 3', () => {
      const matches: Match[] = [
        createMockMatch('m1', fencer1, fencer2, 15, 14), // écart 1
      ];

      const stats = FencerStatsCalculator.calculateFencerQuestStats(fencer1, matches);

      expect(stats.questPoints).toBe(1);
      expect(stats.v1).toBe(1);
    });
  });

  describe('Cumul des points Quest', () => {
    it('cumule les points de plusieurs victoires', () => {
      const matches: Match[] = [
        createMockMatch('m1', fencer1, fencer2, 15, 3), // écart 12 = 4 pts
        createMockMatch('m2', fencer1, fencer3, 15, 10), // écart 5 = 2 pts
      ];

      const stats = FencerStatsCalculator.calculateFencerQuestStats(fencer1, matches);

      expect(stats.questPoints).toBe(6); // 4 + 2
      expect(stats.v4).toBe(1);
      expect(stats.v2).toBe(1);
    });

    it('ne compte pas les défaites', () => {
      const matches: Match[] = [
        createMockMatch('m1', fencer1, fencer2, 5, 15), // défaite
        createMockMatch('m2', fencer1, fencer3, 15, 5), // victoire
      ];

      const stats = FencerStatsCalculator.calculateFencerQuestStats(fencer1, matches);

      expect(stats.questPoints).toBe(4); // Seulement la victoire
    });
  });

  describe('Stats vides', () => {
    it('retourne 0 si pas de matchs', () => {
      const stats = FencerStatsCalculator.calculateFencerQuestStats(fencer1, []);

      expect(stats.questPoints).toBe(0);
      expect(stats.v4).toBe(0);
      expect(stats.v3).toBe(0);
      expect(stats.v2).toBe(0);
      expect(stats.v1).toBe(0);
    });

    it('retourne 0 si que des défaites', () => {
      const matches: Match[] = [
        createMockMatch('m1', fencer1, fencer2, 3, 15),
        createMockMatch('m2', fencer1, fencer3, 5, 15),
      ];

      const stats = FencerStatsCalculator.calculateFencerQuestStats(fencer1, matches);

      expect(stats.questPoints).toBe(0);
    });
  });
});
