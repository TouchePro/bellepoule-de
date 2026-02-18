/**
 * BellePoule Modern - Offline Hook
 * React hook for offline-first functionality
 * Licensed under GPL-3.0
 */

import { useState, useEffect, useCallback } from 'react';
import { offlineSync } from '../services/offlineSync';
import { offlineStorage } from '../services/offlineStorage';
import { Competition, Fencer, Pool, Match } from '../../shared/types';

export interface UseOfflineResult {
  isOnline: boolean;
  isSyncing: boolean;
  pendingActions: number;
  conflicts: number;
  lastSync: number | null;
  sync: () => Promise<void>;
  refreshCache: (competitionId: string) => Promise<void>;
  cacheData: {
    competitions: Competition[];
    fencers: Fencer[];
    pools: Pool[];
    matches: Match[];
  };
}

export const useOffline = (competitionId?: string): UseOfflineResult => {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState({
    pendingActions: 0,
    conflicts: 0,
    lastSync: null as number | null,
  });
  const [cacheData, setCacheData] = useState<{
    competitions: Competition[];
    fencers: Fencer[];
    pools: Pool[];
    matches: Match[];
  }>({
    competitions: [],
    fencers: [],
    pools: [],
    matches: [],
  });

  // Update status
  const updateStatus = useCallback(async () => {
    setIsOnline(offlineSync.isCurrentlyOnline());
    setIsSyncing(offlineSync.isCurrentlySyncing());
    const status = await offlineStorage.getSyncStatus();
    setSyncStatus(status);
  }, []);

  // Load cached data
  const loadCacheData = useCallback(async () => {
    try {
      const data = await Promise.all([
        competitionId ? offlineStorage.getCachedCompetition(competitionId) : null,
        offlineStorage.getCachedFencers(competitionId),
        offlineStorage.getCachedPools(competitionId),
        offlineStorage.getCachedMatches(competitionId),
      ]);

      setCacheData({
        competitions: data[0] ? [data[0]] : [],
        fencers: data[1],
        pools: data[2],
        matches: data[3],
      });
    } catch (error) {
      console.error('[useOffline] Failed to load cache data:', error);
    }
  }, [competitionId]);

  // Initialize
  useEffect(() => {
    updateStatus();
    loadCacheData();

    // Set up periodic updates
    const interval = setInterval(updateStatus, 5000);

    // Listen for sync completion
    offlineSync.onSyncComplete(() => {
      updateStatus();
      loadCacheData();
    });

    // Network event listeners
    const handleOnline = () => {
      setIsOnline(true);
      updateStatus();
    };

    const handleOffline = () => {
      setIsOnline(false);
      updateStatus();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [updateStatus, loadCacheData]);

  // Manual sync
  const sync = useCallback(async () => {
    if (!isOnline) return;

    await offlineSync.triggerSync();
    await loadCacheData();
  }, [isOnline, loadCacheData]);

  // Refresh cache
  const refreshCache = useCallback(
    async (compId: string) => {
      if (!isOnline) return;

      await offlineSync.refreshCache(compId);
      await loadCacheData();
    },
    [isOnline, loadCacheData]
  );

  return {
    isOnline,
    isSyncing,
    pendingActions: syncStatus.pendingActions,
    conflicts: syncStatus.conflicts,
    lastSync: syncStatus.lastSync,
    sync,
    refreshCache,
    cacheData,
  };
};
