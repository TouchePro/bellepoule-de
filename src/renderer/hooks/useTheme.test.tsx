// @vitest-environment jsdom
/**
 * Tests unitaires - useTheme
 * BellePoule Modern
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTheme } from './useTheme';

// jsdom n'implémente pas matchMedia → on le simule (clair par défaut)
beforeEach(() => {
  localStorage.clear();
  document.body.className = '';
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: false,
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
});

describe('useTheme', () => {
  it('par défaut "default" sans classe de thème', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('default');
    expect(document.body.classList.contains('theme-dark')).toBe(false);
  });

  it('setTheme applique la classe et persiste', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme('dark'));
    expect(result.current.theme).toBe('dark');
    expect(result.current.isDark).toBe(true);
    expect(document.body.classList.contains('theme-dark')).toBe(true);
    expect(localStorage.getItem('bellepoule-theme')).toBe('dark');
  });

  it('passer à "default" retire les classes de thème', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme('light'));
    expect(document.body.classList.contains('theme-light')).toBe(true);
    act(() => result.current.setTheme('default'));
    expect(document.body.classList.contains('theme-light')).toBe(false);
    expect(document.body.classList.contains('theme-default')).toBe(false);
  });

  it('toggleTheme bascule dark/light', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme('dark'));
    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe('light');
    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe('dark');
  });

  it('charge le thème sauvegardé au montage', () => {
    localStorage.setItem('bellepoule-theme', 'dark');
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
    expect(document.body.classList.contains('theme-dark')).toBe(true);
  });

  it('isLight vrai en mode clair', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setTheme('light'));
    expect(result.current.isLight).toBe(true);
  });

  it('expose 3 thèmes disponibles', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.availableThemes.map(t => t.code)).toEqual(['default', 'light', 'dark']);
  });
});
