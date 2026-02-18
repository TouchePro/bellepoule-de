/**
 * BellePoule Modern - Modal Resize Hook
 * Licensed under GPL-3.0
 */

import { useEffect, useRef, useState } from 'react';

interface UseModalResizeOptions {
  defaultWidth?: number;
  defaultHeight?: number;
  minWidth?: number;
  minHeight?: number;
}

export const useModalResize = (options: UseModalResizeOptions = {}) => {
  const { defaultWidth = 600, defaultHeight = 400, minWidth = 400, minHeight = 300 } = options;

  const modalRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({
    width: defaultWidth,
    height: defaultHeight,
  });
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;

    // Restaurer les dimensions sauvegardées
    const savedWidth = localStorage.getItem('modal-score-width');
    const savedHeight = localStorage.getItem('modal-score-height');

    const width = savedWidth ? parseInt(savedWidth, 10) : defaultWidth;
    const height = savedHeight ? parseInt(savedHeight, 10) : defaultHeight;

    setDimensions({ width, height });

    // Appliquer les dimensions initiales
    requestAnimationFrame(() => {
      modal.style.width = `${width}px`;
      modal.style.height = `${height}px`;
    });
  }, [defaultWidth, defaultHeight]);

  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;

    // Observer les changements de taille
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });

        // Sauvegarder les dimensions
        localStorage.setItem('modal-score-width', width.toString());
        localStorage.setItem('modal-score-height', height.toString());
      }
    });

    resizeObserver.observe(modal);

    // Gérer le début et la fin du redimensionnement
    const handleMouseDown = (e: MouseEvent) => {
      if (!modal) return;

      const rect = modal.getBoundingClientRect();
      const isNearBottom = e.clientY > rect.bottom - 10 && e.clientY < rect.bottom + 10;
      const isNearRight = e.clientX > rect.right - 10 && e.clientX < rect.right + 10;

      if (isNearBottom || isNearRight) {
        setIsResizing(true);
        modal.classList.add('resizing');
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      if (modal) {
        modal.classList.remove('resizing');
      }
    };

    modal.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      resizeObserver.disconnect();
      modal.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return {
    modalRef,
    dimensions,
    isResizing,
    setIsResizing,
  };
};
