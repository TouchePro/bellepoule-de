import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DatabaseManager } from './index';
import { ValidationError } from './validation';

vi.mock('sql.js', () => ({
  default: vi.fn().mockResolvedValue({
    Database: vi.fn().mockImplementation(() => ({
      run: vi.fn(),
      exec: vi.fn(),
      prepare: vi.fn().mockReturnValue({
        run: vi.fn(),
        step: vi.fn().mockReturnValue(false),
        getAsObject: vi.fn().mockReturnValue({}),
        bind: vi.fn(),
        free: vi.fn(),
      }),
      export: vi.fn().mockReturnValue(new Uint8Array()),
      close: vi.fn(),
    })),
  }),
}));

vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(false),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn().mockReturnValue(Buffer.from([])),
  writeFileSync: vi.fn(),
  renameSync: vi.fn(),
  unlinkSync: vi.fn(),
}));

vi.mock('./migrations', () => ({
  MigrationManager: vi.fn().mockImplementation(() => ({
    run: vi.fn(),
  })),
}));

vi.mock('./migrations/migrations', () => ({
  ALL_MIGRATIONS: [],
}));

interface MockStmt {
  run: ReturnType<typeof vi.fn>;
  step: ReturnType<typeof vi.fn>;
  getAsObject: ReturnType<typeof vi.fn>;
  bind: ReturnType<typeof vi.fn>;
  free: ReturnType<typeof vi.fn>;
}

const makeStmt = (overrides: Partial<MockStmt> = {}): MockStmt => ({
  run: vi.fn(),
  step: vi.fn().mockReturnValue(false),
  getAsObject: vi.fn().mockReturnValue({}),
  bind: vi.fn(),
  free: vi.fn(),
  ...overrides,
});

