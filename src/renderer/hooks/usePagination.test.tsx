// @vitest-environment jsdom
/**
 * Tests unitaires - usePagination
 * BellePoule Modern
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePagination } from './usePagination';

const data = Array.from({ length: 45 }, (_, i) => i);

describe('usePagination', () => {
  it('calcule pages et tranche initiale', () => {
    const { result } = renderHook(() => usePagination(data, { defaultPageSize: 20 }));
    expect(result.current.totalItems).toBe(45);
    expect(result.current.totalPages).toBe(3);
    expect(result.current.items).toHaveLength(20);
    expect(result.current.items[0]).toBe(0);
    expect(result.current.hasPrev).toBe(false);
    expect(result.current.hasNext).toBe(true);
  });

  it('navigue next/prev/first/last', () => {
    const { result } = renderHook(() => usePagination(data, { defaultPageSize: 20 }));
    act(() => result.current.goToNext());
    expect(result.current.page).toBe(1);
    expect(result.current.items[0]).toBe(20);

    act(() => result.current.goToLast());
    expect(result.current.page).toBe(2);
    expect(result.current.items).toHaveLength(5); // 45 - 40
    expect(result.current.hasNext).toBe(false);

    act(() => result.current.goToPrev());
    expect(result.current.page).toBe(1);

    act(() => result.current.goToFirst());
    expect(result.current.page).toBe(0);
  });

  it('borne setPage dans [0, totalPages-1]', () => {
    const { result } = renderHook(() => usePagination(data, { defaultPageSize: 20 }));
    act(() => result.current.setPage(99));
    expect(result.current.page).toBe(2);
    act(() => result.current.setPage(-5));
    expect(result.current.page).toBe(0);
  });

  it('setPageSize remet à la première page et recalcule', () => {
    const { result } = renderHook(() => usePagination(data, { defaultPageSize: 20 }));
    act(() => result.current.goToLast());
    act(() => result.current.setPageSize(10));
    expect(result.current.page).toBe(0);
    expect(result.current.totalPages).toBe(5);
    expect(result.current.items).toHaveLength(10);
  });

  it('gère une liste vide (au moins 1 page)', () => {
    const { result } = renderHook(() => usePagination([], {}));
    expect(result.current.totalPages).toBe(1);
    expect(result.current.items).toHaveLength(0);
    expect(result.current.hasNext).toBe(false);
  });

  it('startIndex / endIndex cohérents', () => {
    const { result } = renderHook(() => usePagination(data, { defaultPageSize: 20 }));
    act(() => result.current.goToNext());
    expect(result.current.startIndex).toBe(20);
    expect(result.current.endIndex).toBe(40);
  });
});
