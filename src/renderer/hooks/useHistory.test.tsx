// @vitest-environment jsdom
/**
 * Tests unitaires - useHistory (undo/redo)
 * BellePoule Modern
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHistory } from './useHistory';

const makeAction = (undo = vi.fn(), redo = vi.fn()) => ({
  type: 'UPDATE_SCORE' as const,
  description: 'test',
  undo,
  redo,
});

describe('useHistory', () => {
  it('démarre vide, sans undo/redo possible', () => {
    const { result } = renderHook(() => useHistory());
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.history).toHaveLength(0);
  });

  it('addAction rend l’annulation possible', () => {
    const { result } = renderHook(() => useHistory());
    act(() => result.current.addAction(makeAction()));
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.history).toHaveLength(1);
  });

  it('undo invoque action.undo et redo invoque action.redo', () => {
    const undo = vi.fn();
    const redo = vi.fn();
    const { result } = renderHook(() => useHistory());
    act(() => result.current.addAction(makeAction(undo, redo)));

    act(() => result.current.undo());
    expect(undo).toHaveBeenCalledTimes(1);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);

    act(() => result.current.redo());
    expect(redo).toHaveBeenCalledTimes(1);
    expect(result.current.canRedo).toBe(false);
  });

  it('une nouvelle action après undo écrase le futur (pas de redo)', () => {
    const { result } = renderHook(() => useHistory());
    act(() => result.current.addAction(makeAction()));
    act(() => result.current.undo());
    act(() => result.current.addAction(makeAction()));
    expect(result.current.canRedo).toBe(false);
    expect(result.current.history).toHaveLength(1);
  });

  it('getHistoryInfo reflète les compteurs undo/redo', () => {
    const { result } = renderHook(() => useHistory());
    act(() => result.current.addAction(makeAction()));
    act(() => result.current.addAction(makeAction()));
    act(() => result.current.undo());
    expect(result.current.getHistoryInfo()).toEqual({ undoCount: 1, redoCount: 1 });
  });

  it('clear réinitialise tout', () => {
    const { result } = renderHook(() => useHistory());
    act(() => result.current.addAction(makeAction()));
    act(() => result.current.clear());
    expect(result.current.history).toHaveLength(0);
    expect(result.current.canUndo).toBe(false);
  });

  it('appelle les callbacks onUndo / onRedo', () => {
    const onUndo = vi.fn();
    const onRedo = vi.fn();
    const { result } = renderHook(() => useHistory({ onUndo, onRedo }));
    act(() => result.current.addAction(makeAction()));
    act(() => result.current.undo());
    act(() => result.current.redo());
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onRedo).toHaveBeenCalledTimes(1);
  });
});
