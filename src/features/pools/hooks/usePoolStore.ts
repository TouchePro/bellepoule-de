import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { useShallow } from 'zustand/shallow';
import { PoolState, PoolActions, PoolGenerationConfig, ScoreUpdateDTO } from '../types/pool.types';
import { PoolService } from '../services/poolService';
import { MatchStatus } from '../../../shared/types';
import { createDebouncedJSONStorage } from '../../../shared/utils/debouncedStorage';

const service = new PoolService();

export const usePoolStore = create<PoolState & PoolActions>()(
  devtools(
    immer(
      persist(
        (set, get) => ({
          // State
          pools: [],
          currentPool: null,
          overallRanking: [],
          isLoading: false,
          error: null,

          // Actions
          loadPools: async (competitionId: string) => {
            set({ isLoading: true, error: null });
            try {
              const pools = await service.getByCompetition(competitionId);
              set({ pools, isLoading: false });
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to load pools',
                isLoading: false,
              });
            }
          },

          generatePools: async (competitionId: string, config: PoolGenerationConfig) => {
            set({ isLoading: true, error: null });
            try {
              const pools = await service.generatePools(competitionId, config);
              set({ pools, isLoading: false });
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to generate pools',
                isLoading: false,
              });
            }
          },

          updateScore: async (poolId: string, matchId: string, data: ScoreUpdateDTO) => {
            set({ isLoading: true, error: null });
            try {
              await service.updateScore(poolId, matchId, data);
              set(state => {
                const poolIndex = state.pools.findIndex(p => p.id === poolId);
                if (poolIndex !== -1) {
                  const matchIndex = state.pools[poolIndex].matches.findIndex(
                    m => m.id === matchId
                  );
                  if (matchIndex !== -1) {
                    const match = state.pools[poolIndex].matches[matchIndex];
                    // Update scoreA if provided
                    if (data.scoreA !== undefined) {
                      match.scoreA = {
                        value: data.scoreA,
                        isVictory: data.winner === 'A',
                        isAbstention: data.specialStatus === 'abandon' && data.winner !== 'A',
                        isForfait: data.specialStatus === 'forfait' && data.winner !== 'A',
                        isExclusion: data.specialStatus === 'exclusion' && data.winner !== 'A',
                      };
                    }
                    // Update scoreB if provided
                    if (data.scoreB !== undefined) {
                      match.scoreB = {
                        value: data.scoreB,
                        isVictory: data.winner === 'B',
                        isAbstention: data.specialStatus === 'abandon' && data.winner !== 'B',
                        isForfait: data.specialStatus === 'forfait' && data.winner !== 'B',
                        isExclusion: data.specialStatus === 'exclusion' && data.winner !== 'B',
                      };
                    }
                    // Update status if provided
                    if (data.status !== undefined) {
                      match.status = data.status as MatchStatus;
                    }
                  }
                }
                state.isLoading = false;
              });
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to update score',
                isLoading: false,
              });
            }
          },

          computeRanking: async (competitionId: string) => {
            set({ isLoading: true, error: null });
            try {
              const ranking = await service.computeOverallRanking(competitionId);
              set({ overallRanking: ranking, isLoading: false });
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to compute ranking',
                isLoading: false,
              });
            }
          },

          setCurrentPool: pool => {
            set({ currentPool: pool });
          },

          clearError: () => {
            set({ error: null });
          },
        }),
        {
          name: 'pool-store',
          // Écriture différée : chaque saisie de score déclenchait un stringify de toutes les poules.
          storage: createDebouncedJSONStorage(500),
          partialize: state => ({
            pools: state.pools,
            overallRanking: state.overallRanking,
          }),
        }
      )
    ),
    { name: 'PoolStore' }
  )
);

// ── Selector hooks (évite les re-renders inutiles) ──────────────────────────
export const usePools = () => usePoolStore(useShallow(s => s.pools));
export const useCurrentPool = () => usePoolStore(s => s.currentPool);
export const useOverallRanking = () => usePoolStore(useShallow(s => s.overallRanking));
export const usePoolLoading = () => usePoolStore(s => s.isLoading);
export const usePoolError = () => usePoolStore(s => s.error);
export const usePoolActions = () =>
  usePoolStore(
    useShallow(s => ({
      loadPools: s.loadPools,
      generatePools: s.generatePools,
      updateScore: s.updateScore,
      computeRanking: s.computeRanking,
      setCurrentPool: s.setCurrentPool,
      clearError: s.clearError,
    }))
  );
