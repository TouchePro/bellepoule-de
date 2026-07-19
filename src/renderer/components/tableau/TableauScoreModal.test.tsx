// @vitest-environment jsdom
/**
 * Tests de composant - TableauScoreModal
 * BellePoule Modern
 */

import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TableauScoreModal from './TableauScoreModal';
import { TranslationProvider } from '../../contexts/TranslationContext';

const match = {
  id: 'm1', round: 8,
  fencerA: { id: 'a', lastName: 'Dupont', firstName: 'Jean' },
  fencerB: { id: 'b', lastName: 'Martin', firstName: 'Marie' },
} as any;

const setup = (over: Partial<Record<string, any>> = {}) => {
  const props = {
    match,
    editScoreA: '',
    setEditScoreA: vi.fn(),
    editScoreB: '',
    setEditScoreB: vi.fn(),
    maxScore: 15,
    isUnlimitedScore: false,
    modalRef: React.createRef<HTMLDivElement>(),
    onClose: vi.fn(),
    onSubmit: vi.fn(),
    onSpecialStatus: vi.fn(),
    getRoundName: (r: number) => `Tour ${r}`,
    ...over,
  };
  const utils = render(
    <TranslationProvider>
      <TableauScoreModal {...(props as any)} />
    </TranslationProvider>
  );
  return { props, utils };
};

describe('TableauScoreModal', () => {
  it('affiche le nom du tour et les tireurs', () => {
    setup();
    expect(screen.getByText('Tour 8 - Schnelleingabe')).toBeInTheDocument();
    expect(screen.getByText(/Dupont/)).toBeInTheDocument();
    expect(screen.getByText(/Martin/)).toBeInTheDocument();
  });

  it('saisir un score appelle setEditScoreA', () => {
    const { props, utils } = setup();
    const inputs = utils.container.querySelectorAll('input[type="number"]');
    fireEvent.change(inputs[0], { target: { value: '15' } });
    expect(props.setEditScoreA).toHaveBeenCalledWith('15');
  });

  it('Valider déclenche onSubmit', () => {
    const { props } = setup();
    fireEvent.click(screen.getByText('Validieren'));
    expect(props.onSubmit).toHaveBeenCalledTimes(1);
  });
});
