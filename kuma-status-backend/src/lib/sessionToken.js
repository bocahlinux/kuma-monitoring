import crypto from 'node:crypto';

export const SESSION_COOKIE_NAME = 'kuma_status_session';
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 hari

export function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// DB cuma nyimpan hash-nya (bukan token mentah) -- sama alasannya kayak kenapa
// password di-hash: kalau file DB bocor, sesi yang lagi aktif nggak ikut bocor.
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
