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
          `SELECT kuma_monitor_id, custom_label, sort_order, group_id
           FROM status_page_monitors
           WHERE status_page_id = ?
           ORDER BY sort_order ASC, id ASC`
        )
        .all(statusPageId);
    },

    listGroups(statusPageId) {
      return db
        .prepare('SELECT * FROM status_page_groups WHERE status_page_id = ? ORDER BY sort_order ASC, id ASC')
        .all(statusPageId);
    },

    getGroupById(groupId) {
      return db.prepare('SELECT * FROM status_page_groups WHERE id = ?').get(groupId);
    },

    createGroup(statusPageId, { name, sortOrder }) {
      const existing = this.listGroups(statusPageId);
      const nextOrder = sortOrder ?? (existing.length ? Math.max(...existing.map((g) => g.sort_order)) + 1 : 0);
      const info = db
        .prepare('INSERT INTO status_page_groups (status_page_id, name, sort_order) VALUES (?, ?, ?)')
        .run(statusPageId, name, nextOrder);
      return this.getGroupById(info.lastInsertRowid);
    },

    updateGroup(groupId, { name, sortOrder }) {
      db.prepare(
        `UPDATE status_page_groups
         SET name = COALESCE(?, name),
             sort_order = COALESCE(?, sort_order)
         WHERE id = ?`
      ).run(name ?? null, sortOrder ?? null, groupId);
      return this.getGroupById(groupId);
    },

    deleteGroup(groupId) {
      // Monitor di grup ini nggak ikut kehapus -- cuma balik jadi "tanpa grup".
      db.prepare('UPDATE status_page_monitors SET group_id = NULL WHERE group_id = ?').run(groupId);
      const info = db.prepare('DELETE FROM status_page_groups WHERE id = ?').run(groupId);
      return info.changes > 0;
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

    addMonitor(statusPageId, { kumaMonitorId, customLabel, sortOrder, groupId }) {
      db.prepare(
        `INSERT INTO status_page_monitors (status_page_id, kuma_monitor_id, custom_label, sort_order, group_id)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(status_page_id, kuma_monitor_id)
         DO UPDATE SET custom_label = excluded.custom_label,
                        sort_order = excluded.sort_order,
                        group_id = excluded.group_id`
      ).run(statusPageId, kumaMonitorId, customLabel || null, sortOrder ?? 0, groupId ?? null);
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
