/**
 * BellePoule Modern - Système de migrations DB versionnées
 * Chaque migration est appliquée une seule fois, dans l'ordre croissant.
 */

export interface Migration {
  version: number;
  description: string;
  up(db: any): void;
}

export class MigrationManager {
  constructor(private db: any) {}

  run(migrations: Migration[]): number {
    this.ensureMigrationsTable();
    const applied = this.getAppliedVersions();
    const pending = migrations
      .filter(m => !applied.has(m.version))
      .sort((a, b) => a.version - b.version);

    for (const migration of pending) {
      console.log(`[DB] Migration v${migration.version}: ${migration.description}`);
      migration.up(this.db);
      this.recordMigration(migration.version, migration.description);
    }

    if (pending.length > 0) {
      console.log(`[DB] ${pending.length} migration(s) appliquée(s)`);
    }
    return pending.length;
  }

  private ensureMigrationsTable(): void {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        description TEXT NOT NULL,
        applied_at TEXT NOT NULL
      )
    `);
  }

  private getAppliedVersions(): Set<number> {
    const applied = new Set<number>();
    const stmt = this.db.prepare('SELECT version FROM schema_migrations');
    while (stmt.step()) {
      applied.add(stmt.getAsObject().version as number);
    }
    stmt.free();
    return applied;
  }

  private recordMigration(version: number, description: string): void {
    this.db.run(
      'INSERT OR IGNORE INTO schema_migrations (version, description, applied_at) VALUES (?, ?, ?)',
      [version, description, new Date().toISOString()]
    );
  }
}
