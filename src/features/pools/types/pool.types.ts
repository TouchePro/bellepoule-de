/**
 * BellePoule Modern - Pool Types
 * Feature-specific types for pool management
 * Licensed under GPL-3.0
 */

import { Pool, PoolRanking } from '../../../shared/types';

export interface PoolState {
  pools: Pool[];
  currentPool: Pool | null;
  overallRanking: PoolRanking[];
  isLoading: boolean;
  error: string | null;
}

export interface PoolActions {
  loadPools: (competitionId: string) => Promise<void>;
  generatePools: (competitionId: string, config: PoolGenerationConfig) => Promise<void>;
  updateScore: (poolId: string, matchId: string, data: ScoreUpdateDTO) => Promise<void>;
  computeRanking: (competitionId: string) => Promise<void>;
  setCurrentPool: (pool: Pool | null) => void;
  clearError: () => void;
}

export interface PoolGenerationConfig {
  fencerCount: number;
  minPoolSize: number;
  maxPoolSize: number;
  poolCount?: number;
  strategy: 'serpentine' | 'random' | 'club_balanced';
}

export interface ScoreUpdateDTO {
  scoreA?: number;
  scoreB?: number;
  status?: 'not_started' | 'in_progress' | 'finished';
  winner?: 'A' | 'B' | null;
  specialStatus?: 'abandon' | 'forfait' | 'exclusion';
}

export interface PoolStats {
  totalMatches: number;
  completedMatches: number;
  averageDuration: number;
  fastestMatch?: { fencerA: string; fencerB: string; duration: number };
  slowestMatch?: { fencerA: string; fencerB: string; duration: number };
}
