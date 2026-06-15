// @vitest-environment jsdom
/**
 * Tests unitaires - OfflineSyncManager
 * BellePoule Modern
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { storage } = vi.hoisted(() => ({
  storage: {
    getPendingActions: vi.fn(async () => [] as any[]),
    removePendingAction: vi.fn(async () => {}),
    incrementRetryCount: vi.fn(async () => {}),
    updateLastSync: vi.fn(async () => {}),
    getConflicts: vi.fn(async () => []),
    getSyncStatus: vi.fn(async () => ({ pendingActions: 0, conflicts: 0, lastSync: null })),
  },
}));
vi.mock('./offlineStorage', () => ({ offlineStorage: storage }));

import { OfflineSyncManager } from './offlineSync';

const mgr = () => new OfflineSyncManager();

beforeEach(() => vi.clearAllMocks());

describe('triggerSync - gardes', () => {
  it('échoue si hors ligne', async () => {
    const m = mgr();
    (m as any).isOnline = false;
    const res = await m.triggerSync();
    expect(res.success).toBe(false);
    expect(res.errors).toContain('Device is offline');
  });

  it('échoue si une synchro est déjà en cours', async () => {
    const m = mgr();
    (m as any).isOnline = true;
    (m as any).syncInProgress = true;
    const res = await m.triggerSync();
    expect(res.success).toBe(false);
    expect(res.errors).toContain('Sync already in progress');
  });
});

describe('triggerSync - succès', () => {
  it('synchronise une file vide et notifie les callbacks', async () => {
    const m = mgr();
    (m as any).isOnline = true;
    const cb = vi.fn();
    m.onSyncComplete(cb);
    const res = await m.triggerSync();
    expect(res.success).toBe(true);
    expect(res.synced).toBe(0);
    expect(storage.updateLastSync).toHaveBeenCalled();
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    expect(m.isCurrentlySyncing()).toBe(false);
  });
});

describe('helpers / état', () => {
  it('isCurrentlyOnline reflète le drapeau interne', () => {
    const m = mgr();
    (m as any).isOnline = false;
    expect(m.isCurrentlyOnline()).toBe(false);
    (m as any).isOnline = true;
    expect(m.isCurrentlyOnline()).toBe(true);
  });

  it('getEntityTypeFromAction déduit le type', () => {
    const m = mgr() as any;
    expect(m.getEntityTypeFromAction('UPDATE_MATCH')).toBe('match');
    expect(m.getEntityTypeFromAction('ADD_FENCER')).toBe('fencer');
    expect(m.getEntityTypeFromAction('CREATE_POOL')).toBe('pool');
    expect(m.getEntityTypeFromAction('INCONNU')).toBe('match'); // fallback
  });

  it('getEntityIdFromAction extrait l’identifiant', () => {
    const m = mgr() as any;
    expect(m.getEntityIdFromAction({ matchId: 'x' })).toBe('x');
    expect(m.getEntityIdFromAction({ fencerId: 'f' })).toBe('f');
    expect(m.getEntityIdFromAction({})).toBe('');
  });
});
