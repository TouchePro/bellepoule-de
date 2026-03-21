/**
 * BellePoule Modern - Bracket/Tableau Feature
 * Main entry point for bracket functionality
 * Licensed under GPL-3.0
 */

// Components
export { BracketView } from './components/BracketView';
export { TableauView } from './components/TableauView';
export { BracketMatch } from './components/BracketMatch';

// Hooks
export { useBracket } from './hooks/useBracket';
export { useBracketStore } from './hooks/useBracketStore';

// Services
export { BracketService } from './services/bracketService';
export { BracketGenerator } from './services/bracketGenerator';

// Types
export type {
  BracketState,
  BracketActions,
  BracketConfig,
  TableauMatch,
  FinalResult,
} from './types/bracket.types';

// Utils
export { calculateTableRanking, generateBracket, getRoundName } from './utils/bracketCalculations';
