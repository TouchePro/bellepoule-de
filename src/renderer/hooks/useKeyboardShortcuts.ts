/**
 * BellePoule Modern - Keyboard Shortcuts Hook
 * Gestion des raccourcis clavier globaux
 * Licensed under GPL-3.0
 */

import { useEffect, useCallback, useRef } from 'react';
import { logger, LogCategory } from '@shared/services/logger';

export type KeyboardShortcut = {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  description: string;
  action: () => void;
  preventDefault?: boolean;
};

export interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
  target?: HTMLElement | Window | null;
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions) {
  const { shortcuts, enabled = true, target = window } = options;
  const shortcutsRef = useRef(shortcuts);

  // Met à jour la ref quand les shortcuts changent
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Ignore les raccourcis si on est dans un input, textarea, ou select
      const targetElement = event.target as HTMLElement;
      if (
        targetElement.tagName === 'INPUT' ||
        targetElement.tagName === 'TEXTAREA' ||
        targetElement.tagName === 'SELECT' ||
        targetElement.isContentEditable
      ) {
        // Permet quand même certains raccourcis comme Escape
        if (event.key !== 'Escape') {
          return;
        }
      }

      const { key, ctrlKey, shiftKey, altKey, metaKey } = event;

      for (const shortcut of shortcutsRef.current) {
        const matchesKey = key.toLowerCase() === shortcut.key.toLowerCase();
        const matchesCtrl = !!shortcut.ctrl === ctrlKey;
        const matchesShift = !!shortcut.shift === shiftKey;
        const matchesAlt = !!shortcut.alt === altKey;
        const matchesMeta = !!shortcut.meta === metaKey;

        if (matchesKey && matchesCtrl && matchesShift && matchesAlt && matchesMeta) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }

          try {
            shortcut.action();
          } catch (error) {
            logger.error(
              LogCategory.UI,
              `Erreur lors de l'exécution du raccourci ${shortcut.description}`,
              error as Error
            );
          }
          break;
        }
      }
    },
    [enabled]
  );

  useEffect(() => {
    if (!target) return;

    const eventTarget = target as Window;
    const handler = handleKeyDown as EventListener;
    eventTarget.addEventListener('keydown', handler);
    return () => {
      eventTarget.removeEventListener('keydown', handler);
    };
  }, [target, handleKeyDown]);
}

export default useKeyboardShortcuts;
