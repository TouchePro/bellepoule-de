/**
 * BellePoule Modern - Database Layer (sql.js version)
 * Portable SQLite database using sql.js (pure JavaScript)
 * Licensed under GPL-3.0
 */

// @ts-expect-error - sql.js types are incomplete
import initSqlJs from 'sql.js';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import {
  Competition,
  CompetitionSettings,
  Fencer,
  FencerStatus,
  Gender,
  Weapon,
  Category,
  Pool,
  Match,
  MatchStatus,
} from '../shared/types';
import { validateId, validateSessionState, sanitizeId } from './validation';

let SQL: any = null;

export class DatabaseManager {
  private db: any = null;
  private dbPath: string;

  constructor(dbPath?: string) {
    this.dbPath = dbPath || path.join(process.cwd(), 'bellepoule.db');
  }

  public setPath(dbPath: string): void {
    this.dbPath = dbPath;
  }

  public async open(dbPath?: string): Promise<void> {
    if (dbPath) this.dbPath = dbPath;

    if (!SQL) {
      SQL = await initSqlJs();
    }

    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    if (fs.existsSync(this.dbPath)) {
      const fileBuffer = fs.readFileSync(this.dbPath);
      this.db = new SQL.Database(fileBuffer);
    } else {
      this.db = new SQL.Database();
    }

    this.initializeTables();
    this.save();
  }

  public close(): void {
    if (this.db) {
      this.save();
      this.db.close();
      this.db = null;
    }
  }

