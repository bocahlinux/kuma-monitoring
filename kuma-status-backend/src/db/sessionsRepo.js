import { SESSION_TTL_MS } from '../lib/sessionToken.js';

export function createSessionsRepo(db) {
  return {
    createSession({ userId, tokenHash }) {
      const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
      db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(
        tokenHash,
        userId,
        expiresAt
      );
      return expiresAt;
    },

    getByTokenHash(tokenHash) {
      return db.prepare('SELECT * FROM sessions WHERE token_hash = ?').get(tokenHash);
    },

    deleteByTokenHash(tokenHash) {
      db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
    },

    // Dipanggil pas ganti password / hapus user, biar sesi lama yang mungkin masih
    // kepegang di device lain langsung invalid -- FK ON DELETE CASCADE udah nanganin
    // kasus hapus user, tapi ganti password bukan delete jadi perlu dipanggil eksplisit.
    deleteAllForUser(userId) {
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
    },
  };
}
