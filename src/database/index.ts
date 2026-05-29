/**
 * BellePoule Modern - Database Layer (sql.js version)
 * Portable SQLite database using sql.js (pure JavaScript)
 * Licensed under GPL-3.0
 */

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
  Phase,
  PhaseType,
  Referee,
  MatchEventEntry,
  MatchEventType,
} from '../shared/types';
import { validateId, validateSessionState, sanitizeId } from './validation';
import { logger, LogCategory } from '../shared/services/logger';
import { MigrationManager } from './migrations';
import { ALL_MIGRATIONS } from './migrations/migrations';

let SQL: any = null;
let sqlInitPromise: Promise<any> | null = null;

/** Démarre le chargement du WASM sql.js en avance, sans bloquer. */
export function prewarmSqlJs(): void {
  if (!sqlInitPromise) {
    sqlInitPromise = initSqlJs().then(s => { SQL = s; return s; });
  }
}

export class DatabaseManager {
  private db: any = null;
  private dbPath: string;
  private isDirty = false;
  private saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(dbPath?: string) {
    this.dbPath = dbPath || path.join(process.cwd(), 'bellepoule.db');
  }

  public setPath(dbPath: string): void {
    this.dbPath = dbPath;
  }

  public async open(dbPath?: string): Promise<void> {
    if (dbPath) this.dbPath = dbPath;

    if (!SQL) {
      SQL = sqlInitPromise ? await sqlInitPromise : await initSqlJs();
    }

    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    if (fs.existsSync(this.dbPath)) {
      const fileBuffer = await fs.promises.readFile(this.dbPath);
      this.db = new SQL.Database(fileBuffer);
    } else {
      this.db = new SQL.Database();
    }

    const migrationsApplied = this.runMigrations();
    if (migrationsApplied > 0) this.save();
  }

  public close(): void {
    if (this.db) {
      this.saveSync();
      this.db.close();
      this.db = null;
    }
  }

  private run(sql: string, params?: any[]): void {
    if (params !== undefined) {
      this.db.run(sql, params);
    } else {
      this.db.run(sql);
    }
    this.isDirty = true;
  }

  private save(): void {
    if (!this.db) return;
    this.isDirty = true;
    // Debounce : coalesce les écritures rapides en un seul flush différé
    if (this.saveDebounceTimer !== null) return;
    this.saveDebounceTimer = setTimeout(() => {
      this.saveDebounceTimer = null;
      this.flushToDisk(0);
    }, 100);
  }

  // Écriture réelle sur disque, avec retry async (sans spin-wait bloquant)
  private flushToDisk(attempt: number): void {
    if (!this.db || !this.isDirty) return;

    const data = this.db.export();
    const buffer = Buffer.from(data);
    const tmpPath = this.dbPath + '.tmp';

    try {
      fs.writeFileSync(tmpPath, buffer);
      try {
        fs.renameSync(tmpPath, this.dbPath);
      } catch {
        // Sur Windows, renameSync peut échouer si le fichier cible est verrouillé
        fs.writeFileSync(this.dbPath, buffer);
        try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
      }
      this.isDirty = false;
    } catch (error: any) {
      // EBUSY / EPERM / EACCES : fichier verrouillé (antivirus Windows)
      const isRetryable = error.code === 'EBUSY' || error.code === 'EPERM' || error.code === 'EACCES';
      if (isRetryable && attempt < 2) {
        // Retry async sans bloquer le main thread
        setTimeout(() => this.flushToDisk(attempt + 1), 150 * (attempt + 1));
        return;
      }
      logger.error(
        LogCategory.DATABASE,
        `Échec sauvegarde BDD (tentative ${attempt + 1}/3):`,
        error instanceof Error ? error : new Error(String(error.message || error))
      );
    }
  }

