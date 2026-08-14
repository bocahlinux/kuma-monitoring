const SLUG_RE = /^[a-z0-9-]+$/;

function toDbBool(value) {
  return value ? 1 : 0;
}

export function createStatusPagesRepo(db) {
  return {
    listPages() {
      return db.prepare('SELECT * FROM status_pages ORDER BY created_at ASC').all();
    },

    listVisiblePages() {
      return db
        .prepare('SELECT * FROM status_pages WHERE show_on_home = 1 ORDER BY created_at ASC')
        .all();
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

    createPage({ slug, title, description, showOnHome }) {
      if (!SLUG_RE.test(slug)) {
        throw new Error('slug hanya boleh huruf kecil, angka, dan tanda "-"');
      }
      const stmt = db.prepare(
        'INSERT INTO status_pages (slug, title, description, show_on_home) VALUES (?, ?, ?, ?)'
      );
      const info = stmt.run(
        slug,
        title,
        description || null,
        showOnHome === undefined ? 1 : toDbBool(showOnHome)
      );
      return this.getPageBySlug(slug) ?? { id: info.lastInsertRowid, slug, title, description };
    },

    updatePage(slug, { title, description, showOnHome }) {
      db.prepare(
        `UPDATE status_pages
         SET title = COALESCE(?, title),
             description = COALESCE(?, description),
             show_on_home = COALESCE(?, show_on_home),
             updated_at = datetime('now')
         WHERE slug = ?`
      ).run(
        title ?? null,
        description ?? null,
        showOnHome === undefined ? null : toDbBool(showOnHome),
        slug
      );
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
