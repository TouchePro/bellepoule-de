/**
 * BellePoule Modern - Analytics Feature
 * Main entry point for analytics functionality
 * Licensed under GPL-3.0
 */

// Components
export { AnalyticsDashboard } from './components/AnalyticsDashboard';
export { StatsChart } from './components/StatsChart';
export { PerformanceGraph } from './components/PerformanceGraph';

// Hooks
export { useAnalytics } from './hooks/useAnalytics';
export { useAnalyticsStore } from './hooks/useAnalyticsStore';

// Services
export { AnalyticsService } from './services/analyticsService';

// Types
export type {
  AnalyticsState,
  AnalyticsActions,
  FencerStats,
  CompetitionMetrics,
  PredictionResult,
} from './types/analytics.types';

// Utils
export {
  calculateWinProbability,
  predictMatchDuration,
  analyzeFencerPerformance,
} from './utils/analyticsCalculations';
