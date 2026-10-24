import { DatabaseSync } from "node:sqlite";

export function openDb(path: string): DatabaseSync {
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      attribute TEXT NOT NULL DEFAULT 'disziplin',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      archived_at TEXT
    );
    CREATE TABLE IF NOT EXISTS checkins (
      habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      PRIMARY KEY (habit_id, date)
    );
    CREATE TABLE IF NOT EXISTS quests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      attribute TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      done_at TEXT
    );
    -- Ledger: jede XP-Quelle ein Eintrag. Bleibt bestehen, wenn Habit/Quest gelöscht wird.
    CREATE TABLE IF NOT EXISTS xp_events (
      kind TEXT NOT NULL,
      ref_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      attribute TEXT NOT NULL,
      xp INTEGER NOT NULL,
      PRIMARY KEY (kind, ref_id, date)
    );
  `);
  return db;
}
