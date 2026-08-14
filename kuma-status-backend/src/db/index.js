import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

export function initDb(dbPath) {
  const dir = path.dirname(dbPath);
  if (dir && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS status_pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS status_page_monitors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      status_page_id INTEGER NOT NULL REFERENCES status_pages(id) ON DELETE CASCADE,
      kuma_monitor_id INTEGER NOT NULL,
      custom_label TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      UNIQUE (status_page_id, kuma_monitor_id)
    );
  `);

  return db;
}
