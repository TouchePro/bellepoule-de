/**
 * BellePoule Modern - Pool Calculator
 * Mathematical calculations for pool management
 * Licensed under GPL-3.0
 */

import { Pool, Fencer, PoolRanking } from '../../../shared/types';
import {
  calculatePoolRanking,
  calculateFencerPoolStats,
} from '../../../shared/utils/poolCalculations';

export interface PoolCalculationResult {
  rankings: PoolRanking[];
  isComplete: boolean;
  stats: {
    totalMatches: number;
    completedMatches: number;
    averageTouchesPerMatch: number;
  };
}

export class PoolCalculator {
  /**
   * Calculate optimal pool distribution
   */
  static calculatePoolDistribution(
    fencerCount: number,
    minPoolSize: number = 5,
    maxPoolSize: number = 7
  ): { poolCount: number; fencersPerPool: number[] } {
    // Simple algorithm: try to create equal-sized pools
    for (let poolCount = 1; poolCount <= fencerCount; poolCount++) {
      const baseSize = Math.floor(fencerCount / poolCount);
      const remainder = fencerCount % poolCount;

      if (baseSize >= minPoolSize && baseSize <= maxPoolSize) {
        const distribution: number[] = [];
        for (let i = 0; i < poolCount; i++) {
          distribution.push(i < remainder ? baseSize + 1 : baseSize);
        }
        return { poolCount, fencersPerPool: distribution };
      }
    }

    // Fallback: single pool
    return { poolCount: 1, fencersPerPool: [fencerCount] };
  }

  /**
   * Calculate pool rankings using standard FIE rules
   */
  static calculateRankings(pool: Pool): PoolCalculationResult {
    const rankings = calculatePoolRanking(pool);
    const matches = pool.matches ?? [];
    const completedMatches = matches.filter(m => m.status === 'finished').length;
    const totalTouches = matches
      .filter(m => m.status === 'finished')
      .reduce((sum, m) => sum + (m.scoreA?.value ?? 0) + (m.scoreB?.value ?? 0), 0);

    return {
      rankings,
      isComplete: PoolCalculator.isPoolComplete(pool),
      stats: {
        totalMatches: matches.length,
        completedMatches,
        averageTouchesPerMatch: completedMatches > 0 ? totalTouches / completedMatches : 0,
      },
    };
  }

  /**
   * Check if pool is complete
   */
  static isPoolComplete(pool: Pool): boolean {
    if (!pool.matches || pool.matches.length === 0) return false;
    return pool.matches.every(match => match.status === 'finished');
  }

  /**
   * Calculate victory ratio for a fencer in a pool
   */
  static calculateVictoryRatio(fencer: Fencer, pool: Pool): number {
    const stats = calculateFencerPoolStats(fencer, pool.matches ?? []);
    return stats.victoryRatio;
  }
}
