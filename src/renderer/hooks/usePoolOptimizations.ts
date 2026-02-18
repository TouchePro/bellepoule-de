/**
 * BellePoule Modern - Optimized Pool Hooks
 * Memoized calculations for pool performance
 * Licensed under GPL-3.0
 */

import { useMemo, useCallback, useState } from 'react';
import { Pool, Fencer, Match, MatchStatus, Score, Weapon, PoolRanking } from '../../shared/types';
import {
  calculatePoolRanking,
  formatRatio,
  formatIndex,
} from '../../shared/utils/poolCalculations';

// ============================================================================
// Pool Calculation Hooks
// ============================================================================

export const usePoolCalculations = (pool: Pool, weapon?: Weapon) => {
  const isLaserSabre = weapon === Weapon.LASER;

  // Memoized fencer calculations
  const fencerStats = useMemo(() => {
    const stats = new Map<
      string,
      {
        victories: number;
        defeats: number;
        touchesScored: number;
        touchesReceived: number;
        matchesPlayed: number;
      }
    >();

    // Initialize all fencers with zero stats
    pool.fencers.forEach(fencer => {
      stats.set(fencer.id, {
        victories: 0,
        defeats: 0,
        touchesScored: 0,
        touchesReceived: 0,
        matchesPlayed: 0,
      });
    });

    // Calculate stats from matches
    pool.matches.forEach(match => {
      if (match.status !== MatchStatus.FINISHED || !match.fencerA || !match.fencerB) {
        return;
      }

      const fencerAId = match.fencerA.id;
      const fencerBId = match.fencerB.id;

      const statA = stats.get(fencerAId);
      const statB = stats.get(fencerBId);

      if (!statA || !statB) return;

      const scoreA = match.scoreA?.value ?? 0;
      const scoreB = match.scoreB?.value ?? 0;

      // Update stats
      statA.matchesPlayed++;
      statB.matchesPlayed++;

      statA.touchesScored += scoreA;
      statA.touchesReceived += scoreB;

      statB.touchesScored += scoreB;
      statB.touchesReceived += scoreA;

      // Determine winner (considering victory overrides for laser sabre)
      const winnerA = match.scoreA?.isVictory || (scoreA > scoreB && !isLaserSabre);
      const winnerB = match.scoreB?.isVictory || (scoreB > scoreA && !isLaserSabre);

      if (winnerA) {
        statA.victories++;
        statB.defeats++;
      } else if (winnerB) {
        statB.victories++;
        statA.defeats++;
      }
    });

    return stats;
  }, [pool.fencers, pool.matches, isLaserSabre]);

  // Memoized pool ranking
  const poolRanking = useMemo(() => {
    return calculatePoolRanking(pool);
  }, [pool.fencers, fencerStats, isLaserSabre]);

  // Memoized match categories
  const matchCategories = useMemo(() => {
    const pending = pool.matches
      .map((m, idx) => ({ match: m, index: idx }))
      .filter(({ match }) => match.status !== MatchStatus.FINISHED);

    const finished = pool.matches
      .map((m, idx) => ({ match: m, index: idx }))
      .filter(({ match }) => match.status === MatchStatus.FINISHED);

    return { pending, finished };
  }, [pool.matches]);

  return {
    fencerStats,
    poolRanking,
    matchCategories,
    isLaserSabre,
  };
};

// ============================================================================
// Match Ordering Hook
// ============================================================================

export const useOrderedMatches = (pool: Pool) => {
  const orderedMatches = useMemo(() => {
    const pending = pool.matches
      .map((m, idx) => ({ match: m, index: idx }))
      .filter(({ match }) => match.status !== MatchStatus.FINISHED);

    const finished = pool.matches
      .map((m, idx) => ({ match: m, index: idx }))
      .filter(({ match }) => match.status === MatchStatus.FINISHED);

    if (pending.length === 0) return { pending: [], finished };

    // Smart ordering algorithm to prevent fencers from fighting twice in a row
    const ordered: typeof pending = [];
    const remaining = [...pending];
    let lastFencerIds: Set<string> = new Set();

    while (remaining.length > 0) {
      let bestMatch: (typeof pending)[0] | null = null;
      let bestScore = -1;

      for (const candidate of remaining) {
        const fencerAId = candidate.match.fencerA?.id;
        const fencerBId = candidate.match.fencerB?.id;

        let score = 0;

        // Prefer matches with fencers who haven't fought recently
        if (fencerAId && !lastFencerIds.has(fencerAId)) score += 2;
        if (fencerBId && !lastFencerIds.has(fencerBId)) score += 2;

        // Prefer matches with higher-numbered fencers (to finish their matches earlier)
        if (fencerAId) {
          const fencerA = pool.fencers.find(f => f.id === fencerAId);
          if (fencerA) score += fencerA.ref * 0.1;
        }
        if (fencerBId) {
          const fencerB = pool.fencers.find(f => f.id === fencerBId);
          if (fencerB) score += fencerB.ref * 0.1;
        }

        if (score > bestScore) {
          bestScore = score;
          bestMatch = candidate;
        }
      }

      if (bestMatch) {
        ordered.push(bestMatch);
        remaining.splice(remaining.indexOf(bestMatch), 1);

        // Update last fencers set
        lastFencerIds.clear();
        if (bestMatch.match.fencerA) lastFencerIds.add(bestMatch.match.fencerA.id);
        if (bestMatch.match.fencerB) lastFencerIds.add(bestMatch.match.fencerB.id);
      } else {
        // Fallback: add remaining matches in order
        ordered.push(...remaining);
        break;
      }
    }

    return { pending: ordered, finished };
  }, [pool.matches, pool.fencers]);

  return orderedMatches;
};

