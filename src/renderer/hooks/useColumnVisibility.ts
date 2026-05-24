import { useState, useCallback, useEffect } from 'react';
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
  label: string;
  labelShort: string;
}

export const POOL_COLUMNS: ColumnDefinition[] = [
  { id: 'victories', label: 'Victoires', labelShort: 'V' },
  { id: 'ratio', label: 'Ratio V/M', labelShort: 'V/M' },
  { id: 'td', label: 'TD (Touches données)', labelShort: 'TD' },
  { id: 'tr', label: 'TR (Touches reçues)', labelShort: 'TR' },
  { id: 'quest', label: 'Quest', labelShort: 'Quest' },
  { id: 'index',  label: 'Indice (TD-TR)', labelShort: 'Ind' },
  { id: 'rank',   label: 'Rang',           labelShort: 'Rg' },
  { id: 'club',   label: 'Club',           labelShort: 'Club' },
  { id: 'nation', label: 'Nation',         labelShort: 'Nat' },
  { id: 'region', label: 'Région',         labelShort: 'Rég' },
];

export const RANKING_COLUMNS: ColumnDefinition[] = [
  { id: 'rank', label: 'Rang', labelShort: 'Rg' },
  { id: 'lastName', label: 'Nom', labelShort: 'Nom' },
  { id: 'firstName', label: 'Prénom', labelShort: 'Prénom' },
  { id: 'club', label: 'Club', labelShort: 'Club' },
  { id: 'victories', label: 'Victoires', labelShort: 'V' },
  { id: 'matches', label: 'Matchs', labelShort: 'M' },
  { id: 'ratio', label: 'Ratio V/M', labelShort: 'V/M' },
  { id: 'td', label: 'TD (Touches données)', labelShort: 'TD' },
  { id: 'tr', label: 'TR (Touches reçues)', labelShort: 'TR' },
  { id: 'quest', label: 'Quest', labelShort: 'Quest' },
  { id: 'index', label: 'Indice (TD-TR)', labelShort: 'Indice' },
];

interface VisibilityState {
  pool: ColumnId[];
  ranking: ColumnId[];
}

const DEFAULT_VISIBILITY: VisibilityState = {
  pool: POOL_COLUMNS.map(c => c.id),
  ranking: RANKING_COLUMNS.map(c => c.id),
};

const loadFromStorage = (): VisibilityState => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        pool: parsed.pool || DEFAULT_VISIBILITY.pool,
        ranking: parsed.ranking || DEFAULT_VISIBILITY.ranking,
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

export const useColumnVisibility = () => {
  const [visibility, setVisibilityState] = useState<VisibilityState>(loadFromStorage);

  useEffect(() => {
    saveToStorage(visibility);
  }, [visibility]);

  const setVisibleColumns = useCallback((type: 'pool' | 'ranking', columns: ColumnId[]) => {
    setVisibilityState(prev => ({
      ...prev,
      [type]: columns,
    }));
  }, []);

  const toggleColumn = useCallback((type: 'pool' | 'ranking', columnId: ColumnId) => {
    setVisibilityState(prev => {
      const current = prev[type];
      const isVisible = current.includes(columnId);
      const newColumns = isVisible ? current.filter(id => id !== columnId) : [...current, columnId];
      return {
        ...prev,
        [type]: newColumns,
      };
    });
  }, []);

  const isColumnVisible = useCallback(
    (type: 'pool' | 'ranking', columnId: ColumnId): boolean => {
      return visibility[type].includes(columnId);
    },
    [visibility]
  );

  const getVisibleColumns = useCallback(
    (type: 'pool' | 'ranking'): ColumnId[] => {
      return visibility[type];
    },
    [visibility]
  );

  const resetToDefaults = useCallback(() => {
    setVisibilityState(DEFAULT_VISIBILITY);
  }, []);

  return {
    visibility,
    setVisibleColumns,
    toggleColumn,
    isColumnVisible,
    getVisibleColumns,
    resetToDefaults,
  };
};
