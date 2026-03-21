import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import {
  CompetitionState,
  CompetitionActions,
  CreateCompetitionDTO,
  UpdateCompetitionDTO,
} from '../types/competition.types';
import { CompetitionService } from '../services/competitionService';

const service = new CompetitionService();

export const useCompetitionStore = create<CompetitionState & CompetitionActions>()(
  devtools(
    immer(
      persist(
        (set, get) => ({
          // State
          competitions: [],
          currentCompetition: null,
          isLoading: false,
          error: null,

          // Actions
          loadCompetitions: async () => {
            set({ isLoading: true, error: null });
            try {
              const competitions = await service.getAll();
              set({ competitions, isLoading: false });
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to load competitions',
                isLoading: false,
              });
            }
          },

          selectCompetition: async (id: string) => {
            set({ isLoading: true, error: null });
            try {
              const competition = await service.getById(id);
              set({ currentCompetition: competition, isLoading: false });
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to load competition',
                isLoading: false,
              });
            }
          },

          createCompetition: async (data: CreateCompetitionDTO) => {
            set({ isLoading: true, error: null });
            try {
              const competition = await service.create(data);
              set(state => {
                state.competitions.unshift(competition);
                state.currentCompetition = competition;
                state.isLoading = false;
              });
              return competition;
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to create competition',
                isLoading: false,
              });
              throw error;
            }
          },

          updateCompetition: async (id: string, data: UpdateCompetitionDTO) => {
            set({ isLoading: true, error: null });
            try {
              const updated = await service.update(id, data);
              set(state => {
                const index = state.competitions.findIndex(c => c.id === id);
                if (index !== -1) {
                  state.competitions[index] = { ...state.competitions[index], ...updated };
                }
                if (state.currentCompetition?.id === id) {
                  state.currentCompetition = { ...state.currentCompetition, ...updated };
                }
                state.isLoading = false;
              });
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to update competition',
                isLoading: false,
              });
              throw error;
            }
          },

          deleteCompetition: async (id: string) => {
            set({ isLoading: true, error: null });
            try {
              await service.delete(id);
              set(state => {
                state.competitions = state.competitions.filter(c => c.id !== id);
                if (state.currentCompetition?.id === id) {
                  state.currentCompetition = null;
                }
                state.isLoading = false;
              });
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to delete competition',
                isLoading: false,
              });
              throw error;
            }
          },

          setCurrentCompetition: competition => {
            set({ currentCompetition: competition });
          },

          clearError: () => {
            set({ error: null });
          },
        }),
        {
          name: 'competition-store',
          partialize: state => ({
            competitions: state.competitions,
            currentCompetition: state.currentCompetition,
          }),
        }
      )
    ),
    { name: 'CompetitionStore' }
  )
);
