import { useCallback, useSyncExternalStore } from 'react';
import { logger, LogCategory } from '@shared/services/logger';

const STORAGE_KEY = 'bellepoule_column_visibility';

export type ColumnId =
  | 'victories'
  | 'matches'
  | 'ratio'
  | 'td'
  | 'tr'
  | 'quest'
  | 'index'
  | 'rank'
  | 'firstName'
  | 'lastName'
  | 'club'
  | 'nation'
  | 'region';

export interface ColumnDefinition {
  id: ColumnId;
  labelKey: string;
  labelShort: string;
}

export const POOL_COLUMNS: ColumnDefinition[] = [
  { id: 'victories', labelKey: 'columns.victories', labelShort: 'V' },
  { id: 'ratio', labelKey: 'columns.ratio', labelShort: 'V/M' },
  { id: 'td', labelKey: 'columns.td', labelShort: 'TD' },
  { id: 'tr', labelKey: 'columns.tr', labelShort: 'TR' },
  { id: 'quest', labelKey: 'columns.quest', labelShort: 'Quest' },
  { id: 'index', labelKey: 'columns.index', labelShort: 'Ind' },
  { id: 'rank', labelKey: 'columns.rank', labelShort: 'Rg' },
  { id: 'club', labelKey: 'columns.club', labelShort: 'Club' },
  { id: 'nation', labelKey: 'columns.nation', labelShort: 'Nat' },
  { id: 'region', labelKey: 'columns.region', labelShort: 'Rég' },
];

export const RANKING_COLUMNS: ColumnDefinition[] = [
  { id: 'rank', labelKey: 'columns.rank', labelShort: 'Rg' },
  { id: 'lastName', labelKey: 'columns.lastName', labelShort: 'Nom' },
  { id: 'firstName', labelKey: 'columns.firstName', labelShort: 'Prénom' },
  { id: 'club', labelKey: 'columns.club', labelShort: 'Club' },
  { id: 'victories', labelKey: 'columns.victories', labelShort: 'V' },
  { id: 'matches', labelKey: 'columns.matches', labelShort: 'M' },
  { id: 'ratio', labelKey: 'columns.ratio', labelShort: 'V/M' },
  { id: 'td', labelKey: 'columns.td', labelShort: 'TD' },
  { id: 'tr', labelKey: 'columns.tr', labelShort: 'TR' },
  { id: 'quest', labelKey: 'columns.quest', labelShort: 'Quest' },
  { id: 'index', labelKey: 'columns.index', labelShort: 'Indice' },
];

interface VisibilityState {
  pool: ColumnId[]; // défaut global appliqué aux poules sans réglage propre
  ranking: ColumnId[];
  pools: Record<string, ColumnId[]>; // réglages indépendants par poule (clé = pool.id)
}

const DEFAULT_VISIBILITY: VisibilityState = {
  pool: POOL_COLUMNS.map(c => c.id),
  ranking: RANKING_COLUMNS.map(c => c.id),
  pools: {},
};

const loadFromStorage = (): VisibilityState => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        pool: parsed.pool || DEFAULT_VISIBILITY.pool,
        ranking: parsed.ranking || DEFAULT_VISIBILITY.ranking,
        pools: parsed.pools || {},
      };
    }
  } catch (e) {
    logger.error(LogCategory.UI, 'Failed to load column visibility', e as Error);
  }
  return DEFAULT_VISIBILITY;
};

const saveToStorage = (state: VisibilityState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    logger.error(LogCategory.UI, 'Failed to save column visibility', e as Error);
  }
};

// Store externe partagé : toutes les instances du hook lisent/écrivent le même état global.
let currentState: VisibilityState = loadFromStorage();
const listeners = new Set<() => void>();

const getSnapshot = (): VisibilityState => currentState;

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const setState = (updater: (prev: VisibilityState) => VisibilityState): void => {
  currentState = updater(currentState);
  saveToStorage(currentState);
  listeners.forEach(l => l());
};

export const useColumnVisibility = () => {
  const visibility = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setVisibleColumns = useCallback((type: 'pool' | 'ranking', columns: ColumnId[]) => {
    setState(prev => ({
      ...prev,
      [type]: columns,
    }));
  }, []);

  // poolId optionnel : si fourni, le réglage est propre à cette poule (indépendance).
  const toggleColumn = useCallback(
    (type: 'pool' | 'ranking', columnId: ColumnId, poolId?: string) => {
      setState(prev => {
        if (type === 'pool' && poolId) {
          const current = prev.pools[poolId] ?? prev.pool;
          const isVisible = current.includes(columnId);
          const newColumns = isVisible
            ? current.filter(id => id !== columnId)
            : [...current, columnId];
          return {
            ...prev,
            pools: { ...prev.pools, [poolId]: newColumns },
          };
        }
        const current = prev[type];
        const isVisible = current.includes(columnId);
        const newColumns = isVisible
          ? current.filter(id => id !== columnId)
          : [...current, columnId];
        return {
          ...prev,
          [type]: newColumns,
        };
      });
    },
    []
  );

  // Bouton global : applique le choix à toutes les poules et efface les réglages propres.
  const setAllPoolColumns = useCallback((columns: ColumnId[]) => {
    setState(prev => ({
      ...prev,
      pool: columns,
      pools: {},
    }));
  }, []);

  const isColumnVisible = useCallback(
    (type: 'pool' | 'ranking', columnId: ColumnId, poolId?: string): boolean => {
      if (type === 'pool' && poolId && visibility.pools[poolId]) {
        return visibility.pools[poolId].includes(columnId);
      }
      return visibility[type].includes(columnId);
    },
    [visibility]
  );

  const getVisibleColumns = useCallback(
    (type: 'pool' | 'ranking', poolId?: string): ColumnId[] => {
      if (type === 'pool' && poolId && visibility.pools[poolId]) {
        return visibility.pools[poolId];
      }
      return visibility[type];
    },
    [visibility]
  );

  const resetToDefaults = useCallback(() => {
    setState(() => DEFAULT_VISIBILITY);
  }, []);

  return {
    visibility,
    setVisibleColumns,
    toggleColumn,
    setAllPoolColumns,
    isColumnVisible,
    getVisibleColumns,
    resetToDefaults,
  };
};
