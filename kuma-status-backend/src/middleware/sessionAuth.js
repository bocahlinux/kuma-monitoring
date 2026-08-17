import { config } from '../config.js';
import { SESSION_COOKIE_NAME, hashToken } from '../lib/sessionToken.js';

// Gantiin apiKeyAuth lama -- terima SALAH SATU dari dua jalur:
//  1) header x-api-key yang cocok dengan API_KEY di .env (buat script/curl/integrasi lain)
//  2) cookie sesi hasil login username+password (buat panel /admin)
// Beda dari apiKeyAuth lama: API_KEY kosong TIDAK LAGI berarti "auth dimatikan" --
// begitu ada tabel user asli, itu jadi backdoor yang gampang lupa. Sekarang wajib
// salah satu jalur di atas valid, titik.
export function createSessionAuth({ sessionsRepo, usersRepo }) {
  return function sessionAuth(req, res, next) {
    const key = req.header('x-api-key');
    if (config.apiKey && key && key === config.apiKey) {
      return next();
    }

    const token = req.cookies?.[SESSION_COOKIE_NAME];
    if (token) {
      const tokenHash = hashToken(token);
      const session = sessionsRepo.getByTokenHash(tokenHash);
      if (session) {
        if (new Date(session.expires_at) > new Date()) {
          const user = usersRepo.getById(session.user_id);
          if (user) {
            req.user = { id: user.id, username: user.username };
            return next();
          }
        } else {
          sessionsRepo.deleteByTokenHash(tokenHash);
        }
      }
    }

    return res.status(401).json({ error: 'Unauthorized: login diperlukan' });
  };
}
