/**
 * BellePoule Modern - Electron DB Abstraction Hook
 * Centralise tous les appels window.electronAPI.db.* avec gestion d'erreurs uniforme.
 * Licensed under GPL-3.0
 */

import { useCallback } from 'react';
import { logger, LogCategory } from '@shared/services/logger';
import type {
  DatabaseAPI,
  CompetitionCreateData,
  CompetitionUpdateData,
  FencerCreateData,
  FencerUpdateData,
  MatchCreateData,
  MatchUpdateData,
  MatchTouchData,
  MatchCardData,
  MatchTimingData,
  SessionState,
} from '@shared/types/preload';
import type { Competition, Fencer, Match, Pool } from '@shared/types';

// ── Erreur explicite quand l'API n'est pas disponible ───────────────────────

class ElectronAPIUnavailableError extends Error {
  constructor(method: string) {
    super(`window.electronAPI.db.${method} n'est pas disponible`);
    this.name = 'ElectronAPIUnavailableError';
  }
}

function assertDB<K extends keyof DatabaseAPI>(method: K): DatabaseAPI[K] {
  const fn = window.electronAPI?.db?.[method];
  if (typeof fn !== 'function') throw new ElectronAPIUnavailableError(method as string);
  return fn as DatabaseAPI[K];
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useElectronDB() {
  // Competitions
  const getAllCompetitions = useCallback(async (): Promise<Competition[]> => {
    try {
      return await assertDB('getAllCompetitions')();
    } catch (err) {
      logger.error(LogCategory.DATABASE, 'getAllCompetitions failed', err as Error);
      throw err;
    }
  }, []);

  const getCompetition = useCallback(async (id: string): Promise<Competition | null> => {
    try {
      return await assertDB('getCompetition')(id);
    } catch (err) {
      logger.error(LogCategory.DATABASE, `getCompetition(${id}) failed`, err as Error);
      throw err;
    }
  }, []);

  const createCompetition = useCallback(
    async (data: CompetitionCreateData): Promise<Competition> => {
      try {
        return await assertDB('createCompetition')(data);
      } catch (err) {
        logger.error(LogCategory.DATABASE, 'createCompetition failed', err as Error);
        throw err;
      }
    },
    []
  );

  const updateCompetition = useCallback(
    async (id: string, updates: CompetitionUpdateData): Promise<void> => {
      try {
        await assertDB('updateCompetition')(id, updates);
      } catch (err) {
        logger.error(LogCategory.DATABASE, `updateCompetition(${id}) failed`, err as Error);
        throw err;
      }
    },
    []
  );

  const deleteCompetition = useCallback(async (id: string): Promise<void> => {
    try {
      await assertDB('deleteCompetition')(id);
    } catch (err) {
      logger.error(LogCategory.DATABASE, `deleteCompetition(${id}) failed`, err as Error);
      throw err;
    }
  }, []);

  // Fencers
  const getFencersByCompetition = useCallback(async (competitionId: string): Promise<Fencer[]> => {
    try {
      return await assertDB('getFencersByCompetition')(competitionId);
    } catch (err) {
      logger.error(
        LogCategory.DATABASE,
        `getFencersByCompetition(${competitionId}) failed`,
        err as Error
      );
      throw err;
    }
  }, []);

  const addFencer = useCallback(
    async (competitionId: string, fencer: FencerCreateData): Promise<Fencer> => {
      try {
        return await assertDB('addFencer')(competitionId, fencer);
      } catch (err) {
        logger.error(LogCategory.DATABASE, 'addFencer failed', err as Error);
        throw err;
      }
    },
    []
  );

  const updateFencer = useCallback(async (id: string, updates: FencerUpdateData): Promise<void> => {
    try {
      await assertDB('updateFencer')(id, updates);
    } catch (err) {
      logger.error(LogCategory.DATABASE, `updateFencer(${id}) failed`, err as Error);
      throw err;
    }
  }, []);

  const deleteFencer = useCallback(async (id: string): Promise<void> => {
    try {
      await assertDB('deleteFencer')(id);
    } catch (err) {
      logger.error(LogCategory.DATABASE, `deleteFencer(${id}) failed`, err as Error);
      throw err;
    }
  }, []);

  const deleteAllFencers = useCallback(async (competitionId: string): Promise<void> => {
    try {
      await assertDB('deleteAllFencers')(competitionId);
    } catch (err) {
      logger.error(LogCategory.DATABASE, `deleteAllFencers(${competitionId}) failed`, err as Error);
      throw err;
    }
  }, []);

  // Matches
  const updateMatch = useCallback(async (id: string, updates: MatchUpdateData): Promise<void> => {
    try {
      await assertDB('updateMatch')(id, updates);
    } catch (err) {
      logger.error(LogCategory.DATABASE, `updateMatch(${id}) failed`, err as Error);
      throw err;
    }
  }, []);

  const getMatchesByPool = useCallback(async (poolId: string): Promise<Match[]> => {
    try {
      return await assertDB('getMatchesByPool')(poolId);
    } catch (err) {
      logger.error(LogCategory.DATABASE, `getMatchesByPool(${poolId}) failed`, err as Error);
      throw err;
    }
  }, []);

  // Pools
  const updatePool = useCallback(async (pool: Pool): Promise<void> => {
    try {
      await assertDB('updatePool')(pool);
    } catch (err) {
      logger.error(LogCategory.DATABASE, `updatePool(${pool.id}) failed`, err as Error);
      throw err;
    }
  }, []);

  // Session state
  const saveSessionState = useCallback(
    async (competitionId: string, state: SessionState): Promise<void> => {
      try {
        await assertDB('saveSessionState')(competitionId, state);
      } catch (err) {
        logger.error(LogCategory.DATABASE, 'saveSessionState failed', err as Error);
        throw err;
      }
    },
    []
  );

  const getSessionState = useCallback(
    async (competitionId: string): Promise<SessionState | null> => {
      try {
        return await assertDB('getSessionState')(competitionId);
      } catch (err) {
        logger.error(LogCategory.DATABASE, 'getSessionState failed', err as Error);
        throw err;
      }
    },
    []
  );

  // Stats
  const saveTouch = useCallback(async (touch: MatchTouchData): Promise<void> => {
    try {
      await assertDB('saveTouch')(touch);
    } catch (err) {
      logger.error(LogCategory.DATABASE, 'saveTouch failed', err as Error);
      throw err;
    }
  }, []);

  const saveCard = useCallback(async (card: MatchCardData): Promise<void> => {
    try {
      await assertDB('saveCard')(card);
    } catch (err) {
      logger.error(LogCategory.DATABASE, 'saveCard failed', err as Error);
      throw err;
    }
  }, []);

  return {
    getAllCompetitions,
    getCompetition,
    createCompetition,
    updateCompetition,
    deleteCompetition,
    getFencersByCompetition,
    addFencer,
    updateFencer,
    deleteFencer,
    deleteAllFencers,
    updateMatch,
    getMatchesByPool,
    updatePool,
    saveSessionState,
    getSessionState,
    saveTouch,
    saveCard,
  };
}

export default useElectronDB;
