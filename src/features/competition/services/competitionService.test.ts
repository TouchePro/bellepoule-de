// @vitest-environment jsdom
/**
 * Tests unitaires - CompetitionService (CRUD via electronAPI.db mocké)
 * BellePoule Modern
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { CompetitionService } from './competitionService';

const svc = new CompetitionService();

afterEach(() => {
  delete (window as any).electronAPI;
});

describe('garde "Database not available"', () => {
  it('chaque méthode rejette sans electronAPI', async () => {
    await expect(svc.getAll()).rejects.toThrow('Database not available');
    await expect(svc.getById('1')).rejects.toThrow('Database not available');
    await expect(svc.create({} as any)).rejects.toThrow('Database not available');
    await expect(svc.update('1', {} as any)).rejects.toThrow('Database not available');
    await expect(svc.delete('1')).rejects.toThrow('Database not available');
  });
});

describe('délégation à la DB', () => {
  it('getAll / getById relaient les appels DB', async () => {
    const getAllCompetitions = vi.fn(async () => [{ id: 'c1' }]);
    const getCompetition = vi.fn(async () => ({ id: 'c1' }));
    (window as any).electronAPI = { db: { getAllCompetitions, getCompetition } };

    expect(await svc.getAll()).toEqual([{ id: 'c1' }]);
    expect(await svc.getById('c1')).toEqual({ id: 'c1' });
    expect(getCompetition).toHaveBeenCalledWith('c1');
  });

  it('create transmet les champs et settings par défaut {}', async () => {
    const createCompetition = vi.fn(async (d: any) => ({ id: 'new', ...d }));
    (window as any).electronAPI = { db: { createCompetition } };

    const date = new Date('2026-01-02');
    await svc.create({ title: 'T', date, weapon: 'E', gender: 'M', category: 'SENIOR' } as any);

    expect(createCompetition).toHaveBeenCalledTimes(1);
    const arg = createCompetition.mock.calls[0][0];
    expect(arg.title).toBe('T');
    expect(arg.date).toBe(date);
    expect(arg.settings).toEqual({});
  });

  it('create conserve les settings fournis', async () => {
    const createCompetition = vi.fn(async (d: any) => d);
    (window as any).electronAPI = { db: { createCompetition } };
    await svc.create({ title: 'T', settings: { poolRounds: 2 } } as any);
    expect(createCompetition.mock.calls[0][0].settings).toEqual({ poolRounds: 2 });
  });

  it('update appelle updateCompetition et retourne le patch', async () => {
    const updateCompetition = vi.fn(async () => {});
    (window as any).electronAPI = { db: { updateCompetition } };
    const patch = { title: 'New' };
    expect(await svc.update('c1', patch as any)).toEqual(patch);
    expect(updateCompetition).toHaveBeenCalledWith('c1', patch);
  });

  it('delete appelle deleteCompetition', async () => {
    const deleteCompetition = vi.fn(async () => {});
    (window as any).electronAPI = { db: { deleteCompetition } };
    await svc.delete('c1');
    expect(deleteCompetition).toHaveBeenCalledWith('c1');
  });
});
