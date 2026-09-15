import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import type { PaperPosition, RiskAssessment, TokenCandidate } from "./domain.js";

export class Ledger {
  private readonly db: Database.Database;

  public constructor(filename: string) {
    const directory = path.dirname(filename);
    if (directory && directory !== ".") fs.mkdirSync(directory, { recursive: true });
    this.db = new Database(filename);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS candidates (
        mint TEXT NOT NULL,
        pair_address TEXT NOT NULL,
        discovered_at INTEGER NOT NULL,
        payload TEXT NOT NULL,
        PRIMARY KEY (mint, pair_address)
      );
      CREATE TABLE IF NOT EXISTS risk_assessments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mint TEXT NOT NULL,
        assessed_at INTEGER NOT NULL,
        score INTEGER NOT NULL,
        decision TEXT NOT NULL,
        payload TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS paper_trades (
        id TEXT PRIMARY KEY,
        mint TEXT NOT NULL,
        symbol TEXT NOT NULL,
        status TEXT NOT NULL,
        opened_at INTEGER NOT NULL,
        closed_at INTEGER,
        payload TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS audit_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        payload TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS live_trades (
        mint TEXT PRIMARY KEY,
        signature TEXT,
        created_at INTEGER NOT NULL,
        payload TEXT NOT NULL
      );
    `);
  }

  public saveCandidate(candidate: TokenCandidate): void {
    this.db.prepare(`INSERT OR REPLACE INTO candidates (mint, pair_address, discovered_at, payload) VALUES (?, ?, ?, ?)`)
      .run(candidate.mint, candidate.market.pairAddress, candidate.discoveredAtMs, JSON.stringify(candidate));
  }

  public saveAssessment(assessment: RiskAssessment): void {
    this.db.prepare(`INSERT INTO risk_assessments (mint, assessed_at, score, decision, payload) VALUES (?, ?, ?, ?, ?)`)
      .run(assessment.candidate.mint, assessment.assessedAtMs, assessment.score, assessment.decision, JSON.stringify(assessment));
  }

  public savePaperPosition(position: PaperPosition): void {
    this.db.prepare(`INSERT OR REPLACE INTO paper_trades (id, mint, symbol, status, opened_at, closed_at, payload) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(position.id, position.mint, position.symbol, position.status, position.openedAtMs, position.closedAtMs ?? null, JSON.stringify(position));
  }

  public saveAudit(eventType: string, payload: unknown, createdAt = Date.now()): void {
    this.db.prepare(`INSERT INTO audit_events (event_type, created_at, payload) VALUES (?, ?, ?)`)
      .run(eventType, createdAt, JSON.stringify(payload));
  }

  public countOpenPaperPositions(): number {
    const row = this.db.prepare(`SELECT COUNT(*) AS count FROM paper_trades WHERE status = 'OPEN'`).get() as unknown as { count: number };
    return Number(row.count);
  }

  public saveLiveAudit(eventType: string, payload: unknown, createdAt = Date.now()): void {
    this.saveAudit(eventType, payload, createdAt);
  }

  public hasOpenPaperPosition(mint: string): boolean {
    const row = this.db.prepare(`SELECT 1 AS found FROM paper_trades WHERE mint = ? AND status = 'OPEN' LIMIT 1`).get(mint) as unknown as { found?: number } | undefined;
    return row?.found === 1;
  }

  public hasLiveTrade(mint: string): boolean {
    const row = this.db.prepare(`SELECT 1 AS found FROM live_trades WHERE mint = ? LIMIT 1`).get(mint) as unknown as { found?: number } | undefined;
    return row?.found === 1;
  }

  public markLiveTrade(mint: string, signature: string | undefined, payload: unknown, createdAt = Date.now()): void {
    this.db.prepare(`INSERT OR IGNORE INTO live_trades (mint, signature, created_at, payload) VALUES (?, ?, ?, ?)`)
      .run(mint, signature ?? null, createdAt, JSON.stringify(payload));
  }

  public close(): void { this.db.close(); }
}
