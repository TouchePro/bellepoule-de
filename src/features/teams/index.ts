/**
 * BellePoule Modern - Team Competition Index
 * Feature 22: Main entry point
 * Licensed under GPL-3.0
 */

// Store
export { useTeamStore } from './hooks/useTeamStore';

// Types
export type {
  Team,
  TeamMatch,
  TeamPool,
  TeamFencer,
  TeamBout,
  CreateTeamDTO,
  UpdateTeamBoutScoreDTO,
  TeamStats,
} from './types/team.types';

// Utils
export {
  generateRelayBouts,
  calculateTeamScore,
  validateTeamComposition,
} from './utils/teamCalculations';