  public saveSync(): void {
    if (this.saveDebounceTimer !== null) {
      clearTimeout(this.saveDebounceTimer);
      this.saveDebounceTimer = null;
    }
    if (!this.isDirty || !this.db) return;

    const data = this.db.export();
    const buffer = Buffer.from(data);
    const tmpPath = this.dbPath + '.tmp';

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        fs.writeFileSync(tmpPath, buffer);
        try {
          fs.renameSync(tmpPath, this.dbPath);
        } catch {
          fs.writeFileSync(this.dbPath, buffer);
          try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
        }
        this.isDirty = false;
        return;
      } catch (error: any) {
        const retryable = error.code === 'EBUSY' || error.code === 'EPERM' || error.code === 'EACCES';
        if (!retryable || attempt >= 2) {
          logger.error(
            LogCategory.DATABASE,
            `saveSync échoué (tentative ${attempt + 1}/3):`,
            error instanceof Error ? error : new Error(String(error.message || error))
          );
          return;
        }
        // Spinwait synchrone — acceptable lors d'un quit
        const end = Date.now() + 150 * (attempt + 1);
        while (Date.now() < end) { /* attente */ }
      }
    }
  }

  public forceSave(): void {
    this.saveSync();
  }

  // Version async de la sauvegarde : db.export() reste sync (sql.js) mais le I/O disque
  // est non-bloquant, ce qui évite de geler le main thread lors de l'autosave.
  public async saveAsync(): Promise<void> {
    if (this.saveDebounceTimer !== null) {
      clearTimeout(this.saveDebounceTimer);
      this.saveDebounceTimer = null;
    }
    if (!this.isDirty || !this.db) return;
    await this.flushToDiskAsync(0);
  }

  private async flushToDiskAsync(attempt: number): Promise<void> {
    if (!this.db || !this.isDirty) return;

    const data = this.db.export();
    const buffer = Buffer.from(data);
    const tmpPath = this.dbPath + '.tmp';

    try {
      await fs.promises.writeFile(tmpPath, buffer);
      try {
        await fs.promises.rename(tmpPath, this.dbPath);
      } catch {
        await fs.promises.writeFile(this.dbPath, buffer);
        try { await fs.promises.unlink(tmpPath); } catch { /* ignore */ }
      }
      this.isDirty = false;
    } catch (error: any) {
      const isRetryable = error.code === 'EBUSY' || error.code === 'EPERM' || error.code === 'EACCES';
      if (isRetryable && attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 150 * (attempt + 1)));
        await this.flushToDiskAsync(attempt + 1);
        return;
      }
      logger.error(
        LogCategory.DATABASE,
        `Échec saveAsync (tentative ${attempt + 1}/3):`,
        error instanceof Error ? error : new Error(String(error.message || error))
      );
    }
  }

  public getPath(): string {
    return this.dbPath;
  }
  public isOpen(): boolean {
    return this.db !== null;
  }

  private runMigrations(): number {
    if (!this.db) throw new Error('Database not open');
    return new MigrationManager(this.db).run(ALL_MIGRATIONS);
  }

  // Session State Management
  public saveSessionState(competitionId: string, state: any): void {
    if (!this.db) throw new Error('Database not open');

    // Input validation
    validateId(competitionId, 'competitionId');
    validateSessionState(state);

    const now = new Date().toISOString();
    const stateJson = JSON.stringify(state);

    this.run(
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

    this.run('DELETE FROM session_state WHERE competition_id = ?', [sanitizeId(competitionId)]);
    this.save();
  }

  // Competition CRUD
  public createCompetition(comp: Partial<Competition>): Competition {
    if (!this.db) throw new Error('Database not open');
    const now = new Date().toISOString();
    const id = comp.id || uuidv4();

    this.run(
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

    const stmt = this.db.prepare('SELECT * FROM competitions WHERE id = ?');
    stmt.bind([id]);

    if (!stmt.step()) {
      stmt.free();
      return null;
    }

    const row = stmt.getAsObject();
    stmt.free();

    try {
      // Parse settings with error handling
      let settings: CompetitionSettings = {
        defaultPoolMaxScore: 5,
        defaultTableMaxScore: 21,
        defaultPoolTimerSeconds: 180,
        defaultTableTimerSeconds: 180,
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
    this.run(
      `DELETE FROM pool_signatures WHERE pool_id IN (
         SELECT p.id FROM pools p JOIN phases ph ON p.phase_id = ph.id WHERE ph.competition_id = ?
       )`,
      [id]
    );
    this.run('DELETE FROM fencers WHERE competition_id = ?', [id]);
    this.run('DELETE FROM competitions WHERE id = ?', [id]);
    this.save();
  }

  public updateCompetition(id: string, updates: Partial<Competition>): void {
    if (!this.db) throw new Error('Database not open');
    const now = new Date().toISOString();

    if (updates.title !== undefined)
      this.run('UPDATE competitions SET title = ?, updated_at = ? WHERE id = ?', [
        updates.title,
        now,
        id,
      ]);
    if (updates.date !== undefined)
      this.run('UPDATE competitions SET date = ?, updated_at = ? WHERE id = ?', [
        updates.date.toISOString(),
        now,
        id,
      ]);
    if (updates.location !== undefined)
      this.run('UPDATE competitions SET location = ?, updated_at = ? WHERE id = ?', [
        updates.location,
        now,
        id,
      ]);
    if (updates.organizer !== undefined)
      this.run('UPDATE competitions SET organizer = ?, updated_at = ? WHERE id = ?', [
        updates.organizer,
        now,
        id,
      ]);
    if (updates.weapon !== undefined)
      this.run('UPDATE competitions SET weapon = ?, updated_at = ? WHERE id = ?', [
        updates.weapon,
        now,
        id,
      ]);
    if (updates.gender !== undefined)
      this.run('UPDATE competitions SET gender = ?, updated_at = ? WHERE id = ?', [
        updates.gender,
        now,
        id,
      ]);
    if (updates.category !== undefined)
      this.run('UPDATE competitions SET category = ?, updated_at = ? WHERE id = ?', [
        updates.category,
        now,
        id,
      ]);
    if (updates.status !== undefined)
      this.run('UPDATE competitions SET status = ?, updated_at = ? WHERE id = ?', [
        updates.status,
        now,
        id,
      ]);
    if (updates.settings !== undefined)
      this.run('UPDATE competitions SET settings = ?, updated_at = ? WHERE id = ?', [
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
      this.run(
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

  private parseFencerRow(row: any): Fencer {
    let poolStats = undefined;
    if (row.pool_stats) {
      try {
        poolStats = JSON.parse(row.pool_stats as string);
      } catch {
        console.error('DB: Failed to parse pool_stats JSON for fencer', row.id);
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
      poolStats,
      photo: (row.photo as string) || undefined,
      createdAt: row.created_at ? new Date(row.created_at as string) : new Date(),
      updatedAt: row.updated_at ? new Date(row.updated_at as string) : new Date(),
    };
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
      return this.parseFencerRow(row);
    } catch (error) {
      console.error('DB: Error parsing fencer data:', error);
      throw error;
    }
  }

  public getFencersByCompetition(competitionId: string): Fencer[] {
    if (!this.db) throw new Error('Database not open');
    const results: Fencer[] = [];
    const stmt = this.db.prepare('SELECT * FROM fencers WHERE competition_id = ? ORDER BY ref');
    stmt.bind([competitionId]);
    while (stmt.step()) {
      results.push(this.parseFencerRow(stmt.getAsObject()));
    }
    stmt.free();
    return results;
  }

  public getFencerPhotos(
    competitionId: string
  ): { id: string; license: string | null; lastName: string; firstName: string; photo: string }[] {
    if (!this.db) throw new Error('Database not open');
    const results: {
      id: string;
      license: string | null;
      lastName: string;
      firstName: string;
      photo: string;
    }[] = [];
    const stmt = this.db.prepare(
      'SELECT id, license, last_name, first_name, photo FROM fencers WHERE competition_id = ? AND photo IS NOT NULL'
    );
    stmt.bind([competitionId]);
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push({
        id: row.id as string,
        license: (row.license as string | null) || null,
        lastName: row.last_name as string,
        firstName: row.first_name as string,
        photo: row.photo as string,
      });
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

    const selectStmt = this.db.prepare(
      'SELECT id FROM fencers WHERE competition_id = ? AND license = ? LIMIT 1'
    );
    const updateStmt = this.db.prepare(
      'UPDATE fencers SET photo = ?, updated_at = ? WHERE competition_id = ? AND license = ?'
    );

    for (const { license, photo } of photos) {
      selectStmt.bind([competitionId, license]);
      const exists = selectStmt.step();
      selectStmt.reset();

      if (exists) {
        updateStmt.bind([photo, now, competitionId, license]);
        updateStmt.step();
        updateStmt.reset();
        matched++;
      }
    }

    selectStmt.free();
    updateStmt.free();
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
        if (existing.photo && !updates.photo) delete updates.photo;
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
      this.run(`UPDATE fencers SET ${setClauses.join(', ')} WHERE id = ?`, values);
    }

    this.save();
  }

  public deleteFencer(id: string): void {
    if (!this.db) throw new Error('Database not open');

    // Vérifier que le tireur existe
    const stmt = this.db.prepare('SELECT id, last_name FROM fencers WHERE id = ?');
    stmt.bind([id]);
    const exists = stmt.step();
    stmt.free();

    if (!exists) {
      throw new Error(`Tireur avec l'ID ${id} non trouvé`);
    }

    try {
      // Supprimer d'abord les associations pool_fencers
      this.run('DELETE FROM pool_fencers WHERE fencer_id = ?', [id]);

      // Supprimer les matchs où ce tireur participe
      this.run(
        'DELETE FROM matches WHERE fencer_a_id = ? OR fencer_b_id = ?',
        [id, id]
      );

      // Supprimer le tireur
      this.run('DELETE FROM fencers WHERE id = ?', [id]);

      // Vérifier que la suppression a réussi
      if (this.db.getRowsModified() === 0) {
        throw new Error(`Échec de la suppression du tireur ${id}`);
      }

      this.save();
    } catch (error) {
      console.error('Erreur lors de la suppression du tireur:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Erreur de base de données lors de la suppression du tireur: ${errorMessage}`
      );
    }
  }

  public deleteAllFencers(competitionId?: string): void {
    if (!this.db) throw new Error('Database not open');
    
    try {
      if (competitionId) {
        // Suppression filtrée par compétition
        this.run(
          `DELETE FROM pool_fencers WHERE fencer_id IN (SELECT id FROM fencers WHERE competition_id = ?)`,
          [competitionId]
        );
        this.run(
          `DELETE FROM matches WHERE fencer_a_id IN (SELECT id FROM fencers WHERE competition_id = ?) OR fencer_b_id IN (SELECT id FROM fencers WHERE competition_id = ?)`,
          [competitionId, competitionId]
        );
        this.run('DELETE FROM fencers WHERE competition_id = ?', [competitionId]);
      } else {
        // Suppression de tous les tireurs
        this.run('DELETE FROM pool_fencers');
        this.run('DELETE FROM matches');
        this.run('DELETE FROM fencers');
      }
      this.save();
    } catch (error) {
      console.error('Erreur lors de la suppression des tireurs:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Erreur de base de données lors de la suppression des tireurs: ${errorMessage}`);
    }
  }

  // Match CRUD
  public createMatch(match: Partial<Match>, poolId?: string): Match {
    if (!this.db) throw new Error('Database not open');
    const now = new Date().toISOString();
    const id = match.id || uuidv4();
    this.run(
      `INSERT INTO matches (id, number, pool_id, fencer_a_id, fencer_b_id, max_score, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        match.number || 1,
        poolId || null,
        match.fencerA?.id || (match as any).fencerAId || null,
        match.fencerB?.id || (match as any).fencerBId || null,
        match.maxScore || 5,
        'not_started',
        now,
        now,
      ]
    );
    this.save();
    return this.getMatch(id)!;
  }

  // Batch upsert — une transaction SQLite pour N matchs, un seul IPC call
  public upsertMultipleTableauMatches(
    competitionId: string,
    matches: Array<{
      matchId: string;
      round: number;
      position: number;
      fencerAId?: string | null;
      fencerBId?: string | null;
      scoreA?: any | null;
      scoreB?: any | null;
      status?: string;
      maxScore?: number;
      isBye?: boolean;
    }>
  ): void {
    if (!this.db) throw new Error('Database not open');
    if (matches.length === 0) return;

    const now = new Date().toISOString();
    this.db.run('BEGIN');
    try {
      const stmt = this.db.prepare(`
        INSERT INTO matches
          (id, number, table_id, fencer_a_id, fencer_b_id, score_a, score_b, max_score, status, round, position, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          fencer_a_id = excluded.fencer_a_id,
          fencer_b_id = excluded.fencer_b_id,
          score_a     = excluded.score_a,
          score_b     = excluded.score_b,
          max_score   = excluded.max_score,
          status      = excluded.status,
          round       = excluded.round,
          position    = excluded.position,
          updated_at  = excluded.updated_at
      `);
      for (const m of matches) {
        const dbId = `${competitionId}-${m.matchId}`;
        stmt.bind([
          dbId,
          parseInt(m.matchId.replace('-', '')) || 0,
          competitionId,
          m.fencerAId ?? null,
          m.fencerBId ?? null,
          m.scoreA != null ? JSON.stringify(m.scoreA) : null,
          m.scoreB != null ? JSON.stringify(m.scoreB) : null,
          m.maxScore ?? 15,
          m.status ?? 'not_started',
          m.round,
          m.position,
          now,
          now,
        ]);
        stmt.step();
        stmt.reset();
      }
      stmt.free();
      this.db.run('COMMIT');
    } catch (error) {
      this.db.run('ROLLBACK');
      throw error;
    }
    this.isDirty = true;
    this.save();
  }

  public upsertTableauMatch(params: {
    competitionId: string;
    matchId: string; // ex: '3-0', '2-0', '4-1'
    round: number;
    position: number;
    fencerAId?: string | null;
    fencerBId?: string | null;
    scoreA?: any | null;
    scoreB?: any | null;
    status?: string;
    maxScore?: number;
    isBye?: boolean;
  }): void {
    if (!this.db) throw new Error('Database not open');
    const now = new Date().toISOString();
    const dbId = `${params.competitionId}-${params.matchId}`;
    const status = params.status ?? 'not_started';
    const exists = !!this.getMatch(dbId);
    if (!exists) {
      this.run(
        `INSERT INTO matches (id, number, table_id, fencer_a_id, fencer_b_id, max_score, status, round, position, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          dbId,
          parseInt(params.matchId.replace('-', '')) || 0,
          params.competitionId,
          params.fencerAId ?? null,
          params.fencerBId ?? null,
          params.maxScore ?? 15,
          status,
          params.round,
          params.position,
          now,
          now,
        ]
      );
    } else {
      this.run(
        `UPDATE matches SET fencer_a_id=?, fencer_b_id=?, score_a=?, score_b=?, status=?, round=?, position=?, updated_at=? WHERE id=?`,
        [
          params.fencerAId ?? null,
          params.fencerBId ?? null,
          params.scoreA != null ? JSON.stringify(params.scoreA) : null,
          params.scoreB != null ? JSON.stringify(params.scoreB) : null,
          status,
          params.round,
          params.position,
          now,
          dbId,
        ]
      );
    }
    this.save();
  }

  public getTableauMatchesForExport(competitionId: string): Array<{
    id: string; round: number; position: number; isBye: boolean;
    fencerA: { firstName?: string; lastName: string; club?: string } | null;
    fencerB: { firstName?: string; lastName: string; club?: string } | null;
    scoreA: number | null; scoreB: number | null;
    winner: { id: string } | null;
  }> {
    if (!this.db) throw new Error('Database not open');
    const stmt = this.db.prepare(
      `SELECT m.id, m.round, m.position,
              m.fencer_a_id, m.fencer_b_id, m.score_a, m.score_b,
              fa.first_name AS fa_first, fa.last_name AS fa_last, fa.club AS fa_club,
              fb.first_name AS fb_first, fb.last_name AS fb_last, fb.club AS fb_club
       FROM matches m
       LEFT JOIN fencers fa ON fa.id = m.fencer_a_id
       LEFT JOIN fencers fb ON fb.id = m.fencer_b_id
       WHERE m.table_id = ? AND m.round IS NOT NULL
       ORDER BY m.round, m.position`
    );
    stmt.bind([competitionId]);
    const results: ReturnType<typeof this.getTableauMatchesForExport> = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      let scoreAVal: number | null = null;
      let scoreBVal: number | null = null;
      let winner: { id: string } | null = null;
      try {
        if (row.score_a) {
          const sa = JSON.parse(row.score_a as string);
          scoreAVal = sa.value ?? null;
          if (sa.isVictory && row.fencer_a_id) winner = { id: row.fencer_a_id as string };
        }
        if (row.score_b) {
          const sb = JSON.parse(row.score_b as string);
          scoreBVal = sb.value ?? null;
          if (sb.isVictory && row.fencer_b_id) winner = { id: row.fencer_b_id as string };
        }
      } catch { /* skip bad score JSON */ }
      results.push({
        id: row.id as string,
        round: row.round as number,
        position: row.position as number,
        isBye: (!!row.fencer_a_id) !== (!!row.fencer_b_id),
        fencerA: row.fencer_a_id ? {
          firstName: row.fa_first as string | undefined,
          lastName: (row.fa_last as string) || '',
          club: row.fa_club as string | undefined,
        } : null,
        fencerB: row.fencer_b_id ? {
          firstName: row.fb_first as string | undefined,
          lastName: (row.fb_last as string) || '',
          club: row.fb_club as string | undefined,
        } : null,
        scoreA: scoreAVal,
        scoreB: scoreBVal,
        winner,
      });
    }
    stmt.free();
    return results;
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
      referee: row.referee_id ? (this.getReferee(row.referee_id as string) ?? undefined) : undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  public getPoolFencers(poolId: string): Fencer[] {
    if (!this.db) throw new Error('Database not open');
    const results: Fencer[] = [];
    const stmt = this.db.prepare(
      'SELECT f.* FROM fencers f INNER JOIN pool_fencers pf ON f.id = pf.fencer_id WHERE pf.pool_id = ? ORDER BY pf.position'
    );
    stmt.bind([poolId]);
    while (stmt.step()) {
      results.push(this.parseFencerRow(stmt.getAsObject()));
    }
    stmt.free();
    return results;
  }

  public getMatchesByPool(poolId: string): Match[] {
    if (!this.db) throw new Error('Database not open');
    const matchRows: any[] = [];
    const stmt = this.db.prepare('SELECT * FROM matches WHERE pool_id = ? ORDER BY number');
    stmt.bind([poolId]);
    while (stmt.step()) matchRows.push(stmt.getAsObject());
    stmt.free();
    if (matchRows.length === 0) return [];

    // Batch-fetch all fencers referenced by these matches in a single query
    const fencerIds = new Set<string>();
    for (const row of matchRows) {
      if (row.fencer_a_id) fencerIds.add(row.fencer_a_id as string);
      if (row.fencer_b_id) fencerIds.add(row.fencer_b_id as string);
    }
    const fencersById = new Map<string, Fencer>();
    if (fencerIds.size > 0) {
      const placeholders = Array.from({ length: fencerIds.size }, () => '?').join(',');
      const fStmt = this.db.prepare(`SELECT * FROM fencers WHERE id IN (${placeholders})`);
      fStmt.bind(Array.from(fencerIds));
      while (fStmt.step()) {
        const fRow = fStmt.getAsObject();
        fencersById.set(fRow.id as string, this.parseFencerRow(fRow));
      }
      fStmt.free();
    }

    // Batch-fetch referees referenced by these matches
    const refereeIds = new Set<string>();
    for (const row of matchRows) {
      if (row.referee_id) refereeIds.add(row.referee_id as string);
    }
    const refereesById = new Map<string, Referee>();
    if (refereeIds.size > 0) {
      const placeholders = Array.from({ length: refereeIds.size }, () => '?').join(',');
      const rStmt = this.db.prepare(`SELECT * FROM referees WHERE id IN (${placeholders})`);
      rStmt.bind(Array.from(refereeIds));
      while (rStmt.step()) {
        const rRow = rStmt.getAsObject();
        refereesById.set(rRow.id as string, this.rowToReferee(rRow));
      }
      rStmt.free();
    }

    return matchRows.map(row => ({
      id: row.id as string,
      number: row.number as number,
      fencerA: row.fencer_a_id ? (fencersById.get(row.fencer_a_id as string) ?? null) : null,
      fencerB: row.fencer_b_id ? (fencersById.get(row.fencer_b_id as string) ?? null) : null,
      scoreA: row.score_a ? JSON.parse(row.score_a as string) : null,
      scoreB: row.score_b ? JSON.parse(row.score_b as string) : null,
      maxScore: row.max_score as number,
      status: row.status as MatchStatus,
      poolId: row.pool_id as string,
      tableId: row.table_id as string,
      round: row.round as number,
      referee: row.referee_id ? (refereesById.get(row.referee_id as string) ?? undefined) : undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    }));
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

    // First get all pools for the competition
    // Try to get pools through phases table first
    let poolIds: string[] = [];

    try {
      const poolsStmt = this.db.prepare(
        'SELECT id FROM pools WHERE phase_id IN (SELECT id FROM phases WHERE competition_id = ?) ORDER BY number'
      );
      poolsStmt.bind([competitionId]);

      while (poolsStmt.step()) {
        poolIds.push(poolsStmt.getAsObject().id as string);
      }
      poolsStmt.free();
    } catch (e) {
      console.warn('[Database] Falling back to pool_fencers approach for getPendingMatches:', e);
    }

    // If no pools found through phases, try through pool_fencers -> fencers
    if (poolIds.length === 0) {
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
      } catch (e) {
        console.warn('[Database] Alternative approach also failed:', e);
      }
    }

    // Then get pending matches from those pools, ordered by pool number then match number
    if (poolIds.length > 0) {
      const placeholders = poolIds.map(() => '?').join(',');
      const matchesStmt = this.db.prepare(
        `SELECT m.id FROM matches m JOIN pools p ON m.pool_id = p.id WHERE m.pool_id IN (${placeholders}) AND m.status IN ('not_started', 'in_progress') ORDER BY p.number, m.number`
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

    // Get all pools for the competition via pool_fencers -> fencers
    const poolIds: string[] = [];
    try {
      const poolsStmt = this.db.prepare(`
        SELECT DISTINCT p.id FROM pools p
        INNER JOIN pool_fencers pf ON p.id = pf.pool_id
        INNER JOIN fencers f ON pf.fencer_id = f.id
        WHERE f.competition_id = ?
        ORDER BY p.number
      `);
      poolsStmt.bind([competitionId]);

      while (poolsStmt.step()) {
        poolIds.push(poolsStmt.getAsObject().id as string);
      }
      poolsStmt.free();
    } catch (e) {
      console.warn('[Database] Error getting pools via pool_fencers:', e);
      return results;
    }

    // Get pending matches from those pools, ordered by pool number then match number
    if (poolIds.length > 0) {
      const placeholders = poolIds.map(() => '?').join(',');
      const matchesStmt = this.db.prepare(
        `SELECT m.id FROM matches m JOIN pools p ON m.pool_id = p.id WHERE m.pool_id IN (${placeholders}) AND m.status IN ('not_started', 'in_progress') ORDER BY p.number, m.number`
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

  // Récupère les matchs directement via la table fencers, sans passer par phases ou pool_fencers
  public getPendingMatchesDirectly(competitionId: string): Match[] {
    if (!this.db) throw new Error('Database not open');
    const results: Match[] = [];

    try {
      const matchesStmt = this.db.prepare(`
        SELECT DISTINCT m.id FROM matches m
        LEFT JOIN pools p ON m.pool_id = p.id
        INNER JOIN fencers fA ON m.fencer_a_id = fA.id
        INNER JOIN fencers fB ON m.fencer_b_id = fB.id
        WHERE (fA.competition_id = ? OR fB.competition_id = ?)
        AND m.status IN ('not_started', 'in_progress')
        ORDER BY p.number, m.number
      `);
      matchesStmt.bind([competitionId, competitionId]);

      while (matchesStmt.step()) {
        const match = this.getMatch(matchesStmt.getAsObject().id as string);
        if (match) results.push(match);
      }
      matchesStmt.free();
    } catch (e) {
      console.error('[Database] getPendingMatchesDirectly: Error:', e);
    }

    // Fallback: filtrer manuellement si la jointure échoue
    if (results.length === 0) {
      try {
        const allMatchesStmt = this.db.prepare('SELECT id FROM matches WHERE status IN (?, ?)');
        allMatchesStmt.bind(['not_started', 'in_progress']);

        while (allMatchesStmt.step()) {
          const matchId = allMatchesStmt.getAsObject().id as string;
          const match = this.getMatch(matchId);
          if (match && match.fencerA && match.fencerB) {
            const fencerACompetition = this.getFencerCompetition(match.fencerA.id);
            const fencerBCompetition = this.getFencerCompetition(match.fencerB.id);
            if (fencerACompetition === competitionId || fencerBCompetition === competitionId) {
              results.push(match);
            }
          }
        }
        allMatchesStmt.free();
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

  public updateMatch(id: string, updates: Partial<Match> & { refereeId?: string }): void {
    if (!this.db) throw new Error('Database not open');
    const now = new Date().toISOString();
    if (updates.scoreA !== undefined)
      this.run('UPDATE matches SET score_a = ?, updated_at = ? WHERE id = ?', [
        JSON.stringify(updates.scoreA),
        now,
        id,
      ]);
    if (updates.scoreB !== undefined)
      this.run('UPDATE matches SET score_b = ?, updated_at = ? WHERE id = ?', [
        JSON.stringify(updates.scoreB),
        now,
        id,
      ]);
    if (updates.status !== undefined)
      this.run('UPDATE matches SET status = ?, updated_at = ? WHERE id = ?', [
        updates.status,
        now,
        id,
      ]);
    if (updates.refereeId !== undefined)
      this.run('UPDATE matches SET referee_id = ?, updated_at = ? WHERE id = ?', [
        updates.refereeId,
        now,
        id,
      ]);
    this.save();
  }

  public updatePool(pool: Pool): void {
    if (!this.db) throw new Error('Database not open');
    const now = new Date().toISOString();

    // Mettre à jour les informations de la poule
    this.run('UPDATE pools SET updated_at = ?, is_complete = ? WHERE id = ?', [
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

  public updatePoolReferee(poolId: string, refereeId: string | null): void {
    if (!this.db) throw new Error('Database not open');
    const now = new Date().toISOString();
    this.run('UPDATE pools SET referee_id = ?, updated_at = ? WHERE id = ?', [refereeId, now, poolId]);
    this.save();
  }

  // ─── Pool CRUD ──────────────────────────────────────────────────────────────

  public clearPoolsForPhase(phaseId: string): void {
    if (!this.db) throw new Error('Database not open');
    this.run('DELETE FROM pool_signatures WHERE pool_id IN (SELECT id FROM pools WHERE phase_id = ?)', [phaseId]);
    this.run('DELETE FROM matches WHERE pool_id IN (SELECT id FROM pools WHERE phase_id = ?)', [phaseId]);
    this.run('DELETE FROM pool_fencers WHERE pool_id IN (SELECT id FROM pools WHERE phase_id = ?)', [phaseId]);
    this.run('DELETE FROM pools WHERE phase_id = ?', [phaseId]);
    this.save();
  }

  public createPool(phaseId: string, number: number, poolId?: string): Pool {
    if (!this.db) throw new Error('Database not open');
    const id = poolId || uuidv4();
    const now = new Date().toISOString();
    this.run(
      `INSERT INTO pools (id, phase_id, number, is_complete, has_error, created_at, updated_at)
       VALUES (?, ?, ?, 0, 0, ?, ?)`,
      [id, phaseId, number, now, now]
    );
    this.save();
    return {
      id,
      phaseId,
      number,
      fencers: [],
      matches: [],
      isComplete: false,
      hasError: false,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    } as unknown as Pool;
  }

  public addFencerToPool(poolId: string, fencerId: string, position: number): void {
    if (!this.db) throw new Error('Database not open');
    this.run(
      `INSERT OR REPLACE INTO pool_fencers (pool_id, fencer_id, position) VALUES (?, ?, ?)`,
      [poolId, fencerId, position]
    );
    this.save();
  }

  public addFencerToPoolMidCompetition(poolId: string, fencerId: string, maxScore: number): Pool {
    if (!this.db) throw new Error('Database not open');
    const existingFencers = this.getPoolFencers(poolId);
    if (existingFencers.some(f => f.id === fencerId)) {
      throw new Error('Fencer already in this pool');
    }

    this.db.run('BEGIN');
    try {
      const nextPosition = existingFencers.length;
      this.run(
        `INSERT OR REPLACE INTO pool_fencers (pool_id, fencer_id, position) VALUES (?, ?, ?)`,
        [poolId, fencerId, nextPosition]
      );

      const maxNumRow = this.db.exec(
        `SELECT COALESCE(MAX(number), 0) AS max_num FROM matches WHERE pool_id = '${poolId}'`
      );
      let nextMatchNumber: number =
        (maxNumRow[0]?.values[0]?.[0] as number | null) ?? 0;

      const now = new Date().toISOString();
      for (const existing of existingFencers) {
        nextMatchNumber += 1;
        const matchId = uuidv4();
        this.run(
          `INSERT INTO matches (id, number, pool_id, fencer_a_id, fencer_b_id, max_score, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [matchId, nextMatchNumber, poolId, fencerId, existing.id, maxScore, 'not_started', now, now]
        );
      }
      this.db.run('COMMIT');
    } catch (err) {
      this.db.run('ROLLBACK');
      throw err;
    }

    this.save();
    const phaseId = this.db.exec(`SELECT phase_id FROM pools WHERE id = '${poolId}'`)[0]?.values[0]?.[0] as string | undefined;
    if (!phaseId) throw new Error(`Pool ${poolId} introuvable après ajout`);
    const updated = this.getPoolsByPhase(phaseId).find(p => p.id === poolId);
    if (!updated) throw new Error(`Poule mise à jour introuvable`);
    return updated;
  }

  public getPoolsByPhase(phaseId: string): Pool[] {
    if (!this.db) throw new Error('Database not open');
    const results: Pool[] = [];
    const stmt = this.db.prepare(
      'SELECT id, phase_id, number, is_complete, has_error, referee_id, created_at, updated_at FROM pools WHERE phase_id = ? ORDER BY number'
    );
    stmt.bind([phaseId]);
    while (stmt.step()) {
      const row = stmt.getAsObject();
      const poolId = row.id as string;
      const fencers = this.getPoolFencers(poolId);
      const matches = this.getMatchesByPool(poolId);
      let referees: Referee[] = [];
      if (row.referee_id) {
        const ref = this.getReferee(row.referee_id as string);
        if (ref) referees = [ref];
      }
      results.push({
        id: poolId,
        phaseId: row.phase_id as string,
        number: row.number as number,
        fencers,
        matches,
        referees,
        isComplete: row.is_complete === 1,
        hasError: row.has_error === 1,
        createdAt: new Date(row.created_at as string),
        updatedAt: new Date(row.updated_at as string),
      } as unknown as Pool);
    }
    stmt.free();
    return results;
  }

  // ─── Phase CRUD ─────────────────────────────────────────────────────────────

  public createPhase(competitionId: string, type: string, order: number, name: string): Phase {
    if (!this.db) throw new Error('Database not open');
    const id = uuidv4();
    const now = new Date().toISOString();
    this.run(
      `INSERT INTO phases (id, competition_id, name, type, order_index, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [id, competitionId, name, type, order, now, now]
    );
    this.save();
    return {
      id,
      competitionId,
      type: type as PhaseType,
      order,
      name,
      isComplete: false,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    } as Phase;
  }

  public getPhase(id: string): Phase | null {
    if (!this.db) return null;
    const stmt = this.db.prepare('SELECT * FROM phases WHERE id = ?');
    stmt.bind([id]);
    if (!stmt.step()) { stmt.free(); return null; }
    const row = stmt.getAsObject();
    stmt.free();
    return {
      id: row.id as string,
      competitionId: row.competition_id as string,
      type: row.type as PhaseType,
      order: row.order_index as number,
      name: row.name as string,
      isComplete: row.status === 'complete',
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    } as Phase;
  }

  public getPhasesByCompetition(competitionId: string): Phase[] {
    if (!this.db) return [];
    const results: Phase[] = [];
    const stmt = this.db.prepare(
      'SELECT * FROM phases WHERE competition_id = ? ORDER BY order_index ASC'
    );
    stmt.bind([competitionId]);
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push({
        id: row.id as string,
        competitionId: row.competition_id as string,
        type: row.type as PhaseType,
        order: row.order_index as number,
        name: row.name as string,
        isComplete: row.status === 'complete',
        createdAt: new Date(row.created_at as string),
        updatedAt: new Date(row.updated_at as string),
      } as Phase);
    }
    stmt.free();
    return results;
  }

  public updatePhase(id: string, updates: { name?: string; isComplete?: boolean }): void {
    if (!this.db) throw new Error('Database not open');
    const now = new Date().toISOString();
    const setClauses: string[] = [];
    const values: unknown[] = [];
    if (updates.name !== undefined) { setClauses.push('name = ?'); values.push(updates.name); }
    if (updates.isComplete !== undefined) {
      setClauses.push('status = ?');
      values.push(updates.isComplete ? 'complete' : 'pending');
    }
    if (setClauses.length > 0) {
      setClauses.push('updated_at = ?');
      values.push(now, id);
      this.run(`UPDATE phases SET ${setClauses.join(', ')} WHERE id = ?`, values);
      this.save();
    }
  }

  public deletePhase(id: string): void {
    if (!this.db) throw new Error('Database not open');
    this.run('DELETE FROM pool_signatures WHERE pool_id IN (SELECT id FROM pools WHERE phase_id = ?)', [id]);
    this.run('DELETE FROM matches WHERE pool_id IN (SELECT id FROM pools WHERE phase_id = ?)', [id]);
    this.run('DELETE FROM pool_fencers WHERE pool_id IN (SELECT id FROM pools WHERE phase_id = ?)', [id]);
    this.run('DELETE FROM pools WHERE phase_id = ?', [id]);
    this.run('DELETE FROM phases WHERE id = ?', [id]);
    this.save();
  }

  // ─── Referee CRUD ────────────────────────────────────────────────────────────

  public createReferee(
    competitionId: string,
    data: { name: string; gender?: string; nationality?: string; club?: string; license?: string; category?: string }
  ): Referee {
    if (!this.db) throw new Error('Database not open');
    const id = uuidv4();
    const now = new Date().toISOString();

    // Auto-increment ref number
    const refStmt = this.db.prepare(
      'SELECT COALESCE(MAX(ref), 0) + 1 AS next_ref FROM referees WHERE competition_id = ?'
    );
    refStmt.bind([competitionId]);
    refStmt.step();
    const nextRef = (refStmt.getAsObject().next_ref as number) ?? 1;
    refStmt.free();

    this.run(
      `INSERT INTO referees (id, competition_id, ref, name, gender, nationality, club, license, category, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
      [id, competitionId, nextRef, data.name, data.gender ?? null, data.nationality ?? 'FRA',
       data.club ?? null, data.license ?? null, data.category ?? null, now, now]
    );
    this.save();
    return {
      id,
      ref: nextRef,
      lastName: data.name?.split(' ').slice(-1)[0] ?? '',
      firstName: data.name?.split(' ').slice(0, -1).join(' ') ?? '',
      gender: data.gender ?? 'M',
      nationality: data.nationality ?? 'FRA',
      club: data.club,
      license: data.license,
      category: data.category,
      status: 'available',
      createdAt: new Date(now),
      updatedAt: new Date(now),
    } as Referee;
  }

  public getReferee(id: string): Referee | null {
    if (!this.db) return null;
    const stmt = this.db.prepare('SELECT * FROM referees WHERE id = ?');
    stmt.bind([id]);
    if (!stmt.step()) { stmt.free(); return null; }
    const row = stmt.getAsObject();
    stmt.free();
    return this.rowToReferee(row);
  }

  public getRefereesByCompetition(competitionId: string): Referee[] {
    if (!this.db) return [];
    const results: Referee[] = [];
    const stmt = this.db.prepare(
      'SELECT * FROM referees WHERE competition_id = ? ORDER BY ref ASC'
    );
    stmt.bind([competitionId]);
    while (stmt.step()) {
      results.push(this.rowToReferee(stmt.getAsObject()));
    }
    stmt.free();
    return results;
  }

  public updateReferee(id: string, updates: { name?: string; gender?: string; nationality?: string; club?: string; license?: string; category?: string; status?: string }): void {
    if (!this.db) throw new Error('Database not open');
    const now = new Date().toISOString();
    const fieldMap: Record<string, string> = { name: 'name', gender: 'gender', nationality: 'nationality', club: 'club', license: 'license', category: 'category', status: 'status' };
    const setClauses: string[] = [];
    const values: unknown[] = [];
    for (const [key, col] of Object.entries(fieldMap)) {
      if (key in updates) { setClauses.push(`${col} = ?`); values.push((updates as any)[key]); }
    }
    if (setClauses.length > 0) {
      setClauses.push('updated_at = ?');
      values.push(now, id);
      this.run(`UPDATE referees SET ${setClauses.join(', ')} WHERE id = ?`, values);
      this.save();
    }
  }

  public deleteReferee(id: string): void {
    if (!this.db) throw new Error('Database not open');
    this.run('DELETE FROM referees WHERE id = ?', [id]);
    this.save();
  }

  private rowToReferee(row: any): Referee {
    return {
      id: row.id as string,
      ref: row.ref as number,
      lastName: (row.name as string)?.split(' ').slice(-1)[0] ?? '',
      firstName: (row.name as string)?.split(' ').slice(0, -1).join(' ') ?? '',
      gender: (row.gender as Gender) ?? 'M',
      nationality: row.nationality as string,
      club: row.club as string | undefined,
      license: row.license as string | undefined,
      category: row.category as string | undefined,
      status: (row.status as 'available' | 'assigned' | 'unavailable') ?? 'available',
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    } as Referee;
  }

  public getMatchesWithReferees(competitionId: string): Array<{
    matchId: string; matchNumber: number; poolName: string | null;
    fencerAName: string; fencerBName: string;
    scoreA: number | null; scoreB: number | null; status: string;
    refereeId: string | null; refereeName: string | null;
  }> {
    if (!this.db) return [];
    const results: any[] = [];
    const stmt = this.db.prepare(`
      SELECT m.id AS match_id, m.number AS match_number,
             p.name AS pool_name,
             fa.last_name || ' ' || fa.first_name AS fencer_a_name,
             fb.last_name || ' ' || fb.first_name AS fencer_b_name,
             m.score_a, m.score_b, m.status,
             r.id AS referee_id, r.name AS referee_name
      FROM matches m
      LEFT JOIN pools p ON m.pool_id = p.id
      LEFT JOIN phases ph ON p.phase_id = ph.id
      LEFT JOIN fencers fa ON m.fencer_a_id = fa.id
      LEFT JOIN fencers fb ON m.fencer_b_id = fb.id
      LEFT JOIN referees r ON m.referee_id = r.id
      WHERE ph.competition_id = ? AND m.referee_id IS NOT NULL
      ORDER BY p.name, m.number
    `);
    stmt.bind([competitionId]);
    while (stmt.step()) {
      const row = stmt.getAsObject();
      const scoreARaw = row.score_a ? JSON.parse(row.score_a as string) : null;
      const scoreBRaw = row.score_b ? JSON.parse(row.score_b as string) : null;
      results.push({
        matchId: row.match_id as string,
        matchNumber: row.match_number as number,
        poolName: (row.pool_name as string) ?? null,
        fencerAName: (row.fencer_a_name as string) ?? '?',
        fencerBName: (row.fencer_b_name as string) ?? '?',
        scoreA: scoreARaw?.value ?? null,
        scoreB: scoreBRaw?.value ?? null,
        status: row.status as string,
        refereeId: (row.referee_id as string) ?? null,
        refereeName: (row.referee_name as string) ?? null,
      });
    }
    stmt.free();
    return results;
  }

  // ─── Touch / Card read methods ───────────────────────────────────────────────

  public getTouches(matchId: string): Array<{
    id: string; fencerId: string; zone: string; points: number;
    timestamp: string; isValidInSuddenDeath: boolean; isReversed: boolean;
  }> {
    if (!this.db) return [];
    const results: any[] = [];
    const stmt = this.db.prepare(
      'SELECT id, fencer_id, zone, points, timestamp, is_valid_in_sudden_death, is_reversed FROM match_touches WHERE match_id = ? ORDER BY timestamp ASC'
    );
    stmt.bind([matchId]);
    while (stmt.step()) {
      const r = stmt.getAsObject();
      results.push({
        id: r.id as string,
        fencerId: r.fencer_id as string,
        zone: r.zone as string,
        points: r.points as number,
        timestamp: r.timestamp as string,
        isValidInSuddenDeath: r.is_valid_in_sudden_death === 1,
        isReversed: r.is_reversed === 1,
      });
    }
    stmt.free();
    return results;
  }

  public getCards(matchId: string): Array<{
    id: string; fencerId: string; cardType: string; reason: string;
    cardGroup: number; timestamp: string; pointsAwarded: number; resultingExclusion: boolean;
  }> {
    if (!this.db) return [];
    const results: any[] = [];
    const stmt = this.db.prepare(
      'SELECT id, fencer_id, card_type, reason, card_group, timestamp, points_awarded, resulting_exclusion FROM match_cards WHERE match_id = ? ORDER BY timestamp ASC'
    );
    stmt.bind([matchId]);
    while (stmt.step()) {
      const r = stmt.getAsObject();
      results.push({
        id: r.id as string,
        fencerId: r.fencer_id as string,
        cardType: r.card_type as string,
        reason: r.reason as string,
        cardGroup: r.card_group as number,
        timestamp: r.timestamp as string,
        pointsAwarded: r.points_awarded as number,
        resultingExclusion: r.resulting_exclusion === 1,
      });
    }
    stmt.free();
    return results;
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
    this.run(
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
    this.run(
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
    this.run(
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

  public saveArenaExit(exit: {
    id: string;
    matchId: string;
    fencerId: string;
    exitType: string;
    timestamp: string;
    pointsAwarded: number;
  }): void {
    if (!this.db) throw new Error('Database not open');
    this.run(
      `INSERT OR REPLACE INTO match_arena_exits
        (id, match_id, fencer_id, exit_type, timestamp, points_awarded)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [exit.id, exit.matchId, exit.fencerId, exit.exitType, exit.timestamp, exit.pointsAwarded]
    );
    this.save();
  }

  public getFencerCompetitionStats(fencerId: string): {
    fencerId: string;
    fencerLastName: string;
    fencerFirstName: string;
    fencerClub?: string;
    competitionId: string;
    touchesZoneA: number;
    touchesZoneB: number;
    touchesZoneC: number;
    totalTouchPoints: number;
    whiteCards: number;
    yellowCards: number;
    redCards: number;
    cardsByReason: Record<string, number>;
    arenaExits: number;
    matchesPlayed: number;
    totalDurationSeconds: number;
    averageDurationSeconds: number;
    matchesFinishedEarly: number;
  } {
    if (!this.db) throw new Error('Database not open');

    // Infos du combattant
    const fencerRow = (() => {
      const s = this.db.prepare(
        'SELECT last_name, first_name, club, competition_id FROM fencers WHERE id = ?'
      );
      s.bind([fencerId]);
      const ok = s.step();
      const row = ok ? s.getAsObject() : null;
      s.free();
      return row;
    })();

    const empty = {
      fencerId,
      fencerLastName: (fencerRow?.last_name as string) ?? '',
      fencerFirstName: (fencerRow?.first_name as string) ?? '',
      fencerClub: (fencerRow?.club as string) || undefined,
      competitionId: (fencerRow?.competition_id as string) ?? '',
      touchesZoneA: 0, touchesZoneB: 0, touchesZoneC: 0, totalTouchPoints: 0,
      whiteCards: 0, yellowCards: 0, redCards: 0, cardsByReason: {} as Record<string, number>,
      arenaExits: 0,
      matchesPlayed: 0, totalDurationSeconds: 0, averageDurationSeconds: 0, matchesFinishedEarly: 0,
    };

    // Touches par zone (non-reversed = touches données)
    const touchStmt = this.db.prepare(
      `SELECT zone, SUM(points) AS pts, COUNT(*) AS cnt
       FROM match_touches WHERE fencer_id = ? AND is_reversed = 0
       GROUP BY zone`
    );
    touchStmt.bind([fencerId]);
    while (touchStmt.step()) {
      const r = touchStmt.getAsObject();
      const zone = r.zone as string;
      const pts = r.pts as number;
      if (zone === 'A') { empty.touchesZoneA = r.cnt as number; empty.totalTouchPoints += pts; }
      else if (zone === 'B') { empty.touchesZoneB = r.cnt as number; empty.totalTouchPoints += pts; }
      else if (zone === 'C') { empty.touchesZoneC = r.cnt as number; empty.totalTouchPoints += pts; }
    }
    touchStmt.free();

    // Cartons par type et raison
    const cardStmt = this.db.prepare(
      `SELECT card_type, reason, COUNT(*) AS cnt
       FROM match_cards WHERE fencer_id = ?
       GROUP BY card_type, reason`
    );
    cardStmt.bind([fencerId]);
    while (cardStmt.step()) {
      const r = cardStmt.getAsObject();
      const type = (r.card_type as string).toLowerCase();
      const cnt = r.cnt as number;
      if (type === 'white') empty.whiteCards += cnt;
      else if (type === 'yellow') empty.yellowCards += cnt;
      else if (type === 'red') empty.redCards += cnt;
      const reason = r.reason as string;
      if (reason && reason !== 'unknown') {
        empty.cardsByReason[reason] = (empty.cardsByReason[reason] ?? 0) + cnt;
      }
    }
    cardStmt.free();

    // Sorties d'arène
    const exitStmt = this.db.prepare(
      'SELECT COUNT(*) AS cnt FROM match_arena_exits WHERE fencer_id = ?'
    );
    exitStmt.bind([fencerId]);
    if (exitStmt.step()) {
      empty.arenaExits = (exitStmt.getAsObject().cnt as number) ?? 0;
    }
    exitStmt.free();

    // Durée des matchs (matchs terminés où ce tireur a participé)
    const durStmt = this.db.prepare(
      `SELECT COUNT(*) AS total,
              SUM(COALESCE(duration, 0)) AS total_dur,
              SUM(CASE WHEN duration IS NOT NULL AND duration < 180 THEN 1 ELSE 0 END) AS early
       FROM matches
       WHERE (fencer_a_id = ? OR fencer_b_id = ?) AND status = 'finished'`
    );
    durStmt.bind([fencerId, fencerId]);
    if (durStmt.step()) {
      const r = durStmt.getAsObject();
      empty.matchesPlayed = (r.total as number) ?? 0;
      empty.totalDurationSeconds = (r.total_dur as number) ?? 0;
      empty.averageDurationSeconds =
        empty.matchesPlayed > 0
          ? Math.round(empty.totalDurationSeconds / empty.matchesPlayed)
          : 0;
      empty.matchesFinishedEarly = (r.early as number) ?? 0;
    }
    durStmt.free();

    return empty;
  }

  public getCompetitionFencerStats(competitionId: string): ReturnType<typeof this.getFencerCompetitionStats>[] {
    if (!this.db) throw new Error('Database not open');
    const ids: string[] = [];
    const stmt = this.db.prepare('SELECT id FROM fencers WHERE competition_id = ? ORDER BY ref');
    stmt.bind([competitionId]);
    while (stmt.step()) {
      ids.push(stmt.getAsObject().id as string);
    }
    stmt.free();
    return ids.map(id => this.getFencerCompetitionStats(id));
  }

  // ─── Abandon snapshots ──────────────────────────────────────────────────────

  public saveAbandonSnapshot(
    fencerId: string,
    competitionId: string,
    previousStatus: string,
    abandonType: string,
    matchSnapshots: { matchId: string; status: string; scoreA: unknown; scoreB: unknown }[]
  ): void {
    if (!this.db) throw new Error('Database not open');
    const now = new Date().toISOString();
    // Supprime un éventuel snapshot existant pour ce tireur
    this.run('DELETE FROM fencer_abandons WHERE fencer_id = ?', [fencerId]);
    this.run(
      `INSERT INTO fencer_abandons (id, fencer_id, competition_id, previous_status, abandon_type, match_snapshots, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        `abandon-${fencerId}-${Date.now()}`,
        fencerId,
        competitionId,
        previousStatus,
        abandonType,
        JSON.stringify(matchSnapshots),
        now,
      ]
    );
    this.save();
  }

  public getAbandonSnapshot(fencerId: string): {
    id: string;
    fencerId: string;
    competitionId: string;
    previousStatus: string;
    abandonType: string;
    matchSnapshots: { matchId: string; status: string; scoreA: unknown; scoreB: unknown }[];
    createdAt: string;
  } | null {
    if (!this.db) return null;
    const stmt = this.db.prepare(
      'SELECT * FROM fencer_abandons WHERE fencer_id = ? ORDER BY created_at DESC LIMIT 1'
    );
    stmt.bind([fencerId]);
    if (!stmt.step()) {
      stmt.free();
      return null;
    }
    const row = stmt.getAsObject();
    stmt.free();
    return {
      id: row.id as string,
      fencerId: row.fencer_id as string,
      competitionId: row.competition_id as string,
      previousStatus: row.previous_status as string,
      abandonType: row.abandon_type as string,
      matchSnapshots: JSON.parse(row.match_snapshots as string),
      createdAt: row.created_at as string,
    };
  }

  public deleteAbandonSnapshot(fencerId: string): void {
    if (!this.db) return;
    this.run('DELETE FROM fencer_abandons WHERE fencer_id = ?', [fencerId]);
    this.save();
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

  // ─── Bracket nodes (élimination directe) ────────────────────────────────────

  public upsertBracketNode(node: {
    id: string;
    competitionId: string;
    phaseId: string;
    round: number;
    position: number;
    fencerId?: string | null;
    matchId?: string | null;
    isBye?: boolean;
    isThirdPlace?: boolean;
    parentNodeId?: string | null;
  }): void {
    if (!this.db) throw new Error('Database not open');
    const now = new Date().toISOString();
    this.run(
      `INSERT OR REPLACE INTO bracket_nodes
        (id, competition_id, phase_id, round, position, fencer_id, match_id, is_bye, is_third_place, parent_node_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM bracket_nodes WHERE id=?), ?), ?)`,
      [
        node.id, node.competitionId, node.phaseId, node.round, node.position,
        node.fencerId ?? null, node.matchId ?? null,
        node.isBye ? 1 : 0, node.isThirdPlace ? 1 : 0, node.parentNodeId ?? null,
        node.id, now, now,
      ]
    );
    this.save();
  }

  public getBracketNodes(competitionId: string, phaseId: string): any[] {
    if (!this.db) throw new Error('Database not open');
    const stmt = this.db.prepare(
      `SELECT * FROM bracket_nodes WHERE competition_id=? AND phase_id=? ORDER BY round, position`
    );
    stmt.bind([competitionId, phaseId]);
    const rows: any[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows.map(r => ({
      ...r,
      isBye: r.is_bye === 1,
      isThirdPlace: r.is_third_place === 1,
    }));
  }

  public clearBracket(competitionId: string, phaseId: string): void {
    if (!this.db) throw new Error('Database not open');
    this.run(
      `DELETE FROM bracket_nodes WHERE competition_id=? AND phase_id=?`,
      [competitionId, phaseId]
    );
    this.save();
  }

  // ─── Score audit log ─────────────────────────────────────────────────────────

  public logScoreChange(entry: {
    matchId: string;
    arenaId?: string;
    previousScoreA?: any;
    previousScoreB?: any;
    newScoreA: any;
    newScoreB: any;
    changedBy: string;
    reason?: string;
    refereeId?: string;
    refereeName?: string;
    ipAddress?: string;
    poolId?: string;
  }): void {
    if (!this.db) throw new Error('Database not open');
    const { v4: uuidv4gen } = require('uuid');
    this.run(
      `INSERT INTO score_audit_log
        (id, match_id, arena_id, previous_score_a, previous_score_b, new_score_a, new_score_b, changed_by, changed_at, reason, referee_id, referee_name, ip_address, pool_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4gen(),
        entry.matchId,
        entry.arenaId ?? null,
        entry.previousScoreA != null ? JSON.stringify(entry.previousScoreA) : null,
        entry.previousScoreB != null ? JSON.stringify(entry.previousScoreB) : null,
        JSON.stringify(entry.newScoreA),
        JSON.stringify(entry.newScoreB),
        entry.changedBy,
        new Date().toISOString(),
        entry.reason ?? null,
        entry.refereeId ?? null,
        entry.refereeName ?? null,
        entry.ipAddress ?? null,
        entry.poolId ?? null,
      ]
    );
    this.save();
  }

  private parseAuditRow(r: any) {
    return {
      id: r.id as string,
      matchId: r.match_id as string,
      arenaId: r.arena_id as string | null,
      poolId: r.pool_id as string | null,
      matchNumber: r.match_number != null ? Number(r.match_number) : null,
      poolNumber: r.pool_number != null ? Number(r.pool_number) : null,
      previousScoreA: r.previous_score_a ? JSON.parse(r.previous_score_a as string) : null,
      previousScoreB: r.previous_score_b ? JSON.parse(r.previous_score_b as string) : null,
      newScoreA: JSON.parse(r.new_score_a as string),
      newScoreB: JSON.parse(r.new_score_b as string),
      changedBy: r.changed_by as string,
      changedAt: r.changed_at as string,
      reason: r.reason as string | null,
      refereeId: r.referee_id as string | null,
      refereeName: r.referee_name as string | null,
      ipAddress: r.ip_address as string | null,
    };
  }

  public getScoreAuditLog(matchId: string): any[] {
    if (!this.db) throw new Error('Database not open');
    const stmt = this.db.prepare(
      `SELECT sal.*, m.number as match_number, p.number as pool_number
       FROM score_audit_log sal
       LEFT JOIN matches m ON sal.match_id = m.id
       LEFT JOIN pools p ON m.pool_id = p.id
       WHERE sal.match_id=? ORDER BY sal.changed_at ASC`
    );
    stmt.bind([matchId]);
    const rows: any[] = [];
    while (stmt.step()) {
      rows.push(this.parseAuditRow(stmt.getAsObject()));
    }
    stmt.free();
    return rows;
  }

  public getScoreAuditLogByCompetition(competitionId: string): any[] {
    if (!this.db) throw new Error('Database not open');
    const stmt = this.db.prepare(
      `SELECT sal.*, m.number as match_number, p.number as pool_number
       FROM score_audit_log sal
       JOIN matches m ON sal.match_id = m.id
       JOIN pools p ON m.pool_id = p.id
       JOIN phases ph ON p.phase_id = ph.id
       WHERE ph.competition_id = ?
       ORDER BY sal.changed_at DESC`
    );
    stmt.bind([competitionId]);
    const rows: any[] = [];
    while (stmt.step()) {
      rows.push(this.parseAuditRow(stmt.getAsObject()));
    }
    stmt.free();
    return rows;
  }

  // ─── Match timeline (audit log) ──────────────────────────────────────────────

  private parseTimelineRow(r: any): MatchEventEntry {
    return {
      id: r.id as string,
      matchId: r.match_id as string,
      eventType: r.event_type as MatchEventType,
      timestamp: r.timestamp as string,
      fencerId: (r.fencer_id as string) ?? null,
      fencerLastName: (r.fencer_last_name as string) ?? null,
      fencerFirstName: (r.fencer_first_name as string) ?? null,
      fencerSide: (r.fencer_side as 'A' | 'B') ?? null,
      previousScoreA: r.prev_a ? JSON.parse(r.prev_a as string) : null,
      previousScoreB: r.prev_b ? JSON.parse(r.prev_b as string) : null,
      newScoreA: r.new_a ? JSON.parse(r.new_a as string) : null,
      newScoreB: r.new_b ? JSON.parse(r.new_b as string) : null,
      changedBy: (r.changed_by as string) ?? null,
      refereeName: (r.referee_name as string) ?? null,
      ipAddress: (r.ip_address as string) ?? null,
      changeReason: (r.change_reason as string) ?? null,
      zone: (r.zone as string) ?? null,
      points: r.points != null ? Number(r.points) : null,
      cardType: (r.card_type as string) ?? null,
      cardReason: (r.card_reason as string) ?? null,
      cardGroup: r.card_group != null ? Number(r.card_group) : null,
      resultingExclusion: r.resulting_exclusion != null ? r.resulting_exclusion === 1 : null,
      exitType: (r.exit_type as string) ?? null,
    };
  }

  private static readonly TIMELINE_UNION_MATCH = `
    SELECT sal.id, sal.match_id, 'score_change' AS event_type,
           sal.changed_at AS timestamp,
           NULL AS fencer_id, NULL AS fencer_last_name, NULL AS fencer_first_name, NULL AS fencer_side,
           sal.previous_score_a AS prev_a, sal.previous_score_b AS prev_b,
           sal.new_score_a AS new_a, sal.new_score_b AS new_b,
           sal.changed_by, sal.referee_name, sal.ip_address, sal.reason AS change_reason,
           NULL AS zone, NULL AS points,
           NULL AS card_type, NULL AS card_reason, NULL AS card_group, NULL AS resulting_exclusion,
           NULL AS exit_type
    FROM score_audit_log sal WHERE sal.match_id = ?
    UNION ALL
    SELECT mt.id, mt.match_id, 'touch', mt.timestamp,
           mt.fencer_id, f.last_name, f.first_name,
           CASE WHEN m.fencer_a_id = mt.fencer_id THEN 'A' ELSE 'B' END,
           NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
           mt.zone, mt.points,
           NULL, NULL, NULL, NULL, NULL
    FROM match_touches mt
    LEFT JOIN fencers f ON mt.fencer_id = f.id
    LEFT JOIN matches m ON mt.match_id = m.id
    WHERE mt.match_id = ?
    UNION ALL
    SELECT mc.id, mc.match_id, 'card', mc.timestamp,
           mc.fencer_id, f.last_name, f.first_name,
           CASE WHEN m.fencer_a_id = mc.fencer_id THEN 'A' ELSE 'B' END,
           NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
           NULL, mc.points_awarded,
           mc.card_type, mc.reason, mc.card_group, mc.resulting_exclusion,
           NULL
    FROM match_cards mc
    LEFT JOIN fencers f ON mc.fencer_id = f.id
    LEFT JOIN matches m ON mc.match_id = m.id
    WHERE mc.match_id = ?
    UNION ALL
    SELECT mae.id, mae.match_id, 'arena_exit', mae.timestamp,
           mae.fencer_id, f.last_name, f.first_name,
           CASE WHEN m.fencer_a_id = mae.fencer_id THEN 'A' ELSE 'B' END,
           NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
           NULL, mae.points_awarded,
           NULL, NULL, NULL, NULL,
           mae.exit_type
    FROM match_arena_exits mae
    LEFT JOIN fencers f ON mae.fencer_id = f.id
    LEFT JOIN matches m ON mae.match_id = m.id
    WHERE mae.match_id = ?
    ORDER BY timestamp ASC
  `;

  public getMatchTimeline(matchId: string): MatchEventEntry[] {
    if (!this.db) throw new Error('Database not open');
    const stmt = this.db.prepare(DatabaseManager.TIMELINE_UNION_MATCH);
    stmt.bind([matchId, matchId, matchId, matchId]);
    const rows: any[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows.map(r => this.parseTimelineRow(r));
  }

  public getCompetitionTimeline(competitionId: string): MatchEventEntry[] {
    if (!this.db) throw new Error('Database not open');
    const matchSubquery = `
      SELECT m.id FROM matches m
        LEFT JOIN pools p ON m.pool_id = p.id
        LEFT JOIN phases ph ON p.phase_id = ph.id
        WHERE ph.competition_id = ?1
      UNION
      SELECT m.id FROM matches m
        JOIN bracket_nodes bn ON m.id = bn.match_id
        WHERE bn.competition_id = ?1
    `;
    const sql = `
      SELECT sal.id, sal.match_id, 'score_change' AS event_type,
             sal.changed_at AS timestamp,
             NULL AS fencer_id, NULL AS fencer_last_name, NULL AS fencer_first_name, NULL AS fencer_side,
             sal.previous_score_a AS prev_a, sal.previous_score_b AS prev_b,
             sal.new_score_a AS new_a, sal.new_score_b AS new_b,
             sal.changed_by, sal.referee_name, sal.ip_address, sal.reason AS change_reason,
             NULL AS zone, NULL AS points,
             NULL AS card_type, NULL AS card_reason, NULL AS card_group, NULL AS resulting_exclusion,
             NULL AS exit_type
      FROM score_audit_log sal
      WHERE sal.match_id IN (${matchSubquery})
      UNION ALL
      SELECT mt.id, mt.match_id, 'touch', mt.timestamp,
             mt.fencer_id, f.last_name, f.first_name,
             CASE WHEN m.fencer_a_id = mt.fencer_id THEN 'A' ELSE 'B' END,
             NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
             mt.zone, mt.points,
             NULL, NULL, NULL, NULL, NULL
      FROM match_touches mt
      LEFT JOIN fencers f ON mt.fencer_id = f.id
      LEFT JOIN matches m ON mt.match_id = m.id
      WHERE mt.match_id IN (${matchSubquery})
      UNION ALL
      SELECT mc.id, mc.match_id, 'card', mc.timestamp,
             mc.fencer_id, f.last_name, f.first_name,
             CASE WHEN m.fencer_a_id = mc.fencer_id THEN 'A' ELSE 'B' END,
             NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
             NULL, mc.points_awarded,
             mc.card_type, mc.reason, mc.card_group, mc.resulting_exclusion,
             NULL
      FROM match_cards mc
      LEFT JOIN fencers f ON mc.fencer_id = f.id
      LEFT JOIN matches m ON mc.match_id = m.id
      WHERE mc.match_id IN (${matchSubquery})
      UNION ALL
      SELECT mae.id, mae.match_id, 'arena_exit', mae.timestamp,
             mae.fencer_id, f.last_name, f.first_name,
             CASE WHEN m.fencer_a_id = mae.fencer_id THEN 'A' ELSE 'B' END,
             NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
             NULL, mae.points_awarded,
             NULL, NULL, NULL, NULL,
             mae.exit_type
      FROM match_arena_exits mae
      LEFT JOIN fencers f ON mae.fencer_id = f.id
      LEFT JOIN matches m ON mae.match_id = m.id
      WHERE mae.match_id IN (${matchSubquery})
      ORDER BY timestamp ASC
    `;
    const stmt = this.db.prepare(sql);
    stmt.bind([competitionId]);
    const rows: any[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows.map(r => this.parseTimelineRow(r));
  }

  // ─── Arena state persistence ─────────────────────────────────────────────────

  public saveArenaState(arenaId: string, state: {
    competitionId: string;
    currentMatch: any | null;
    matchQueue: any[];
    settings: any;
    status: string;
  }): void {
    if (!this.db) throw new Error('Database not open');
    this.run(
      `INSERT OR REPLACE INTO arena_state
        (arena_id, competition_id, current_match, match_queue, settings, status, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        arenaId,
        state.competitionId,
        state.currentMatch != null ? JSON.stringify(state.currentMatch) : null,
        JSON.stringify(state.matchQueue),
        state.settings != null ? JSON.stringify(state.settings) : null,
        state.status,
        new Date().toISOString(),
      ]
    );
    this.save();
  }

  public getArenaState(arenaId: string): {
    arenaId: string;
    competitionId: string;
    currentMatch: any | null;
    matchQueue: any[];
    settings: any | null;
    status: string;
    updatedAt: string;
  } | null {
    if (!this.db) throw new Error('Database not open');
    const stmt = this.db.prepare(`SELECT * FROM arena_state WHERE arena_id=?`);
    stmt.bind([arenaId]);
    if (!stmt.step()) { stmt.free(); return null; }
    const r = stmt.getAsObject();
    stmt.free();
    return {
      arenaId: r.arena_id as string,
      competitionId: r.competition_id as string,
      currentMatch: r.current_match ? JSON.parse(r.current_match as string) : null,
      matchQueue: r.match_queue ? JSON.parse(r.match_queue as string) : [],
      settings: r.settings ? JSON.parse(r.settings as string) : null,
      status: r.status as string,
      updatedAt: r.updated_at as string,
    };
  }

  public getArenaStatesByCompetition(competitionId: string): ReturnType<DatabaseManager['getArenaState']>[] {
    if (!this.db) throw new Error('Database not open');
    const stmt = this.db.prepare(`SELECT arena_id FROM arena_state WHERE competition_id=?`);
    stmt.bind([competitionId]);
    const ids: string[] = [];
    while (stmt.step()) ids.push(stmt.getAsObject().arena_id as string);
    stmt.free();
    return ids.map(id => this.getArenaState(id)).filter(Boolean) as any;
  }

  public clearArenaStates(competitionId: string): void {
    if (!this.db) throw new Error('Database not open');
    this.run(`DELETE FROM arena_state WHERE competition_id=?`, [competitionId]);
    this.save();
  }

  public savePoolSignature(poolId: string, fencerId: string, signatureData: string): void {
    if (!this.db) throw new Error('Database not open');
    const now = new Date().toISOString();
    this.run(
      `INSERT INTO pool_signatures (id, pool_id, fencer_id, signature_data, signed_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(pool_id, fencer_id) DO UPDATE SET
         signature_data = excluded.signature_data,
         signed_at = excluded.signed_at`,
      [uuidv4(), poolId, fencerId, signatureData, now]
    );
    this.save();
  }

  public getPoolSignatures(poolId: string): { fencerId: string; signatureData: string }[] {
    if (!this.db) throw new Error('Database not open');
    const result = this.db.exec(
      `SELECT fencer_id, signature_data FROM pool_signatures WHERE pool_id = ?`,
      [poolId]
    );
    if (!result.length || !result[0].values.length) return [];
    return result[0].values.map((row: any[]) => ({
      fencerId: row[0] as string,
      signatureData: row[1] as string,
    }));
  }
}

export const db = new DatabaseManager();

