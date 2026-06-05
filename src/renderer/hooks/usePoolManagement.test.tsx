// @vitest-environment jsdom
/**
 * Tests unitaires - usePoolManagement
 * BellePoule Modern
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePoolManagement } from './usePoolManagement';
import { Fencer, Pool, Match, MatchStatus, Gender, FencerStatus } from '../../shared/types';

const fencer = (id: number): Fencer => ({
  id: String(id), ref: id, lastName: 'L' + id, firstName: 'F',
  gender: Gender.MALE, nationality: 'FRA', status: FencerStatus.CHECKED_IN,
  createdAt: new Date(), updatedAt: new Date(),
});

let showToast: ReturnType<typeof vi.fn>;
beforeEach(() => { showToast = vi.fn(); });

const setup = () =>
  renderHook(() =>
    usePoolManagement({ isLaserSabre: false, poolMaxScore: 5, showToast: showToast as any })
  ).result;

describe('generatePools', () => {
  it('refuse moins de 4 tireurs', () => {
    const r = setup();
    let res: Pool[] | null = [];
    act(() => { res = r.current.generatePools([fencer(1), fencer(2)]); });
    expect(res).toBeNull();
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('4 tireurs'), 'warning');
  });

  it('génère des poules avec matchs pour 8 tireurs', () => {
    const r = setup();
    const fencers = Array.from({ length: 8 }, (_, i) => fencer(i + 1));
    let res: Pool[] | null = null;
    act(() => { res = r.current.generatePools(fencers); });
    expect(res).not.toBeNull();
    expect(r.current.pools.length).toBeGreaterThan(0);
    // tous les tireurs répartis
    const total = r.current.pools.reduce((n, p) => n + p.fencers.length, 0);
    expect(total).toBe(8);
    // chaque poule a des matchs
    expect(r.current.pools.every(p => p.matches.length > 0)).toBe(true);
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('poules créées'), 'success');
  });
});

describe('areAllPoolsComplete', () => {
  const poolWith = (status: MatchStatus): Pool => ({
    id: 'p1', number: 1, phaseId: 'ph', fencers: [fencer(1), fencer(2)],
    matches: [{
      id: 'm', number: 1, fencerA: fencer(1), fencerB: fencer(2),
      scoreA: null, scoreB: null, maxScore: 5, status,
      createdAt: new Date(), updatedAt: new Date(),
    } as Match],
    referees: [], isComplete: false, hasError: false, ranking: [],
    createdAt: new Date(), updatedAt: new Date(),
  });

  it('faux si un match n’est pas terminé', () => {
    const r = setup();
    act(() => r.current.setPools([poolWith(MatchStatus.NOT_STARTED)]));
    expect(r.current.areAllPoolsComplete()).toBe(false);
  });

  it('vrai si tous les matchs sont terminés', () => {
    const r = setup();
    act(() => r.current.setPools([poolWith(MatchStatus.FINISHED)]));
    expect(r.current.areAllPoolsComplete()).toBe(true);
  });
});

describe('computePoolRanking', () => {
  it('retourne un classement (tableau)', () => {
    const r = setup();
    const pool = poolFixture();
    const ranking = r.current.computePoolRanking(pool);
    expect(Array.isArray(ranking)).toBe(true);
  });
});

function poolFixture(): Pool {
  return {
    id: 'p1', number: 1, phaseId: 'ph', fencers: [fencer(1), fencer(2)],
    matches: [], referees: [], isComplete: false, hasError: false, ranking: [],
    createdAt: new Date(), updatedAt: new Date(),
  };
}