// ============================================================================
// Score Editing Hook
// ============================================================================

export const useScoreEditing = () => {
  const [editingMatch, setEditingMatch] = useState<number | null>(null);
  const [editScoreA, setEditScoreA] = useState('');
  const [editScoreB, setEditScoreB] = useState('');
  const [victoryA, setVictoryA] = useState(false);
  const [victoryB, setVictoryB] = useState(false);

  const startEditing = useCallback((match: Match) => {
    setEditingMatch(match.number);
    setEditScoreA(match.scoreA?.value?.toString() ?? '');
    setEditScoreB(match.scoreB?.value?.toString() ?? '');
    setVictoryA(match.scoreA?.isVictory ?? false);
    setVictoryB(match.scoreB?.isVictory ?? false);
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingMatch(null);
    setEditScoreA('');
    setEditScoreB('');
    setVictoryA(false);
    setVictoryB(false);
  }, []);

  const clearEditing = useCallback(() => {
    setEditingMatch(null);
  }, []);

  return {
    editingMatch,
    editScoreA,
    editScoreB,
    victoryA,
    victoryB,
    setEditScoreA,
    setEditScoreB,
    setVictoryA,
    setVictoryB,
    startEditing,
    cancelEditing,
    clearEditing,
  };
};

// ============================================================================
// Fencer Display Hook
// ============================================================================

export const useFencerDisplay = (fencers: Fencer[]) => {
  const fencerById = useMemo(() => {
    const map = new Map<string, Fencer>();
    fencers.forEach(fencer => map.set(fencer.id, fencer));
    return map;
  }, [fencers]);

  const getFencerDisplay = useCallback((fencer: Fencer | null) => {
    if (!fencer) return '';
    return `${fencer.ref}. ${fencer.firstName} ${fencer.lastName}`;
  }, []);

  const getFencerShortDisplay = useCallback((fencer: Fencer | null) => {
    if (!fencer) return '';
    return `${fencer.firstName[0]}. ${fencer.lastName}`;
  }, []);

  return {
    fencerById,
    getFencerDisplay,
    getFencerShortDisplay,
  };
};

// ============================================================================
// Pool Grid Data Hook
// ============================================================================

export const usePoolGridData = (pool: Pool, poolRanking: PoolRanking[]) => {
  const gridData = useMemo(() => {
    // Create grid data structure for efficient rendering
    const gridSize = pool.fencers.length;
    const grid: Array<
      Array<{
        fencerA: Fencer;
        fencerB: Fencer;
        match: Match | null;
        score: string;
        winner: 'A' | 'B' | null;
      }>
    > = [];

    // Initialize empty grid
    for (let i = 0; i < gridSize; i++) {
      grid[i] = [];
      for (let j = 0; j < gridSize; j++) {
        grid[i][j] = {
          fencerA: pool.fencers[i],
          fencerB: pool.fencers[j],
          match: null,
          score: '',
          winner: null,
        };
      }
    }

    // Fill with match data
    pool.matches.forEach(match => {
      if (!match.fencerA || !match.fencerB) return;

      const indexA = pool.fencers.findIndex(f => f.id === match.fencerA!.id);
      const indexB = pool.fencers.findIndex(f => f.id === match.fencerB!.id);

      if (indexA !== -1 && indexB !== -1) {
        const scoreA = match.scoreA?.value ?? 0;
        const scoreB = match.scoreB?.value ?? 0;
        const victoryA = match.scoreA?.isVictory;
        const victoryB = match.scoreB?.isVictory;

        let winner: 'A' | 'B' | null = null;
        if (victoryA) winner = 'A';
        else if (victoryB) winner = 'B';
        else if (scoreA > scoreB) winner = 'A';
        else if (scoreB > scoreA) winner = 'B';

        grid[indexA][indexB] = {
          fencerA: pool.fencers[indexA],
          fencerB: pool.fencers[indexB],
          match,
          score: `${scoreA}-${scoreB}`,
          winner,
        };
      }
    });

    return { grid, gridSize };
  }, [pool.fencers, pool.matches]);

  return gridData;
};