describe('DatabaseManager', () => {
  let manager: DatabaseManager;
  let mockDb: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const initSqlJs = (await import('sql.js')).default as any;
    const sqlModule = await initSqlJs();
    mockDb = {
      run: vi.fn(),
      exec: vi.fn(),
      prepare: vi.fn().mockReturnValue(makeStmt()),
      export: vi.fn().mockReturnValue(new Uint8Array()),
      close: vi.fn(),
    };
    sqlModule.Database.mockImplementation(() => mockDb);
    manager = new DatabaseManager('/tmp/test-bellepoule.db');
  });

  describe('initialize (open)', () => {
    it('appelle initSqlJs et crée une Database', async () => {
      const initSqlJs = (await import('sql.js')).default as any;
      await manager.open();
      expect(initSqlJs).toHaveBeenCalled();
    });

    it('lance runMigrations après ouverture', async () => {
      const { MigrationManager } = await import('./migrations');
      await manager.open();
      expect(MigrationManager).toHaveBeenCalled();
    });

    it('isOpen() retourne true après open()', async () => {
      await manager.open();
      expect(manager.isOpen()).toBe(true);
    });

    it('isOpen() retourne false avant open()', () => {
      expect(manager.isOpen()).toBe(false);
    });
  });

  describe('createCompetition', () => {
    beforeEach(async () => {
      await manager.open();
    });

    it('insère une compétition et retourne un objet avec id', () => {
      const now = new Date().toISOString();
      const compRow = {
        id: 'comp-uuid-1',
        title: 'Championnat Test',
        short_title: null,
        date: now,
        location: 'Paris',
        organizer: null,
        weapon: 'E',
        gender: 'M',
        category: 'SEN',
        championship: null,
        color: '#3B82F6',
        current_phase_index: 0,
        is_team_event: 0,
        status: 'active',
        settings: '{}',
        created_at: now,
        updated_at: now,
      };
      const stmtGet = makeStmt({
        step: vi.fn().mockReturnValue(true),
        getAsObject: vi.fn().mockReturnValue(compRow),
      });
      mockDb.prepare.mockReturnValue(stmtGet);

      const result = manager.createCompetition({ title: 'Championnat Test', location: 'Paris' });

      expect(mockDb.run).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });

    it('utilise un id fourni si présent', () => {
      const customId = 'my-custom-id';
      const now = new Date().toISOString();
      const compRow = {
        id: customId,
        title: 'Test',
        short_title: null,
        date: now,
        location: '',
        organizer: null,
        weapon: 'E',
        gender: 'M',
        category: 'SEN',
        championship: null,
        color: '#3B82F6',
        current_phase_index: 0,
        is_team_event: 0,
        status: null,
        settings: '{}',
        created_at: now,
        updated_at: now,
      };
      mockDb.prepare.mockReturnValue(
        makeStmt({
          step: vi.fn().mockReturnValue(true),
          getAsObject: vi.fn().mockReturnValue(compRow),
        })
      );

      const result = manager.createCompetition({ id: customId });
      expect(result.id).toBe(customId);
    });
  });

  describe('getFencer', () => {
    beforeEach(async () => {
      await manager.open();
    });

    it('retourne null si le tireur n\'est pas trouvé', () => {
      mockDb.prepare.mockReturnValue(makeStmt({ step: vi.fn().mockReturnValue(false) }));
      const result = manager.getFencer('nonexistent-id');
      expect(result).toBeNull();
    });

    it('retourne un objet Fencer si trouvé', () => {
      const now = new Date().toISOString();
      const fencerRow = {
        id: 'fencer-1',
        ref: 1,
        last_name: 'Dupont',
        first_name: 'Jean',
        birth_date: null,
        gender: 'M',
        nationality: 'FRA',
        region: null,
        club: 'Club Paris',
        license: '12345',
        ranking: 10,
        status: 'Q',
        seed_number: null,
        final_ranking: null,
        pool_stats: null,
        photo: null,
        created_at: now,
        updated_at: now,
      };
      mockDb.prepare.mockReturnValue(
        makeStmt({
          step: vi.fn().mockReturnValue(true),
          getAsObject: vi.fn().mockReturnValue(fencerRow),
        })
      );

      const result = manager.getFencer('fencer-1');
      expect(result).not.toBeNull();
      expect(result!.lastName).toBe('Dupont');
      expect(result!.firstName).toBe('Jean');
    });
  });

  describe('createMatch', () => {
    beforeEach(async () => {
      await manager.open();
    });

    it('insère un match avec les champs requis', () => {
      const now = new Date().toISOString();
      const matchRow = {
        id: 'match-uuid-1',
        number: 1,
        pool_id: 'pool-1',
        fencer_a_id: null,
        fencer_b_id: null,
        score_a: null,
        score_b: null,
        max_score: 5,
        status: 'not_started',
        table_id: null,
        round: null,
        created_at: now,
        updated_at: now,
      };
      const stmtGetMatch = makeStmt({
        step: vi.fn().mockReturnValue(true),
        getAsObject: vi.fn().mockReturnValue(matchRow),
      });
      mockDb.prepare.mockReturnValue(stmtGetMatch);

      const result = manager.createMatch({ number: 1, maxScore: 5 }, 'pool-1');

      expect(mockDb.run).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });
  });

  describe('updateMatch', () => {
    beforeEach(async () => {
      await manager.open();
    });

    it('met à jour le score A', () => {
      manager.updateMatch('match-id', { scoreA: { value: 5, isVictory: true, isAbstention: false, isExclusion: false, isForfait: false } });
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('score_a'),
        expect.any(Array)
      );
    });

    it('met à jour le score B', () => {
      manager.updateMatch('match-id', { scoreB: { value: 3, isVictory: false, isAbstention: false, isExclusion: false, isForfait: false } });
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('score_b'),
        expect.any(Array)
      );
    });

    it('met à jour le statut', () => {
      manager.updateMatch('match-id', { status: 'finished' as any });
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('status'),
        expect.any(Array)
      );
    });
  });

  describe('getPoolsByPhase', () => {
    beforeEach(async () => {
      await manager.open();
    });

    it('retourne un tableau vide si aucune poule', () => {
      mockDb.prepare.mockReturnValue(makeStmt({ step: vi.fn().mockReturnValue(false) }));
      const result = manager.getPoolsByPhase('phase-1');
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('retourne un tableau de poules si des poules existent', () => {
      let callCount = 0;
      mockDb.prepare.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return makeStmt({
            step: vi.fn()
              .mockReturnValueOnce(true)
              .mockReturnValue(false),
            getAsObject: vi.fn().mockReturnValue({
              id: 'pool-1',
              phase_id: 'phase-1',
              number: 1,
              is_complete: 0,
              has_error: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }),
          });
        }
        return makeStmt({ step: vi.fn().mockReturnValue(false) });
      });

      const result = manager.getPoolsByPhase('phase-1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('pool-1');
    });
  });

  describe('Validation – ID invalide', () => {
    beforeEach(async () => {
      await manager.open();
    });

    it('saveSessionState lance ValidationError pour ID vide', () => {
      expect(() => manager.saveSessionState('', {})).toThrow(ValidationError);
    });

    it('getSessionState lance ValidationError pour ID vide', () => {
      expect(() => manager.getSessionState('')).toThrow(ValidationError);
    });

    it('clearSessionState lance ValidationError pour ID vide', () => {
      expect(() => manager.clearSessionState('')).toThrow(ValidationError);
    });

    it('saveSessionState lance ValidationError pour ID > 255 chars', () => {
      expect(() => manager.saveSessionState('a'.repeat(256), {})).toThrow(ValidationError);
    });
  });

  describe('close', () => {
    it('ferme la DB et isOpen() retourne false', async () => {
      await manager.open();
      expect(manager.isOpen()).toBe(true);
      manager.close();
      expect(manager.isOpen()).toBe(false);
    });
  });
});
