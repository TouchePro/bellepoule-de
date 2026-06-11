/**
 * BellePoule Modern - Storage localStorage à écriture différée pour zustand/persist
 * Évite un JSON.stringify de tout le state à chaque action sur les stores
 * très sollicités (saisie de scores, cartons). La DB reste la source de vérité ;
 * ce cache ne sert qu'à la réhydratation de l'UI.
 * Licensed under GPL-3.0
 */

import { PersistStorage, StorageValue } from 'zustand/middleware';

export function createDebouncedJSONStorage<S>(delayMs = 500): PersistStorage<S> {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const pending = new Map<string, StorageValue<S>>();

  const flush = (name: string): void => {
    const value = pending.get(name);
    if (value === undefined) return;
    pending.delete(name);
    try {
      localStorage.setItem(name, JSON.stringify(value));
    } catch {
      /* quota plein ou stockage indisponible : l'état reste en mémoire */
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      for (const [name, timer] of timers) {
        clearTimeout(timer);
        flush(name);
      }
      timers.clear();
    });
  }

  return {
    getItem: name => {
      // Une écriture en attente est plus fraîche que le localStorage.
      const queued = pending.get(name);
      if (queued !== undefined) return queued;
      const raw = localStorage.getItem(name);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as StorageValue<S>;
      } catch {
        return null;
      }
    },
    setItem: (name, value) => {
      pending.set(name, value);
      const existing = timers.get(name);
      if (existing) clearTimeout(existing);
      timers.set(
        name,
        setTimeout(() => {
          timers.delete(name);
          flush(name);
        }, delayMs)
      );
    },
    removeItem: name => {
      const timer = timers.get(name);
      if (timer) clearTimeout(timer);
      timers.delete(name);
      pending.delete(name);
      localStorage.removeItem(name);
    },
  };
}
