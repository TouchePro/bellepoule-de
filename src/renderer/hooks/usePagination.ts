/**
 * BellePoule Modern - Pagination Hook
 * Hook générique de pagination côté client.
 * Licensed under GPL-3.0
 */

import { useState, useMemo, useCallback } from 'react';

export interface UsePaginationOptions {
  defaultPageSize?: number;
  pageSizeOptions?: number[];
}

export interface UsePaginationReturn<T> {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  items: T[];
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  goToFirst: () => void;
  goToLast: () => void;
  goToPrev: () => void;
  goToNext: () => void;
  hasNext: boolean;
  hasPrev: boolean;
  pageSizeOptions: number[];
  startIndex: number;
  endIndex: number;
}

export function usePagination<T>(
  data: T[],
  options: UsePaginationOptions = {}
): UsePaginationReturn<T> {
  const { defaultPageSize = 20, pageSizeOptions = [10, 20, 50, 100] } = options;

  const [page, setPageRaw] = useState(0);
  const [pageSize, setPageSizeRaw] = useState(defaultPageSize);

  const totalItems = data.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Réinitialiser la page si elle dépasse la nouvelle limite
  const setPage = useCallback(
    (p: number) => setPageRaw(Math.max(0, Math.min(p, totalPages - 1))),
    [totalPages]
  );

  const setPageSize = useCallback((size: number) => {
    setPageSizeRaw(size);
    setPageRaw(0);
  }, []);

  const goToFirst = useCallback(() => setPageRaw(0), []);
  const goToLast = useCallback(() => setPageRaw(totalPages - 1), [totalPages]);
  const goToPrev = useCallback(() => setPageRaw(p => Math.max(0, p - 1)), []);
  const goToNext = useCallback(
    () => setPageRaw(p => Math.min(p + 1, totalPages - 1)),
    [totalPages]
  );

  const startIndex = page * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const items = useMemo(() => data.slice(startIndex, endIndex), [data, startIndex, endIndex]);

  return {
    page,
    pageSize,
    totalPages,
    totalItems,
    items,
    setPage,
    setPageSize,
    goToFirst,
    goToLast,
    goToPrev,
    goToNext,
    hasNext: page < totalPages - 1,
    hasPrev: page > 0,
    pageSizeOptions,
    startIndex,
    endIndex,
  };
}

export default usePagination;
