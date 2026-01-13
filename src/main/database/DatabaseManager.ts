import Database from "better-sqlite3";
import { join } from "path";
import { app } from "electron";

export class DatabaseManager {
  private db: Database.Database;
  private dbPath: string;

  constructor(dbPath?: string) {
    this.dbPath = dbPath || join(app.getPath("userData"), "assetpulse.db");
    this.db = new Database(this.dbPath);
    this.initTables();
  }

  private initTables(): void {
    // Configuration table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);

    // Assets table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS assets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        host TEXT,
        ip TEXT,
        port TEXT,
        protocol TEXT,
        region TEXT,
        status TEXT DEFAULT 'unknown',
        last_check INTEGER,
        created_at INTEGER
      )
    `);

    // Probe History table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS probe_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        total_count INTEGER,
        alive_count INTEGER,
        timestamp INTEGER
      )
    `);
  }

  // Config methods
  public getConfig(key: string): string | null {
    const row = this.db
      .prepare("SELECT value FROM config WHERE key = ?")
      .get(key) as { value: string } | undefined;
    return row ? row.value : null;
  }

  public setConfig(key: string, value: string): void {
    this.db
      .prepare("INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)")
      .run(key, value);
  }

  // Asset methods
  public addAsset(asset: any): void {
    const stmt = this.db.prepare(`
      INSERT INTO assets (host, ip, port, protocol, region, status, created_at)
      VALUES (@host, @ip, @port, @protocol, @region, @status, @created_at)
    `);
    stmt.run({
      ...asset,
      status: asset.status || "unknown",
      created_at: Date.now(),
    });
  }

  public getAssets(): any[] {
    return this.db.prepare("SELECT * FROM assets ORDER BY id DESC").all();
  }

  public clearAssets(): void {
    this.db.exec("DELETE FROM assets");
  }

  public clearHistory(): void {
    this.db.exec("DELETE FROM probe_history");
  }

  public updateAssetStatus(id: number, status: string): void {
    this.db
      .prepare("UPDATE assets SET status = ?, last_check = ? WHERE id = ?")
      .run(status, Date.now(), id);
  }

  public getAssetsByRegion(): any[] {
    return this.db
      .prepare(
        "SELECT region, COUNT(*) as count, SUM(CASE WHEN status = 'alive' THEN 1 ELSE 0 END) as alive_count FROM assets GROUP BY region ORDER BY count DESC LIMIT 5"
      )
      .all();
  }

  public getAssetStats(): { total: number; alive: number } {
    const row = this.db
      .prepare(
        "SELECT COUNT(*) as total, SUM(CASE WHEN status = 'alive' THEN 1 ELSE 0 END) as alive FROM assets"
      )
      .get() as { total: number; alive: number };
    return { total: row.total || 0, alive: row.alive || 0 };
  }

  // History methods
  public addProbeHistory(total: number, alive: number): void {
    this.db
      .prepare(
        "INSERT INTO probe_history (total_count, alive_count, timestamp) VALUES (?, ?, ?)"
      )
      .run(total, alive, Date.now());
  }

  public getProbeHistory(limit: number = 50): any[] {
    return this.db
      .prepare("SELECT * FROM probe_history ORDER BY timestamp ASC LIMIT ?")
      .all(limit);
  }
}
