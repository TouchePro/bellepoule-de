// @vitest-environment jsdom
/**
 * Tests de composant - MultiStripManager
 * BellePoule Modern
 */

import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MultiStripManager } from './MultiStripManager';
import { TranslationProvider } from '../contexts/TranslationContext';

const setup = (stripCount = 3) => {
  const onClose = vi.fn();
  const onMatchAssigned = vi.fn();
  render(
    <TranslationProvider>
      <MultiStripManager
        pools={[]}
        stripCount={stripCount}
        onMatchAssigned={onMatchAssigned}
        onClose={onClose}
      />
    </TranslationProvider>
  );
  return { onClose, onMatchAssigned };
};

describe('MultiStripManager', () => {
  it('affiche le titre avec le nombre de pistes', () => {
    setup(3);
    expect(screen.getByText(/Mehrere Pisten verwalten \(3 Pisten\)/)).toBeInTheDocument();
  });

  it('rend une carte par piste', () => {
    setup(3);
    expect(screen.getByText('Piste 1')).toBeInTheDocument();
    expect(screen.getByText('Piste 2')).toBeInTheDocument();
    expect(screen.getByText('Piste 3')).toBeInTheDocument();
  });

  it('le bouton fermer déclenche onClose', () => {
    const { onClose } = setup();
    fireEvent.click(screen.getByText('×'));
    expect(onClose).toHaveBeenCalled();
  });
});
