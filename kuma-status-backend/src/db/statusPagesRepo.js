const SLUG_RE = /^[a-z0-9-]+$/;

export function createStatusPagesRepo(db) {
  return {
    listPages() {
      return db.prepare('SELECT * FROM status_pages ORDER BY created_at ASC').all();
    },

    getPageBySlug(slug) {
      return db.prepare('SELECT * FROM status_pages WHERE slug = ?').get(slug);
    },

    getPageMonitors(statusPageId) {
      return db
        .prepare(
          `SELECT kuma_monitor_id, custom_label, sort_order
           FROM status_page_monitors
           WHERE status_page_id = ?
           ORDER BY sort_order ASC, id ASC`
        )
        .all(statusPageId);
    },

    createPage({ slug, title, description }) {
      if (!SLUG_RE.test(slug)) {
        throw new Error('slug hanya boleh huruf kecil, angka, dan tanda "-"');
      }
      const stmt = db.prepare(
        'INSERT INTO status_pages (slug, title, description) VALUES (?, ?, ?)'
      );
      const info = stmt.run(slug, title, description || null);
      return this.getPageBySlug(slug) ?? { id: info.lastInsertRowid, slug, title, description };
    },

    updatePage(slug, { title, description }) {
      db.prepare(
        `UPDATE status_pages
         SET title = COALESCE(?, title),
             description = COALESCE(?, description),
             updated_at = datetime('now')
         WHERE slug = ?`
      ).run(title ?? null, description ?? null, slug);
      return this.getPageBySlug(slug);
    },

    deletePage(slug) {
      const info = db.prepare('DELETE FROM status_pages WHERE slug = ?').run(slug);
      return info.changes > 0;
    },

    addMonitor(statusPageId, { kumaMonitorId, customLabel, sortOrder }) {
      db.prepare(
        `INSERT INTO status_page_monitors (status_page_id, kuma_monitor_id, custom_label, sort_order)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(status_page_id, kuma_monitor_id)
         DO UPDATE SET custom_label = excluded.custom_label, sort_order = excluded.sort_order`
      ).run(statusPageId, kumaMonitorId, customLabel || null, sortOrder ?? 0);
      return this.getPageMonitors(statusPageId);
    },

    removeMonitor(statusPageId, kumaMonitorId) {
      const info = db
        .prepare('DELETE FROM status_page_monitors WHERE status_page_id = ? AND kuma_monitor_id = ?')
        .run(statusPageId, kumaMonitorId);
      return info.changes > 0;
    },
  };
}
