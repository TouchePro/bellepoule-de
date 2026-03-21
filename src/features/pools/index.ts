/**
 * BellePoule Modern - Pools Feature
 * Main entry point for pools-related functionality
 * Licensed under GPL-3.0
 */

// Components
export { PoolView } from './components/PoolView';
export { PoolGrid } from './components/PoolGrid';
export { PoolRankingView } from './components/PoolRankingView';
export { PoolPrepView } from './components/PoolPrepView';

// Hooks
export { usePools } from './hooks/usePools';
export { usePoolStore } from './hooks/usePoolStore';

// Services
export { PoolService } from './services/poolService';
export { PoolCalculator } from './services/poolCalculator';

// Types
export type {
  PoolState,
  PoolActions,
  PoolGenerationConfig,
  ScoreUpdateDTO,
} from './types/pool.types';

// Utils
export {
  calculatePoolRanking,
  distributeFencersToPools,
  generatePoolMatchOrder,
} from './utils/poolCalculations';
