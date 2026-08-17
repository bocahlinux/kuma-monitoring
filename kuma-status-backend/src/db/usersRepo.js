export function createUsersRepo(db) {
  return {
    hasAnyUsers() {
      const row = db.prepare('SELECT COUNT(*) AS n FROM users').get();
      return row.n > 0;
    },

    getByUsername(username) {
      return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    },

    getById(id) {
      return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    },

    // Sengaja nggak nyertain password_hash -- ini yang dipakai buat balikin data ke
    // response HTTP (GET /api/users), jadi hash nggak boleh ikut kekirim ke browser.
    listUsers() {
      return db
        .prepare('SELECT id, username, created_at, updated_at FROM users ORDER BY created_at ASC')
        .all();
    },

    createUser({ username, passwordHash }) {
      const info = db
        .prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
        .run(username, passwordHash);
      return this.getById(info.lastInsertRowid);
    },

    updateUsername(id, username) {
      db.prepare('UPDATE users SET username = ?, updated_at = datetime(\'now\') WHERE id = ?').run(
        username,
        id
      );
      return this.getById(id);
    },

    updatePasswordHash(id, passwordHash) {
      db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?').run(
        passwordHash,
        id
      );
      return this.getById(id);
    },

    deleteUser(id) {
      const info = db.prepare('DELETE FROM users WHERE id = ?').run(id);
      return info.changes > 0;
    },
  };
}
