/**
 * BellePoule Modern - Competition Feature
 * Main entry point for competition-related functionality
 * Licensed under GPL-3.0
 */

// Components
export { CompetitionList } from './components/CompetitionList';
export { CompetitionView } from './components/CompetitionView';
export { NewCompetitionModal } from './components/NewCompetitionModal';
export { CompetitionPropertiesModal } from './components/CompetitionPropertiesModal';

// Hooks
export { useCompetition } from './hooks/useCompetition';
export { useCompetitionStore } from './hooks/useCompetitionStore';

// Services
export { CompetitionService } from './services/competitionService';

// Types
export type {
  CompetitionState,
  CompetitionActions,
  CreateCompetitionDTO,
  UpdateCompetitionDTO,
} from './types/competition.types';

// Utils
export {
  validateCompetition,
  generateCompetitionId,
  formatCompetitionDate,
} from './utils/competitionUtils';
