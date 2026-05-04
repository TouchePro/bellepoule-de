/**
 * BellePoule Modern - Competition Session Hook
 * Gestion de la sauvegarde et restauration de l'état de session
 * Licensed under GPL-3.0
 */

import { useState, useEffect, useCallback } from 'react';
import { Pool, PoolRanking } from '../../shared/types';
import { logger, LogCategory } from '@shared/services/logger';
import { TableauMatch, FinalResult } from '../components/TableauView';

export type Phase = 'checkin' | 'poolprep' | 'pools' | 'ranking' | 'quest' | 'tableau' | 'results' | 'remote';

interface SessionState {
  currentPhase: number;
  pools: Pool[];
  poolHistory: Pool[][];
  overallRanking: PoolRanking[];
  tableauMatches: TableauMatch[];
  finalResults: FinalResult[];
  currentPoolRound: number;
  skipPoolPhase: boolean;
  poolPrepParams: {
    poolCount: number;
    minFencersPerPool: number;
    maxFencersPerPool: number;
  };
  uiState: {
    currentPhase: Phase;
    currentPoolRound: number;
    pools: number;
  };
}

interface UseCompetitionSessionProps {
  competitionId: string;
  currentPhase: Phase;
  currentPoolRound: number;
  pools: Pool[];
  poolHistory: Pool[][];
  overallRanking: PoolRanking[];
  tableauMatches: TableauMatch[];
  finalResults: FinalResult[];
  skipPoolPhase: boolean;
  poolPrepParams: {
    poolCount: number;
    minFencersPerPool: number;
    maxFencersPerPool: number;
  };
}

export const useCompetitionSession = (props: UseCompetitionSessionProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [restoredState, setRestoredState] = useState<Partial<SessionState> | null>(null);

  // Phase mapping entre string et number
  const phaseToNumber: Record<Phase, number> = {
    checkin: 0,
    poolprep: 1,
    pools: 2,
    ranking: 3,
    quest: 4,
    tableau: 5,
    results: 6,
    remote: 7,
  };

  const numberToPhase: Record<number, Phase> = {
    0: 'checkin',
    1: 'poolprep',
    2: 'pools',
    3: 'ranking',
    4: 'quest',
    5: 'tableau',
    6: 'results',
    7: 'remote',
  };

  // Sauvegarder l'état
  const saveState = useCallback(async () => {
    if (!window.electronAPI?.db?.saveSessionState || !isLoaded) return;

    const state: SessionState = {
      currentPhase: phaseToNumber[props.currentPhase],
      pools: props.pools,
      poolHistory: props.poolHistory,
      overallRanking: props.overallRanking,
      tableauMatches: props.tableauMatches,
      finalResults: props.finalResults,
      currentPoolRound: props.currentPoolRound,
      skipPoolPhase: props.skipPoolPhase,
      poolPrepParams: {
        poolCount: props.poolPrepParams?.poolCount || 0,
        minFencersPerPool: props.poolPrepParams?.minFencersPerPool || 5,
        maxFencersPerPool: props.poolPrepParams?.maxFencersPerPool || 7,
      },
      uiState: {
        currentPhase: props.currentPhase,
        currentPoolRound: props.currentPoolRound,
        pools: props.pools.length,
      },
    };

    try {
      await window.electronAPI.db.saveSessionState(props.competitionId, state);
    } catch (e) {
      logger.error(LogCategory.UI, 'Failed to save session state', e as Error);
    }
  }, [props, isLoaded]);

  // Restaurer l'état
  const restoreState = useCallback(async () => {
    if (!window.electronAPI?.db?.getSessionState) {
      setIsLoaded(true);
      return;
    }

    try {
      const state = await window.electronAPI.db.getSessionState(props.competitionId);
      if (state) {
        const typedState = state as SessionState;
        const restoredPhase = numberToPhase[typedState.currentPhase || 0];

        setRestoredState({
          currentPhase: typedState.currentPhase,
          pools: typedState.pools || [],
          poolHistory: typedState.poolHistory || [],
          overallRanking: typedState.overallRanking || [],
          tableauMatches: typedState.tableauMatches || [],
          finalResults: typedState.finalResults || [],
          currentPoolRound: typedState.uiState?.currentPoolRound || 1,
          skipPoolPhase: typedState.skipPoolPhase ?? false,
          poolPrepParams: typedState.poolPrepParams || {
            poolCount: 0,
            minFencersPerPool: 5,
            maxFencersPerPool: 7,
          },
        });

        logger.debug(LogCategory.UI, 'Session state restored');
      }
    } catch (e) {
      logger.error(LogCategory.UI, 'Failed to restore session state', e as Error);
    }
    setIsLoaded(true);
  }, [props.competitionId]);

  // Restaurer au chargement
  useEffect(() => {
    restoreState();
  }, [restoreState]);

  // Sauvegarder à chaque changement
  useEffect(() => {
    if (isLoaded) {
      saveState();
    }
  }, [saveState, isLoaded]);

  return {
    isLoaded,
    restoredState,
    restoreState,
    saveState,
  };
};

export default useCompetitionSession;
