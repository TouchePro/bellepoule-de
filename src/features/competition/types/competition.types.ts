/**
 * BellePoule Modern - Competition Types
 * Feature-specific types for competition management
 * Licensed under GPL-3.0
 */

import { Competition, CompetitionSettings } from '../../../shared/types';

export interface CompetitionState {
  competitions: Competition[];
  currentCompetition: Competition | null;
  isLoading: boolean;
  error: string | null;
}

export interface CompetitionActions {
  loadCompetitions: () => Promise<void>;
  selectCompetition: (id: string) => Promise<void>;
  createCompetition: (data: CreateCompetitionDTO) => Promise<Competition>;
  updateCompetition: (id: string, data: UpdateCompetitionDTO) => Promise<void>;
  deleteCompetition: (id: string) => Promise<void>;
  setCurrentCompetition: (competition: Competition | null) => void;
  clearError: () => void;
}

export interface CreateCompetitionDTO {
  title: string;
  date: Date;
  location?: string;
  organizer?: string;
  weapon: 'FOIL' | 'EPEE' | 'SABRE' | 'LASER';
  gender: 'M' | 'F' | 'X';
  category: string;
  settings?: Partial<CompetitionSettings>;
}

export interface UpdateCompetitionDTO {
  title?: string;
  date?: Date;
  location?: string;
  organizer?: string;
  weapon?: 'FOIL' | 'EPEE' | 'SABRE' | 'LASER';
  gender?: 'M' | 'F' | 'X';
  category?: string;
  settings?: Partial<CompetitionSettings>;
}

export interface CompetitionFilters {
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  weapon?: string;
  gender?: string;
  category?: string;
  sortBy?: 'date' | 'title' | 'created';
  sortOrder?: 'asc' | 'desc';
}

export interface CompetitionStats {
  totalFencers: number;
  checkedInFencers: number;
  poolsCount: number;
  completedPools: number;
  tableMatchesCount: number;
  completedMatches: number;
  averageMatchDuration: number;
}
