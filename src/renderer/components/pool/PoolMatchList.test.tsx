// @vitest-environment jsdom
/**
 * Tests de composant - PoolMatchList
 * BellePoule Modern
 */

import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PoolMatchList from './PoolMatchList';
import { Fencer, Match, MatchStatus, Gender, FencerStatus } from '../../../shared/types';

const fencer = (id: string, last: string): Fencer => ({
  id, ref: Number(id), lastName: last, firstName: 'Prenom',
  gender: Gender.MALE, nationality: 'FRA', status: FencerStatus.CHECKED_IN,
  createdAt: new Date(), updatedAt: new Date(),
});

const pending = (a: Fencer, b: Fencer, index: number) => ({
  index,
  match: {
    id: `m${index}`, number: index + 1, fencerA: a, fencerB: b,
    scoreA: null, scoreB: null, maxScore: 5, status: MatchStatus.NOT_STARTED,
    createdAt: new Date(), updatedAt: new Date(),
  } as Match,
});

const renderList = (orderedMatches: any, over: Partial<Record<string, any>> = {}) => {
  const props = {
    orderedMatches,
    isLaserSabre: false,
    isLocked: false,
    openScoreModal: vi.fn(),
    ...over,
  };
  render(<PoolMatchList {...(props as any)} />);
  return props;
};

const f1 = fencer('1', 'Dupont');
const f2 = fencer('2', 'Martin');
const f3 = fencer('3', 'Bernard');

describe('PoolMatchList', () => {
  it('affiche le prochain match et déclenche openScoreModal', () => {
    const props = renderList({ pending: [pending(f1, f2, 0)], finished: [], cancelled: [] });
    expect(screen.getByText('⚔️ Prochain match')).toBeInTheDocument();
    expect(screen.getByText('Dupont')).toBeInTheDocument();
    expect(screen.getByText('Martin')).toBeInTheDocument();
    fireEvent.click(screen.getByText('🎯 Saisir le score'));
    expect(props.openScoreModal).toHaveBeenCalledWith(0);
  });

  it('affiche la section « Matches à venir » quand il en reste plusieurs', () => {
    renderList({
      pending: [pending(f1, f2, 0), pending(f1, f3, 1), pending(f2, f3, 2)],
      finished: [],
      cancelled: [],
    });
    expect(screen.getByText(/Matches à venir \(2\)/)).toBeInTheDocument();
  });

  it('affiche « Poule terminée » sans match en attente', () => {
    renderList({ pending: [], finished: [], cancelled: [] });
    expect(screen.getByText('Poule terminée !')).toBeInTheDocument();
  });
});
