// @vitest-environment jsdom
/**
 * Tests unitaires - useEventManager
 * BellePoule Modern
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useEventManager } from './useEventManager';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useEventManager - listeners', () => {
  it('ajoute et déclenche un listener', () => {
    const { result } = renderHook(() => useEventManager());
    const handler = vi.fn();
    const el = document.createElement('div');
    result.current.addEventListener(el, 'click', handler);
    el.dispatchEvent(new Event('click'));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('removeEventListener stoppe la réception', () => {
    const { result } = renderHook(() => useEventManager());
    const handler = vi.fn();
    const el = document.createElement('div');
    result.current.addEventListener(el, 'click', handler);
    result.current.removeEventListener(el, 'click', handler);
    el.dispatchEvent(new Event('click'));
    expect(handler).not.toHaveBeenCalled();
  });

  it('cleanup retire tous les listeners', () => {
    const { result } = renderHook(() => useEventManager());
    const handler = vi.fn();
    const el = document.createElement('div');
    result.current.addEventListener(el, 'click', handler);
    result.current.cleanup();
    el.dispatchEvent(new Event('click'));
    expect(handler).not.toHaveBeenCalled();
  });

  it('retire les listeners au démontage', () => {
    const { result, unmount } = renderHook(() => useEventManager());
    const handler = vi.fn();
    const el = document.createElement('div');
    result.current.addEventListener(el, 'click', handler);
    unmount();
    el.dispatchEvent(new Event('click'));
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('useEventManager - timers', () => {
  it('managedSetTimeout exécute après le délai', () => {
    const { result } = renderHook(() => useEventManager());
    const cb = vi.fn();
    result.current.managedSetTimeout(cb, 100);
    vi.advanceTimersByTime(100);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('managedClearTimeout annule le timer', () => {
    const { result } = renderHook(() => useEventManager());
    const cb = vi.fn();
    const id = result.current.managedSetTimeout(cb, 100);
    result.current.managedClearTimeout(id);
    vi.advanceTimersByTime(200);
    expect(cb).not.toHaveBeenCalled();
  });

  it('cleanup annule les intervals en cours', () => {
    const { result } = renderHook(() => useEventManager());
    const cb = vi.fn();
    result.current.managedSetInterval(cb, 50);
    result.current.cleanup();
    vi.advanceTimersByTime(200);
    expect(cb).not.toHaveBeenCalled();
  });

  it('annule les timers au démontage', () => {
    const { result, unmount } = renderHook(() => useEventManager());
    const cb = vi.fn();
    result.current.managedSetTimeout(cb, 100);
    unmount();
    vi.advanceTimersByTime(200);
    expect(cb).not.toHaveBeenCalled();
  });
});
