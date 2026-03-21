import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { AnalyticsState, AnalyticsActions } from '../types/analytics.types';
import { AnalyticsService } from '../services/analyticsService';

const service = new AnalyticsService();

export const useAnalyticsStore = create<AnalyticsState & AnalyticsActions>()(
  devtools(
    immer((set, get) => ({
      // State
      fencerStats: [],
      competitionMetrics: null,
      predictions: [],
      isLoading: false,
      error: null,

      // Actions
      loadFencerStats: async (competitionId: string) => {
        set({ isLoading: true, error: null });
        try {
          const stats = await service.getFencerStats(competitionId);
          set({ fencerStats: stats, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load stats',
            isLoading: false,
          });
        }
      },

      loadCompetitionMetrics: async (competitionId: string) => {
        set({ isLoading: true, error: null });
        try {
          const metrics = await service.getCompetitionMetrics(competitionId);
          set({ competitionMetrics: metrics, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load metrics',
            isLoading: false,
          });
        }
      },

      predictMatch: async (fencerAId: string, fencerBId: string) => {
        try {
          const prediction = await service.predictMatch(fencerAId, fencerBId);
          set(state => {
            state.predictions.push(prediction);
          });
          return prediction;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to predict match',
          });
          throw error;
        }
      },

      clearError: () => {
        set({ error: null });
      },
    })),
    { name: 'AnalyticsStore' }
  )
);
