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

    CREATE TABLE IF NOT EXISTS status_page_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      status_page_id INTEGER NOT NULL REFERENCES status_pages(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS incidents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kuma_monitor_id INTEGER NOT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      message TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_incidents_monitor ON incidents (kuma_monitor_id, started_at DESC);
  `);

  migrate(db);

  return db;
}

// CREATE TABLE IF NOT EXISTS di atas nggak nambah kolom baru ke tabel yang sudah ada --
// migrasi additive kecil kayak gini ditangani manual, dicek dulu biar aman dijalankan
// ulang tiap kali server start.
function migrate(db) {
  const statusPageColumns = db.prepare('PRAGMA table_info(status_pages)').all();
  if (!statusPageColumns.some((c) => c.name === 'show_on_home')) {
    db.exec('ALTER TABLE status_pages ADD COLUMN show_on_home INTEGER NOT NULL DEFAULT 1');
  }

  const monitorColumns = db.prepare('PRAGMA table_info(status_page_monitors)').all();
  if (!monitorColumns.some((c) => c.name === 'group_id')) {
    // Nggak pakai REFERENCES di sini -- SQLite kadang berulah soal FK yang ditambah lewat
    // ALTER TABLE. Integritasnya dijaga di kode repo (deleteGroup null-in dulu sebelum hapus).
    db.exec('ALTER TABLE status_page_monitors ADD COLUMN group_id INTEGER');
  }
}