  private save(): void {
    if (!this.db) return;

    const data = this.db.export();
    const buffer = Buffer.from(data);
    const tmpPath = this.dbPath + '.tmp';
    const maxRetries = 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Écriture atomique : fichier temporaire puis renommage
        fs.writeFileSync(tmpPath, buffer);
        try {
          fs.renameSync(tmpPath, this.dbPath);
        } catch {
          // Sur Windows, renameSync peut échouer si le fichier cible est verrouillé
          // Fallback: écriture directe
          fs.writeFileSync(this.dbPath, buffer);
          try {
            fs.unlinkSync(tmpPath);
          } catch {
            /* ignore */
          }
        }
        return;
      } catch (error: any) {
        // EBUSY / EPERM / EACCES : fichier verrouillé (antivirus Windows)
        const isRetryable =
          error.code === 'EBUSY' || error.code === 'EPERM' || error.code === 'EACCES';
        if (isRetryable && attempt < maxRetries - 1) {
          // Attente courte avant retry (100ms, 200ms)
          const waitMs = 100 * (attempt + 1);
          const start = Date.now();
          while (Date.now() - start < waitMs) {
            /* attente active */
          }
          continue;
        }
        console.error(
          `Échec sauvegarde BDD (tentative ${attempt + 1}/${maxRetries}):`,
          error.message || error
        );
        throw error;
      }
    }
  }

  public forceSave(): void {
    this.save();
  }

  public getPath(): string {
    return this.dbPath;
  }
  public isOpen(): boolean {
    return this.db !== null;
  }

  private initializeTables(): void {
    if (!this.db) throw new Error('Database not open');

    this.db.run(`
      CREATE TABLE IF NOT EXISTS competitions (
        id TEXT PRIMARY KEY, title TEXT NOT NULL, short_title TEXT,
        date TEXT NOT NULL, location TEXT, organizer TEXT,
        weapon TEXT NOT NULL, gender TEXT NOT NULL, category TEXT NOT NULL,
        championship TEXT, color TEXT DEFAULT '#3B82F6',
        current_phase_index INTEGER DEFAULT 0, is_team_event INTEGER DEFAULT 0,
        status TEXT DEFAULT 'draft', settings TEXT,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS phases (
        id TEXT PRIMARY KEY,
        competition_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        order_index INTEGER NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS fencers (
        id TEXT PRIMARY KEY, competition_id TEXT NOT NULL,
        ref INTEGER NOT NULL, last_name TEXT NOT NULL, first_name TEXT NOT NULL,
        birth_date TEXT, gender TEXT NOT NULL, nationality TEXT DEFAULT 'FRA',
        region TEXT, club TEXT, license TEXT, ranking INTEGER,
        status TEXT DEFAULT 'N', seed_number INTEGER, final_ranking INTEGER,
        pool_stats TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS matches (
        id TEXT PRIMARY KEY, number INTEGER NOT NULL,
        pool_id TEXT, table_id TEXT,
        fencer_a_id TEXT, fencer_b_id TEXT,
        score_a TEXT, score_b TEXT, max_score INTEGER NOT NULL,
        status TEXT DEFAULT 'not_started', referee_id TEXT,
        strip INTEGER, round INTEGER, position INTEGER,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS pools (
        id TEXT PRIMARY KEY, phase_id TEXT NOT NULL,
        number INTEGER NOT NULL, strip INTEGER, start_time TEXT,
        is_complete INTEGER DEFAULT 0, has_error INTEGER DEFAULT 0,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS pool_fencers (
        pool_id TEXT NOT NULL, fencer_id TEXT NOT NULL, position INTEGER NOT NULL,
        PRIMARY KEY (pool_id, fencer_id)
      )
    `);

    // Table pour stocker l'état de session (persistance au refresh)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS session_state (
        competition_id TEXT PRIMARY KEY,
        state_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Table pour les touches (points marqués avec horodatage)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS match_touches (
        id TEXT PRIMARY KEY,
        match_id TEXT NOT NULL,
        fencer_id TEXT NOT NULL,
        zone TEXT NOT NULL,
        points INTEGER NOT NULL,
        timestamp TEXT NOT NULL,
        is_valid_in_sudden_death INTEGER DEFAULT 0,
        is_reversed INTEGER DEFAULT 0,
        FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
      )
    `);

    // Table pour les cartons (avec horodatage)
    this.db.run(`
      CREATE TABLE IF NOT EXISTS match_cards (
        id TEXT PRIMARY KEY,
        match_id TEXT NOT NULL,
        fencer_id TEXT NOT NULL,
        card_type TEXT NOT NULL,
        reason TEXT NOT NULL,
        card_group INTEGER NOT NULL DEFAULT 1,
        timestamp TEXT NOT NULL,
        points_awarded INTEGER NOT NULL DEFAULT 0,
        resulting_exclusion INTEGER DEFAULT 0,
        FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
      )
    `);

    // Colonnes de timing sur les matchs (migration idempotente)
    try {
      this.db.run(`ALTER TABLE matches ADD COLUMN start_time TEXT`);
    } catch {
      /* colonne déjà présente */
    }
    try {
      this.db.run(`ALTER TABLE matches ADD COLUMN end_time TEXT`);
    } catch {
      /* colonne déjà présente */
    }
    try {
      this.db.run(`ALTER TABLE matches ADD COLUMN duration INTEGER`);
    } catch {
      /* colonne déjà présente */
    }

    // Photo des tireurs (migration idempotente)
    try {
      this.db.run(`ALTER TABLE fencers ADD COLUMN photo TEXT`);
    } catch {
      /* colonne déjà présente */
    }

    // Renommage league → region (migration idempotente)
    try {
      this.db.run(`ALTER TABLE fencers RENAME COLUMN league TO region`);
    } catch {
      /* colonne déjà renommée */
    }

    // Création des index pour optimiser les performances
    this.createIndexes();
  }

  private createIndexes(): void {
    if (!this.db) return;

    // Index pour les recherches par date de compétition
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_competitions_date ON competitions(date)`);

    // Index pour les recherches par statut
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_competitions_status ON competitions(status)`);

    // Index pour les phases par compétition
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_phases_competition ON phases(competition_id)`);

    // Index pour les tireurs par compétition (très fréquemment utilisé)
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_fencers_competition ON fencers(competition_id)`);

    // Index pour les recherches de tireurs par nom
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_fencers_name ON fencers(last_name, first_name)`);

    // Index pour les recherches par club
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_fencers_club ON fencers(club)`);

    // Index pour les matchs par pool
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_matches_pool ON matches(pool_id)`);

    // Index pour les matchs par tableau
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_matches_table ON matches(table_id)`);

    // Index pour les matchs par statut
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status)`);

    // Index pour les poules par phase
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_pools_phase ON pools(phase_id)`);

    // Index pour les associations pool/tireur
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_pool_fencers_pool ON pool_fencers(pool_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_pool_fencers_fencer ON pool_fencers(fencer_id)`);

    // Index pour les statistiques par combattant
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_touches_match ON match_touches(match_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_touches_fencer ON match_touches(fencer_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_cards_match ON match_cards(match_id)`);
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_cards_fencer ON match_cards(fencer_id)`);
  }

  // Session State Management
  public saveSessionState(competitionId: string, state: any): void {
    if (!this.db) throw new Error('Database not open');

    // Input validation
    validateId(competitionId, 'competitionId');
    validateSessionState(state);

    const now = new Date().toISOString();
    const stateJson = JSON.stringify(state);

    this.db.run(
      `
      INSERT OR REPLACE INTO session_state (competition_id, state_json, updated_at)
      VALUES (?, ?, ?)
    `,
      [sanitizeId(competitionId), stateJson, now]
    );

    this.save();
  }

  public getSessionState(competitionId: string): any | null {
    if (!this.db) throw new Error('Database not open');

    // Input validation
    validateId(competitionId, 'competitionId');

    const stmt = this.db.prepare('SELECT state_json FROM session_state WHERE competition_id = ?');
    stmt.bind([sanitizeId(competitionId)]);

    if (!stmt.step()) {
      stmt.free();
      return null;
    }

    const row = stmt.getAsObject();
    stmt.free();

    try {
      return JSON.parse(row.state_json as string);
    } catch (e) {
      return null;
    }
  }

  public clearSessionState(competitionId: string): void {
    if (!this.db) throw new Error('Database not open');

    // Input validation
    validateId(competitionId, 'competitionId');

    this.db.run('DELETE FROM session_state WHERE competition_id = ?', [sanitizeId(competitionId)]);
    this.save();
  }

  // Competition CRUD
  public createCompetition(comp: Partial<Competition>): Competition {
    if (!this.db) throw new Error('Database not open');
    const now = new Date().toISOString();
    const id = comp.id || uuidv4();

    this.db.run(
      `
      INSERT INTO competitions (id, title, date, weapon, gender, category, location, color, settings, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        id,
        comp.title || 'Nouvelle compétition',
        comp.date?.toISOString() || now,
        comp.weapon || 'E',
        comp.gender || 'M',
        comp.category || 'SEN',
        comp.location || '',
        comp.color || '#3B82F6',
        JSON.stringify(comp.settings || {}),
        now,
        now,
      ]
    );

    this.save();
    return this.getCompetition(id)!;
  }

  public getCompetition(id: string): Competition | null {
    if (!this.db) throw new Error('Database not open');

    console.log('DB: getCompetition called with id:', id);

    const stmt = this.db.prepare('SELECT * FROM competitions WHERE id = ?');
    stmt.bind([id]);

    if (!stmt.step()) {
      stmt.free();
      console.log('DB: Competition not found');
      return null;
    }

    const row = stmt.getAsObject();
    stmt.free();

    console.log('DB: Raw row data:', row);

    try {
      // Parse settings with error handling
      let settings: CompetitionSettings = {
        defaultPoolMaxScore: 5,
        defaultTableMaxScore: 21,
        poolRounds: 1,
        hasDirectElimination: true,
        thirdPlaceMatch: true,
        manualRanking: false,
        defaultRanking: 0,
        randomScore: false,
        minTeamSize: 3,
      };
      if (row.settings) {
        try {
          settings = JSON.parse(row.settings as string);
        } catch (e) {
          console.error('DB: Failed to parse settings JSON:', e);
        }
      }

      const competition: Competition = {
        id: row.id as string,
        title: row.title as string,
        shortTitle: row.short_title as string,
        date: row.date ? new Date(row.date as string) : new Date(),
        location: row.location as string,
        organizer: row.organizer as string,
        weapon: row.weapon as Weapon,
        gender: row.gender as Gender,
        category: row.category as Category,
        championship: row.championship as string,
        color: row.color as string,
        currentPhaseIndex: row.current_phase_index as number,
        isTeamEvent: row.is_team_event === 1,
        status: row.status as any,
        settings: settings,
        fencers: [],
        referees: [],
        phases: [],
        createdAt: row.created_at ? new Date(row.created_at as string) : new Date(),
        updatedAt: row.updated_at ? new Date(row.updated_at as string) : new Date(),
      };

      console.log('DB: Competition parsed successfully');
      return competition;
    } catch (error) {
      console.error('DB: Error parsing competition data:', error);
      console.error('DB: Row data:', row);
      throw error;
    }
  }

  public getAllCompetitions(): Competition[] {
    if (!this.db) throw new Error('Database not open');
    const results: Competition[] = [];
    const stmt = this.db.prepare('SELECT id FROM competitions ORDER BY date DESC');
    while (stmt.step()) {
      const comp = this.getCompetition(stmt.getAsObject().id as string);
      if (comp) results.push(comp);
    }
    stmt.free();
    return results;
  }

  public deleteCompetition(id: string): void {
    if (!this.db) throw new Error('Database not open');
    this.db.run('DELETE FROM fencers WHERE competition_id = ?', [id]);
    this.db.run('DELETE FROM competitions WHERE id = ?', [id]);
    this.save();
  }

  public updateCompetition(id: string, updates: Partial<Competition>): void {
    if (!this.db) throw new Error('Database not open');
    const now = new Date().toISOString();

    if (updates.title !== undefined)
      this.db.run('UPDATE competitions SET title = ?, updated_at = ? WHERE id = ?', [
        updates.title,
        now,
        id,
      ]);
    if (updates.date !== undefined)
      this.db.run('UPDATE competitions SET date = ?, updated_at = ? WHERE id = ?', [
        updates.date.toISOString(),
        now,
        id,
      ]);
    if (updates.location !== undefined)
      this.db.run('UPDATE competitions SET location = ?, updated_at = ? WHERE id = ?', [
        updates.location,
        now,
        id,
      ]);
    if (updates.organizer !== undefined)
      this.db.run('UPDATE competitions SET organizer = ?, updated_at = ? WHERE id = ?', [
        updates.organizer,
        now,
        id,
      ]);
    if (updates.weapon !== undefined)
      this.db.run('UPDATE competitions SET weapon = ?, updated_at = ? WHERE id = ?', [
        updates.weapon,
        now,
        id,
      ]);
    if (updates.gender !== undefined)
      this.db.run('UPDATE competitions SET gender = ?, updated_at = ? WHERE id = ?', [
        updates.gender,
        now,
        id,
      ]);
    if (updates.category !== undefined)
      this.db.run('UPDATE competitions SET category = ?, updated_at = ? WHERE id = ?', [
        updates.category,
        now,
        id,
      ]);
    if (updates.status !== undefined)
      this.db.run('UPDATE competitions SET status = ?, updated_at = ? WHERE id = ?', [
        updates.status,
        now,
        id,
      ]);
    if (updates.settings !== undefined)
      this.db.run('UPDATE competitions SET settings = ?, updated_at = ? WHERE id = ?', [
        JSON.stringify(updates.settings),
        now,
        id,
      ]);

    this.save();
  }

  // Fencer CRUD
  public addFencer(competitionId: string, fencer: Partial<Fencer>): Fencer {
    if (!this.db) throw new Error('Database not open');
    const now = new Date().toISOString();
    const id = fencer.id || uuidv4();

    const maxRefStmt = this.db.prepare(
      'SELECT MAX(ref) as m FROM fencers WHERE competition_id = ?'
    );
    maxRefStmt.bind([competitionId]);
    maxRefStmt.step();
    const maxRef = (maxRefStmt.getAsObject().m as number) || 0;
    maxRefStmt.free();
    const ref = fencer.ref || maxRef + 1;

    try {
      this.db.run(
        `
        INSERT INTO fencers (id, competition_id, ref, last_name, first_name, birth_date, gender, nationality, club, region, license, ranking, status, photo, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          id,
          competitionId,
          ref,
          fencer.lastName || '',
          fencer.firstName || '',
          fencer.birthDate ? fencer.birthDate.toISOString() : null,
          fencer.gender || 'M',
          fencer.nationality || 'FRA',
          fencer.club || null,
          fencer.region || null,
          fencer.license || null,
          fencer.ranking || null,
          fencer.status || 'N',
          fencer.photo || null,
          now,
          now,
        ]
      );

      this.save();
      const createdFencer = this.getFencer(id);
      if (!createdFencer) {
        throw new Error('Failed to retrieve created fencer');
      }
      return createdFencer;
    } catch (error) {
      console.error('Database error in addFencer:', error);
      throw error;
    }
  }

  public getFencer(id: string): Fencer | null {
    if (!this.db) throw new Error('Database not open');
    const stmt = this.db.prepare('SELECT * FROM fencers WHERE id = ?');
    stmt.bind([id]);
    if (!stmt.step()) {
      stmt.free();
      return null;
    }
    const row = stmt.getAsObject();
    stmt.free();

    try {
      // Parse poolStats with error handling
      let poolStats = undefined;
      if (row.pool_stats) {
        try {
          poolStats = JSON.parse(row.pool_stats as string);
        } catch (e) {
          console.error('DB: Failed to parse pool_stats JSON for fencer', row.id, e);
        }
      }

      return {
        id: row.id as string,
        ref: row.ref as number,
        lastName: row.last_name as string,
        firstName: row.first_name as string,
        birthDate: row.birth_date ? new Date(row.birth_date as string) : undefined,
        gender: row.gender as Gender,
        nationality: row.nationality as string,
        region: row.region as string,
        club: row.club as string,
        license: row.license as string,
        ranking: row.ranking as number,
        status: row.status as FencerStatus,
        seedNumber: row.seed_number as number,
        finalRanking: row.final_ranking as number,
        poolStats: poolStats,
        photo: (row.photo as string) || undefined,
        createdAt: row.created_at ? new Date(row.created_at as string) : new Date(),
        updatedAt: row.updated_at ? new Date(row.updated_at as string) : new Date(),
      };
    } catch (error) {
      console.error('DB: Error parsing fencer data:', error);
      console.error('DB: Row data:', row);
      throw error;
    }
  }

  public getFencersByCompetition(competitionId: string): Fencer[] {
    if (!this.db) throw new Error('Database not open');
    const results: Fencer[] = [];
    const stmt = this.db.prepare('SELECT id FROM fencers WHERE competition_id = ? ORDER BY ref');
    stmt.bind([competitionId]);
    while (stmt.step()) {
      const fencer = this.getFencer(stmt.getAsObject().id as string);
      if (fencer) results.push(fencer);
    }
    stmt.free();
    return results;
  }

  public getFencerPhotos(competitionId: string): { license: string; photo: string }[] {
    if (!this.db) throw new Error('Database not open');
    const results: { license: string; photo: string }[] = [];
    const stmt = this.db.prepare(
      "SELECT license, photo FROM fencers WHERE competition_id = ? AND photo IS NOT NULL AND license IS NOT NULL AND license != ''"
    );
    stmt.bind([competitionId]);
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push({ license: row.license as string, photo: row.photo as string });
    }
    stmt.free();
    return results;
  }

  public updateFencerPhotosByLicense(
    competitionId: string,
    photos: { license: string; photo: string }[]
  ): { matched: number; total: number } {
    if (!this.db) throw new Error('Database not open');
    let matched = 0;
    const now = new Date().toISOString();

    for (const { license, photo } of photos) {
      const stmt = this.db.prepare(
        'SELECT id FROM fencers WHERE competition_id = ? AND license = ? LIMIT 1'
      );
      stmt.bind([competitionId, license]);
      const exists = stmt.step();
      stmt.free();

      if (exists) {
        this.db.run(
          'UPDATE fencers SET photo = ?, updated_at = ? WHERE competition_id = ? AND license = ?',
          [photo, now, competitionId, license]
        );
        matched++;
      }
    }

    this.save();
    return { matched, total: photos.length };
  }

  public upsertFencersByLicense(
    competitionId: string,
    fencers: Partial<Fencer>[]
  ): { added: number; updated: number } {
    if (!this.db) throw new Error('Database not open');
    let added = 0;
    let updated = 0;

    for (const fencer of fencers) {
      let existing: Fencer | null = null;
      const key = fencer.license?.trim();

      if (key) {
        const stmt = this.db.prepare(
          'SELECT id FROM fencers WHERE competition_id = ? AND license = ? LIMIT 1'
        );
        stmt.bind([competitionId, key]);
        if (stmt.step()) {
          const row = stmt.getAsObject();
          existing = this.getFencer(row.id as string);
        }
        stmt.free();
      }

      if (!existing && fencer.lastName && fencer.firstName) {
        const stmt = this.db.prepare(
          'SELECT id FROM fencers WHERE competition_id = ? AND LOWER(last_name) = LOWER(?) AND LOWER(first_name) = LOWER(?) LIMIT 1'
        );
        stmt.bind([competitionId, fencer.lastName, fencer.firstName]);
        if (stmt.step()) {
          const row = stmt.getAsObject();
          existing = this.getFencer(row.id as string);
        }
        stmt.free();
      }

      if (existing) {
        const updates = { ...fencer };
        if (existing.photo) delete updates.photo;
        this.updateFencer(existing.id, updates);
        updated++;
      } else {
        this.addFencer(competitionId, fencer);
        added++;
      }
    }

    this.save();
    return { added, updated };
  }

  public updateFencer(id: string, updates: Partial<Fencer>): void {
    if (!this.db) throw new Error('Database not open');
    const now = new Date().toISOString();

    const fieldMap: Record<string, string> = {
      lastName: 'last_name',
      firstName: 'first_name',
      gender: 'gender',
      nationality: 'nationality',
      club: 'club',
      region: 'region',
      license: 'license',
      ranking: 'ranking',
      status: 'status',
      photo: 'photo',
      seedNumber: 'seed_number',
      finalRanking: 'final_ranking',
    };

    const setClauses: string[] = [];
    const values: unknown[] = [];

    for (const [key, col] of Object.entries(fieldMap)) {
      if (key in updates) {
        setClauses.push(`${col} = ?`);
        values.push((updates as Record<string, unknown>)[key] ?? null);
      }
    }

    if (updates.poolStats !== undefined) {
      setClauses.push('pool_stats = ?');
      values.push(updates.poolStats ? JSON.stringify(updates.poolStats) : null);
    }

    if (setClauses.length > 0) {
      setClauses.push('updated_at = ?');
      values.push(now);
      values.push(id);
      this.db.run(`UPDATE fencers SET ${setClauses.join(', ')} WHERE id = ?`, values);
    }

    this.save();
  }

  public deleteFencer(id: string): void {
    if (!this.db) throw new Error('Database not open');

    console.log('Tentative de suppression du tireur:', id);

    // Vérifier que le tireur existe
    const stmt = this.db.prepare('SELECT id, last_name FROM fencers WHERE id = ?');
    stmt.bind([id]);
    const row = stmt.getAsObject();
    const exists = stmt.step();
    stmt.free();

    if (!exists || !row) {
      console.error('Tireur non trouvé:', id);
      throw new Error(`Tireur avec l'ID ${id} non trouvé`);
    }

    console.log('Tireur trouvé pour suppression:', row.last_name);

    try {
      // Supprimer d'abord les associations pool_fencers
      const poolFencerResult = this.db.run('DELETE FROM pool_fencers WHERE fencer_id = ?', [id]);
      console.log('Associations pool_fencers supprimées:', poolFencerResult.changes);

      // Supprimer les matchs où ce tireur participe
      const matchResult = this.db.run(
        'DELETE FROM matches WHERE fencer_a_id = ? OR fencer_b_id = ?',
        [id, id]
      );
      console.log('Matchs supprimés:', matchResult.changes);

      // Supprimer le tireur
      const result = this.db.run('DELETE FROM fencers WHERE id = ?', [id]);
      console.log('Tireur supprimé:', result.changes);

      // Vérifier que la suppression a réussi
      if (result.changes === 0) {
        throw new Error(`Échec de la suppression du tireur ${id}`);
      }

      this.save();
      console.log('Suppression du tireur terminée avec succès');
    } catch (error) {
      console.error('Erreur lors de la suppression du tireur:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Erreur de base de données lors de la suppression du tireur: ${errorMessage}`
      );
    }
  }

  public deleteAllFencers(competitionId: string): void {
    if (!this.db) throw new Error('Database not open');

    try {
      // Supprimer les associations pool_fencers des tireurs de cette compétition
      this.db.run(
        `DELETE FROM pool_fencers WHERE fencer_id IN (SELECT id FROM fencers WHERE competition_id = ?)`,
        [competitionId]
      );
      // Supprimer les matchs des tireurs de cette compétition
      this.db.run(
        `DELETE FROM matches WHERE fencer_a_id IN (SELECT id FROM fencers WHERE competition_id = ?) OR fencer_b_id IN (SELECT id FROM fencers WHERE competition_id = ?)`,
        [competitionId, competitionId]
      );
      // Supprimer tous les tireurs
      this.db.run('DELETE FROM fencers WHERE competition_id = ?', [competitionId]);

      this.save();
      console.log(`Tous les tireurs de la compétition ${competitionId} supprimés`);
    } catch (error) {
      console.error('Erreur lors de la suppression de tous les tireurs:', error);
      throw error;
    }
  }

  // Match CRUD
  public createMatch(match: Partial<Match>, poolId?: string): Match {
    if (!this.db) throw new Error('Database not open');
    const now = new Date().toISOString();
    const id = match.id || uuidv4();
    this.db.run(
      `INSERT INTO matches (id, number, pool_id, fencer_a_id, fencer_b_id, max_score, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        match.number || 1,
        poolId || null,
        match.fencerA?.id || null,
        match.fencerB?.id || null,
        match.maxScore || 5,
        'not_started',
        now,
        now,
      ]
    );
    this.save();
    return this.getMatch(id)!;
  }

  public getMatch(id: string): Match | null {
    if (!this.db) throw new Error('Database not open');
    const stmt = this.db.prepare('SELECT * FROM matches WHERE id = ?');
    stmt.bind([id]);
    if (!stmt.step()) {
      stmt.free();
      return null;
    }
    const row = stmt.getAsObject();
    stmt.free();
    return {
      id: row.id as string,
      number: row.number as number,
      fencerA: row.fencer_a_id ? this.getFencer(row.fencer_a_id as string) : null,
      fencerB: row.fencer_b_id ? this.getFencer(row.fencer_b_id as string) : null,
      scoreA: row.score_a ? JSON.parse(row.score_a as string) : null,
      scoreB: row.score_b ? JSON.parse(row.score_b as string) : null,
      maxScore: row.max_score as number,
      status: row.status as MatchStatus,
      poolId: row.pool_id as string,
      tableId: row.table_id as string,
      round: row.round as number,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  public getPoolFencers(poolId: string): Fencer[] {
    if (!this.db) throw new Error('Database not open');
    const results: Fencer[] = [];
    const stmt = this.db.prepare(
      'SELECT fencer_id FROM pool_fencers WHERE pool_id = ? ORDER BY position'
    );
    stmt.bind([poolId]);
    while (stmt.step()) {
      const fencer = this.getFencer(stmt.getAsObject().fencer_id as string);
      if (fencer) results.push(fencer);
    }
    stmt.free();
    return results;
  }

  public getMatchesByPool(poolId: string): Match[] {
    if (!this.db) throw new Error('Database not open');
    const results: Match[] = [];
    const stmt = this.db.prepare('SELECT id FROM matches WHERE pool_id = ? ORDER BY number');
    stmt.bind([poolId]);
    while (stmt.step()) {
      const match = this.getMatch(stmt.getAsObject().id as string);
      if (match) results.push(match);
    }
    stmt.free();
    return results;
  }

  public getCompetitionPools(competitionId: string): { id: string; name: string }[] {
    if (!this.db) throw new Error('Database not open');
    const pools: { id: string; name: string }[] = [];

    try {
      const poolsStmt = this.db.prepare(
        'SELECT DISTINCT p.id, p.name FROM pools p INNER JOIN pool_fencers pf ON p.id = pf.pool_id INNER JOIN fencers f ON pf.fencer_id = f.id WHERE f.competition_id = ? ORDER BY p.name'
      );
      poolsStmt.bind([competitionId]);
      while (poolsStmt.step()) {
        const row = poolsStmt.getAsObject();
        pools.push({ id: row.id as string, name: row.name as string });
      }
      poolsStmt.free();
    } catch (e) {
      console.warn('[Database] Error getting pools:', e);
    }

    if (pools.length === 0) {
      try {
        const poolsStmt = this.db.prepare(
          'SELECT p.id, p.name FROM pools p INNER JOIN phases ph ON p.phase_id = ph.id WHERE ph.competition_id = ? ORDER BY p.name'
        );
        poolsStmt.bind([competitionId]);
        while (poolsStmt.step()) {
          const row = poolsStmt.getAsObject();
          pools.push({ id: row.id as string, name: row.name as string });
        }
        poolsStmt.free();
      } catch (e) {
        console.warn('[Database] Error getting pools via phases:', e);
      }
    }

    return pools;
  }

  public getPendingMatches(competitionId: string): Match[] {
    if (!this.db) throw new Error('Database not open');
    const results: Match[] = [];

    console.log('[Database] === DEBUG: getPendingMatches ===');
    console.log(`[Database] CompetitionId: ${competitionId}`);

    // First get all pools for the competition
    // Try to get pools through phases table first
    let poolIds: string[] = [];

    try {
      // Debug: Check phases table
      const phasesCountStmt = this.db.prepare(
        'SELECT COUNT(*) as count FROM phases WHERE competition_id = ?'
      );
      phasesCountStmt.bind([competitionId]);
      if (phasesCountStmt.step()) {
        console.log(
          `[Database] Phases count for competition: ${phasesCountStmt.getAsObject().count}`
        );
      }
      phasesCountStmt.free();

      const poolsStmt = this.db.prepare(
        'SELECT id, phase_id FROM pools WHERE phase_id IN (SELECT id FROM phases WHERE competition_id = ?)'
      );
      poolsStmt.bind([competitionId]);

      while (poolsStmt.step()) {
        const row = poolsStmt.getAsObject();
        poolIds.push(row.id as string);
        console.log(`[Database] Pool via phases: ${row.id} (phase_id: ${row.phase_id})`);
      }
      poolsStmt.free();
      console.log(`[Database] Found ${poolIds.length} pools via phases`);
    } catch (e) {
      // If phases table doesn't exist or query fails, try alternative approach
      console.warn('[Database] Falling back to pool_fencers approach for getPendingMatches:', e);
    }

    // If no pools found through phases, try through pool_fencers -> fencers
    if (poolIds.length === 0) {
      console.log('[Database] No pools via phases, trying pool_fencers approach');
      try {
        const altStmt = this.db.prepare(`
          SELECT DISTINCT p.id FROM pools p
          INNER JOIN pool_fencers pf ON p.id = pf.pool_id
          INNER JOIN fencers f ON pf.fencer_id = f.id
          WHERE f.competition_id = ?
        `);
        altStmt.bind([competitionId]);

        while (altStmt.step()) {
          poolIds.push(altStmt.getAsObject().id as string);
        }
        altStmt.free();
        console.log(`[Database] Found ${poolIds.length} pools via pool_fencers`);
      } catch (e) {
        console.warn('[Database] Alternative approach also failed:', e);
      }
    }

    console.log(`[Database] Total pools found: ${poolIds.length}`);

    // Then get pending matches from those pools
    if (poolIds.length > 0) {
      const placeholders = poolIds.map(() => '?').join(',');
      const matchesStmt = this.db.prepare(
        `SELECT id FROM matches WHERE pool_id IN (${placeholders}) AND status IN ('not_started', 'in_progress') ORDER BY pool_id, number`
      );
      matchesStmt.bind(poolIds);

      while (matchesStmt.step()) {
        const match = this.getMatch(matchesStmt.getAsObject().id as string);
        if (match) results.push(match);
      }
      matchesStmt.free();
    }

    return results;
  }

  public getAllPendingMatchesFromPools(competitionId: string): Match[] {
    if (!this.db) throw new Error('Database not open');
    const results: Match[] = [];

    console.log('[Database] === DEBUG: getAllPendingMatchesFromPools ===');
    console.log(`[Database] CompetitionId: ${competitionId}`);

    // Get all pools for the competition via pool_fencers -> fencers
    const poolIds: string[] = [];
    try {
      const poolsStmt = this.db.prepare(`
        SELECT DISTINCT p.id FROM pools p
        INNER JOIN pool_fencers pf ON p.id = pf.pool_id
        INNER JOIN fencers f ON pf.fencer_id = f.id
        WHERE f.competition_id = ?
      `);
      poolsStmt.bind([competitionId]);

      while (poolsStmt.step()) {
        const poolId = poolsStmt.getAsObject().id as string;
        poolIds.push(poolId);
        console.log(`[Database] Pool found: ${poolId}`);
      }
      poolsStmt.free();
      console.log(`[Database] Found ${poolIds.length} pools via pool_fencers`);
    } catch (e) {
      console.warn('[Database] Error getting pools via pool_fencers:', e);
      return results;
    }

    console.log(`[Database] Total pools: ${poolIds.length}`);

    // Get pending matches from those pools
    if (poolIds.length > 0) {
      const placeholders = poolIds.map(() => '?').join(',');
      console.log(`[Database] Querying matches for pools: ${poolIds.join(', ')}`);
      const matchesStmt = this.db.prepare(
        `SELECT id FROM matches WHERE pool_id IN (${placeholders}) AND status IN ('not_started', 'in_progress') ORDER BY pool_id, number`
      );
      matchesStmt.bind(poolIds);

      while (matchesStmt.step()) {
        const match = this.getMatch(matchesStmt.getAsObject().id as string);
        if (match) results.push(match);
      }
      matchesStmt.free();
    }

    return results;
  }

  // Nouvelle méthode: récupérer les matchs directement via la table fencers
  // Sans passer par phases ou pool_fencers
  public getPendingMatchesDirectly(competitionId: string): Match[] {
    if (!this.db) throw new Error('Database not open');
    const results: Match[] = [];

    console.log('[Database] === DEBUG: getPendingMatchesDirectly ===');
    console.log(`[Database] CompetitionId: ${competitionId}`);

    // Debug: Compter tous les matchs dans la base
    try {
      const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM matches');
      if (countStmt.step()) {
        console.log(`[Database] Total matches in DB: ${countStmt.getAsObject().count}`);
      }
      countStmt.free();
    } catch (e) {
      console.log('[Database] Error counting matches:', e);
    }

    // Debug: Afficher le breakdown par statut
    try {
      const statusStmt = this.db.prepare(
        'SELECT status, COUNT(*) as count FROM matches GROUP BY status'
      );
      console.log('[Database] Match status breakdown:');
      while (statusStmt.step()) {
        const row = statusStmt.getAsObject();
        console.log(`[Database]   Status '${row.status}': ${row.count} matches`);
      }
      statusStmt.free();
    } catch (e) {
      console.log('[Database] Error getting status breakdown:', e);
    }

    // Debug: Compter les fencers pour cette compétition
    try {
      const fencerStmt = this.db.prepare(
        'SELECT COUNT(*) as count FROM fencers WHERE competition_id = ?'
      );
      fencerStmt.bind([competitionId]);
      if (fencerStmt.step()) {
        console.log(
          `[Database] Fencers for competition ${competitionId}: ${fencerStmt.getAsObject().count}`
        );
      }
      fencerStmt.free();
    } catch (e) {
      console.log('[Database] Error counting fencers:', e);
    }

    // Debug: Compter les pools via pool_fencers
    try {
      const poolStmt = this.db.prepare(`
        SELECT COUNT(DISTINCT p.id) as count 
        FROM pools p
        INNER JOIN pool_fencers pf ON p.id = pf.pool_id
        INNER JOIN fencers f ON pf.fencer_id = f.id
        WHERE f.competition_id = ?
      `);
      poolStmt.bind([competitionId]);
      if (poolStmt.step()) {
        console.log(`[Database] Pools via pool_fencers: ${poolStmt.getAsObject().count}`);
      }
      poolStmt.free();
    } catch (e) {
      console.log('[Database] Error counting pools:', e);
    }

    // Debug: Afficher quelques IDs de fencers
    try {
      const sampleStmt = this.db.prepare('SELECT id FROM fencers WHERE competition_id = ? LIMIT 3');
      sampleStmt.bind([competitionId]);
      const fencerIds: string[] = [];
      while (sampleStmt.step()) {
        fencerIds.push(sampleStmt.getAsObject().id as string);
      }
      sampleStmt.free();
      console.log(`[Database] Sample fencer IDs: ${fencerIds.join(', ')}`);
    } catch (e) {
      console.log('[Database] Error getting sample fencers:', e);
    }

    console.log('[Database] getPendingMatchesDirectly: Starting direct query');

    try {
      // Query matches directly via fencers table
      const matchesStmt = this.db.prepare(`
        SELECT DISTINCT m.id FROM matches m
        INNER JOIN fencers fA ON m.fencer_a_id = fA.id
        INNER JOIN fencers fB ON m.fencer_b_id = fB.id
        WHERE (fA.competition_id = ? OR fB.competition_id = ?)
        AND m.status IN ('not_started', 'in_progress')
        ORDER BY m.pool_id, m.number
      `);
      matchesStmt.bind([competitionId, competitionId]);

      console.log('[Database] getPendingMatchesDirectly: Executing query');

      while (matchesStmt.step()) {
        const matchId = matchesStmt.getAsObject().id as string;
        console.log(`[Database] getPendingMatchesDirectly: Found match ${matchId}`);
        const match = this.getMatch(matchId);
        if (match) results.push(match);
      }
      matchesStmt.free();

      console.log(`[Database] getPendingMatchesDirectly: Found ${results.length} matches`);
    } catch (e) {
      console.error('[Database] getPendingMatchesDirectly: Error:', e);
    }

    // Fallback: try getting all matches and filter manually
    if (results.length === 0) {
      console.log('[Database] getPendingMatchesDirectly: Trying fallback with all matches');
      try {
        const allMatchesStmt = this.db.prepare('SELECT id FROM matches WHERE status IN (?, ?)');
        allMatchesStmt.bind(['not_started', 'in_progress']);

        while (allMatchesStmt.step()) {
          const matchId = allMatchesStmt.getAsObject().id as string;
          const match = this.getMatch(matchId);
          if (match && match.fencerA && match.fencerB) {
            // Check if either fencer belongs to the competition
            const fencerACompetition = this.getFencerCompetition(match.fencerA.id);
            const fencerBCompetition = this.getFencerCompetition(match.fencerB.id);
            if (fencerACompetition === competitionId || fencerBCompetition === competitionId) {
              console.log(
                `[Database] getPendingMatchesDirectly: Found match ${matchId} via fallback`
              );
              results.push(match);
            }
          }
        }
        allMatchesStmt.free();

        console.log(
          `[Database] getPendingMatchesDirectly: Fallback found ${results.length} matches`
        );
      } catch (e) {
        console.error('[Database] getPendingMatchesDirectly: Fallback error:', e);
      }
    }

    return results;
  }

  // Helper method to get competition ID for a fencer
  private getFencerCompetition(fencerId: string): string | null {
    if (!this.db) return null;
    try {
      const stmt = this.db.prepare('SELECT competition_id FROM fencers WHERE id = ?');
      stmt.bind([fencerId]);
      if (stmt.step()) {
        const result = stmt.getAsObject().competition_id as string | null;
        stmt.free();
        return result;
      }
      stmt.free();
    } catch (e) {
      console.warn('[Database] Error getting fencer competition:', e);
    }
    return null;
  }

  public getPoolCount(competitionId: string): number {
    if (!this.db) throw new Error('Database not open');
    let count = 0;
    try {
      const stmt = this.db.prepare(`
        SELECT COUNT(DISTINCT p.id) as count FROM pools p
        INNER JOIN pool_fencers pf ON p.id = pf.pool_id
        INNER JOIN fencers f ON pf.fencer_id = f.id
        WHERE f.competition_id = ?
      `);
      stmt.bind([competitionId]);
      if (stmt.step()) {
        count = stmt.getAsObject().count as number;
      }
      stmt.free();
    } catch (e) {
      console.warn('[Database] Error getting pool count:', e);
    }
    if (count === 0) {
      try {
        const stmt = this.db.prepare(`
          SELECT COUNT(DISTINCT p.id) as count FROM pools p
          INNER JOIN phases ph ON p.phase_id = ph.id
          WHERE ph.competition_id = ?
        `);
        stmt.bind([competitionId]);
        if (stmt.step()) {
          count = stmt.getAsObject().count as number;
        }
        stmt.free();
      } catch (e) {
        console.warn('[Database] Error getting pool count via phases:', e);
      }
    }
    return count;
  }

  public updateMatch(id: string, updates: Partial<Match>): void {
    if (!this.db) throw new Error('Database not open');
    const now = new Date().toISOString();
    if (updates.scoreA !== undefined)
      this.db.run('UPDATE matches SET score_a = ?, updated_at = ? WHERE id = ?', [
        JSON.stringify(updates.scoreA),
        now,
        id,
      ]);
    if (updates.scoreB !== undefined)
      this.db.run('UPDATE matches SET score_b = ?, updated_at = ? WHERE id = ?', [
        JSON.stringify(updates.scoreB),
        now,
        id,
      ]);
    if (updates.status !== undefined)
      this.db.run('UPDATE matches SET status = ?, updated_at = ? WHERE id = ?', [
        updates.status,
        now,
        id,
      ]);
    this.save();
  }

  public updatePool(pool: Pool): void {
    if (!this.db) throw new Error('Database not open');
    const now = new Date().toISOString();

    // Mettre à jour les informations de la poule
    this.db.run('UPDATE pools SET updated_at = ?, is_complete = ? WHERE id = ?', [
      now,
      pool.isComplete ? 1 : 0,
      pool.id,
    ]);

    // Mettre à jour les matchs de la poule
    for (const match of pool.matches || []) {
      if (match.scoreA !== undefined || match.scoreB !== undefined || match.status !== undefined) {
        this.updateMatch(match.id, {
          scoreA: match.scoreA,
          scoreB: match.scoreB,
          status: match.status,
        });
      }
    }

    this.save();
  }

  // ─── Statistiques combattants ───────────────────────────────────────────────

  public saveTouch(touch: {
    id: string;
    matchId: string;
    fencerId: string;
    zone: string;
    points: number;
    timestamp: string;
    isValidInSuddenDeath?: boolean;
    isReversed?: boolean;
  }): void {
    if (!this.db) throw new Error('Database not open');
    this.db.run(
      `INSERT OR REPLACE INTO match_touches
        (id, match_id, fencer_id, zone, points, timestamp, is_valid_in_sudden_death, is_reversed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        touch.id,
        touch.matchId,
        touch.fencerId,
        touch.zone,
        touch.points,
        touch.timestamp,
        touch.isValidInSuddenDeath ? 1 : 0,
        touch.isReversed ? 1 : 0,
      ]
    );
    this.save();
  }

  public saveCard(card: {
    id: string;
    matchId: string;
    fencerId: string;
    cardType: string;
    reason: string;
    cardGroup: number;
    timestamp: string;
    pointsAwarded: number;
    resultingExclusion?: boolean;
  }): void {
    if (!this.db) throw new Error('Database not open');
    this.db.run(
      `INSERT OR REPLACE INTO match_cards
        (id, match_id, fencer_id, card_type, reason, card_group, timestamp, points_awarded, resulting_exclusion)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        card.id,
        card.matchId,
        card.fencerId,
        card.cardType,
        card.reason,
        card.cardGroup,
        card.timestamp,
        card.pointsAwarded,
        card.resultingExclusion ? 1 : 0,
      ]
    );
    this.save();
  }

  public updateMatchTiming(
    matchId: string,
    startTime: string | null,
    endTime: string | null,
    duration: number | null
  ): void {
    if (!this.db) throw new Error('Database not open');
    const now = new Date().toISOString();
    this.db.run(
      `UPDATE matches SET start_time = ?, end_time = ?, duration = ?, updated_at = ? WHERE id = ?`,
      [startTime, endTime, duration, now, matchId]
    );
    this.save();
  }

  public getFencerHistory(fencerId: string): {
    matches: Array<{
      matchId: string;
      number: number;
      opponentId: string | null;
      opponentLastName: string | null;
      opponentFirstName: string | null;
      scoreA: string | null;
      scoreB: string | null;
      side: 'A' | 'B';
      status: string;
      startTime: string | null;
      endTime: string | null;
      duration: number | null;
      poolId: string | null;
      tableId: string | null;
      round: number | null;
      touches: Array<{
        id: string;
        zone: string;
        points: number;
        timestamp: string;
        isValidInSuddenDeath: boolean;
        isReversed: boolean;
      }>;
      cards: Array<{
        id: string;
        cardType: string;
        reason: string;
        cardGroup: number;
        timestamp: string;
        pointsAwarded: number;
        resultingExclusion: boolean;
      }>;
    }>;
  } {
    if (!this.db) throw new Error('Database not open');

    // Récupérer les matchs joués par ce combattant (comme A ou B)
    const matchRows: any[] = [];
    const matchStmt = this.db.prepare(`
      SELECT
        m.id, m.number, m.fencer_a_id, m.fencer_b_id,
        m.score_a, m.score_b, m.status,
        m.start_time, m.end_time, m.duration,
        m.pool_id, m.table_id, m.round,
        fa.last_name AS opp_a_last, fa.first_name AS opp_a_first,
        fb.last_name AS opp_b_last, fb.first_name AS opp_b_first
      FROM matches m
      LEFT JOIN fencers fa ON m.fencer_a_id = fa.id
      LEFT JOIN fencers fb ON m.fencer_b_id = fb.id
      WHERE (m.fencer_a_id = ? OR m.fencer_b_id = ?)
        AND m.status = 'finished'
      ORDER BY m.updated_at ASC
    `);
    matchStmt.bind([fencerId, fencerId]);
    while (matchStmt.step()) {
      matchRows.push(matchStmt.getAsObject());
    }
    matchStmt.free();

    const matches = matchRows.map(row => {
      const side: 'A' | 'B' = row.fencer_a_id === fencerId ? 'A' : 'B';
      const opponentId =
        side === 'A' ? (row.fencer_b_id as string | null) : (row.fencer_a_id as string | null);
      const opponentLastName =
        side === 'A' ? (row.opp_b_last as string | null) : (row.opp_a_last as string | null);
      const opponentFirstName =
        side === 'A' ? (row.opp_b_first as string | null) : (row.opp_a_first as string | null);

      // Touches de ce combattant dans ce match
      const touches: any[] = [];
      const touchStmt = this.db.prepare(`
        SELECT id, zone, points, timestamp, is_valid_in_sudden_death, is_reversed
        FROM match_touches
        WHERE match_id = ? AND fencer_id = ?
        ORDER BY timestamp ASC
      `);
      touchStmt.bind([row.id as string, fencerId]);
      while (touchStmt.step()) {
        const t = touchStmt.getAsObject();
        touches.push({
          id: t.id as string,
          zone: t.zone as string,
          points: t.points as number,
          timestamp: t.timestamp as string,
          isValidInSuddenDeath: t.is_valid_in_sudden_death === 1,
          isReversed: t.is_reversed === 1,
        });
      }
      touchStmt.free();

      // Cartons de ce combattant dans ce match
      const cards: any[] = [];
      const cardStmt = this.db.prepare(`
        SELECT id, card_type, reason, card_group, timestamp, points_awarded, resulting_exclusion
        FROM match_cards
        WHERE match_id = ? AND fencer_id = ?
        ORDER BY timestamp ASC
      `);
      cardStmt.bind([row.id as string, fencerId]);
      while (cardStmt.step()) {
        const c = cardStmt.getAsObject();
        cards.push({
          id: c.id as string,
          cardType: c.card_type as string,
          reason: c.reason as string,
          cardGroup: c.card_group as number,
          timestamp: c.timestamp as string,
          pointsAwarded: c.points_awarded as number,
          resultingExclusion: c.resulting_exclusion === 1,
        });
      }
      cardStmt.free();

      return {
        matchId: row.id as string,
        number: row.number as number,
        opponentId,
        opponentLastName,
        opponentFirstName,
        scoreA: row.score_a as string | null,
        scoreB: row.score_b as string | null,
        side,
        status: row.status as string,
        startTime: row.start_time as string | null,
        endTime: row.end_time as string | null,
        duration: row.duration as number | null,
        poolId: row.pool_id as string | null,
        tableId: row.table_id as string | null,
        round: row.round as number | null,
        touches,
        cards,
      };
    });

    return { matches };
  }

  // Export/Import
  public exportToFile(filepath: string): void {
    if (!this.db) throw new Error('Database not open');
    const data = this.db.export();
    const buffer = Buffer.from(data);
    const tmpPath = filepath + '.tmp';
    try {
      fs.writeFileSync(tmpPath, buffer);
      try {
        fs.renameSync(tmpPath, filepath);
      } catch {
        fs.writeFileSync(filepath, buffer);
        try {
          fs.unlinkSync(tmpPath);
        } catch {
          /* ignore */
        }
      }
    } catch (error) {
      // Fallback: écriture directe
      fs.writeFileSync(filepath, buffer);
    }
  }

  public async importFromFile(filepath: string): Promise<void> {
    this.close();
    this.dbPath = filepath;
    await this.open();
  }
}

export const db = new DatabaseManager();
