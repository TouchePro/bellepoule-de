// @vitest-environment jsdom
/**
 * Tests de composant - AddFencerToPoolModal
 * BellePoule Modern
 */

import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AddFencerToPoolModal from './AddFencerToPoolModal';
import { TranslationProvider } from '../contexts/TranslationContext';
import { Fencer, Pool, Gender, FencerStatus } from '../../shared/types';

const fencer = (id: string, last: string): Fencer => ({
  id, ref: Number(id), lastName: last, firstName: 'F',
  gender: Gender.MALE, nationality: 'FRA', status: FencerStatus.CHECKED_IN,
  createdAt: new Date(), updatedAt: new Date(),
});

const inPool = fencer('1', 'Dupont');
const free = fencer('2', 'Martin');
const pool: Pool = {
  id: 'p1', number: 1, phaseId: 'ph', fencers: [inPool], matches: [], referees: [],
  isComplete: false, hasError: false, ranking: [],
  createdAt: new Date(), updatedAt: new Date(),
};

beforeEach(() => {
  (window as any).electronAPI = {
    db: {
      getFencersByCompetition: vi.fn(async () => [inPool, free]),
      getPhasesByCompetition: vi.fn(async () => []),
      getPoolFencers: vi.fn(async () => []),
      addFencerToPoolMidCompetition: vi.fn(async () => ({ ...pool, fencers: [inPool, free] })),
    },
  };
});
afterEach(() => { delete (window as any).electronAPI; });

describe('AddFencerToPoolModal', () => {
  it('affiche les tireurs disponibles (hors poule)', async () => {
    render(
      <TranslationProvider>
        <AddFencerToPoolModal pool={pool} competitionId="c1" onConfirm={vi.fn()} onClose={vi.fn()} />
      </TranslationProvider>
    );
    expect(await screen.findByText(/Martin/)).toBeInTheDocument();
    // Dupont est déjà dans la poule → absent de la liste des disponibles
    expect(screen.queryByText(/Dupont/)).not.toBeInTheDocument();
  });

  it('sélectionne un tireur et confirme l’ajout', async () => {
    const onConfirm = vi.fn();
    render(
      <TranslationProvider>
        <AddFencerToPoolModal pool={pool} competitionId="c1" onConfirm={onConfirm} onClose={vi.fn()} />
      </TranslationProvider>
    );
    fireEvent.click(await screen.findByText(/Martin/));
    fireEvent.click(screen.getByText('Fechter hinzufügen'));
    await waitFor(() =>
      expect((window as any).electronAPI.db.addFencerToPoolMidCompetition).toHaveBeenCalledWith('p1', '2', 5)
    );
    await waitFor(() => expect(onConfirm).toHaveBeenCalled());
  });

  it('le bouton ajouter est désactivé sans sélection', async () => {
    render(
      <TranslationProvider>
        <AddFencerToPoolModal pool={pool} competitionId="c1" onConfirm={vi.fn()} onClose={vi.fn()} />
      </TranslationProvider>
    );
    await screen.findByText(/Martin/);
    expect(screen.getByText('Fechter hinzufügen')).toBeDisabled();
  });
});
