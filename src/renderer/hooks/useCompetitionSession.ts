/**
 * BellePoule Modern - Competition Session Hook
 * Gestion de la sauvegarde et restauration de l'état de session
 * Licensed under GPL-3.0
 */

import { useState, useEffect, useCallback } from 'react';
import { Pool, PoolRanking } from '../../shared/types';
import { TableauMatch, FinalResult } from '../components/TableauView';

export type Phase = 'checkin' | 'poolprep' | 'pools' | 'ranking' | 'tableau' | 'results' | 'remote';

interface SessionState {
  currentPhase: number;
  pools: Pool[];
  poolHistory: Pool[][];
  overallRanking: PoolRanking[];
  tableauMatches: TableauMatch[];
  finalResults: FinalResult[];
  currentPoolRound: number;
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
    tableau: 4,
    results: 5,
    remote: 6,
  };

  const numberToPhase: Record<number, Phase> = {
    0: 'checkin',
    1: 'poolprep',
    2: 'pools',
    3: 'ranking',
    4: 'tableau',
    5: 'results',
    6: 'remote',
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
      uiState: {
        currentPhase: props.currentPhase,
        currentPoolRound: props.currentPoolRound,
        pools: props.pools.length,
      },
    };

    try {
      await window.electronAPI.db.saveSessionState(props.competitionId, state);
    } catch (e) {
      console.error('Failed to save session state:', e);
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
        });

        console.log('Session state restored');
      }
    } catch (e) {
      console.error('Failed to restore session state:', e);
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
