import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { BracketState, BracketActions, BracketConfig } from '../types/bracket.types';
import { BracketService } from '../services/bracketService';

const service = new BracketService();

export const useBracketStore = create<BracketState & BracketActions>()(
  devtools(
    immer(
      persist(
        (set, get) => ({
          // State
          matches: [],
          finalResults: [],
          isLoading: false,
          error: null,
          thirdPlaceMatch: null,

          // Actions
          generateBracket: async (competitionId: string, ranking: any[], config: BracketConfig) => {
            set({ isLoading: true, error: null });
            try {
              const matches = await service.generateBracket(competitionId, ranking, config);
              set({ matches, isLoading: false });
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to generate bracket',
                isLoading: false,
              });
            }
          },

          updateMatch: async (matchId: string, data: any) => {
            set({ isLoading: true, error: null });
            try {
              await service.updateMatch(matchId, data);
              set(state => {
                const matchIndex = state.matches.findIndex(m => m.id === matchId);
                if (matchIndex !== -1) {
                  state.matches[matchIndex] = { ...state.matches[matchIndex], ...data };
                }
                state.isLoading = false;
              });
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to update match',
                isLoading: false,
              });
            }
          },

          computeFinalResults: async (competitionId: string) => {
            set({ isLoading: true, error: null });
            try {
              const results = await service.computeFinalResults(competitionId);
              set({ finalResults: results, isLoading: false });
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to compute results',
                isLoading: false,
              });
            }
          },

          clearError: () => {
            set({ error: null });
          },
        }),
        {
          name: 'bracket-store',
          partialize: state => ({
            matches: state.matches,
            finalResults: state.finalResults,
          }),
        }
      )
    ),
    { name: 'BracketStore' }
  )
);
