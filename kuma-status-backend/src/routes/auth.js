import { Router } from 'express';
import { verifyPassword } from '../lib/passwordHash.js';
import { SESSION_COOKIE_NAME, SESSION_TTL_MS, generateToken, hashToken } from '../lib/sessionToken.js';
import { config } from '../config.js';

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.cookieSecure,
    path: '/',
    maxAge: SESSION_TTL_MS,
  };
}

export function createAuthRouter({ usersRepo, sessionsRepo, sessionAuth }) {
  const router = Router();

  // POST /api/auth/login - body { username, password }
  router.post('/auth/login', async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'username dan password wajib diisi' });
    }

    const user = usersRepo.getByUsername(username);
    // Pesan error SENGAJA sama baik username nggak ada maupun password salah --
    // biar nggak bisa dipakai buat nebak-nebak username mana yang valid.
    const invalid = () => res.status(401).json({ error: 'Username atau password salah' });
    if (!user) return invalid();

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) return invalid();

    const token = generateToken();
    sessionsRepo.createSession({ userId: user.id, tokenHash: hashToken(token) });
    res.cookie(SESSION_COOKIE_NAME, token, cookieOptions());
    res.json({ user: { id: user.id, username: user.username } });
  });

  // POST /api/auth/logout - idempotent, boleh dipanggil walau udah nggak login
  router.post('/auth/logout', (req, res) => {
    const token = req.cookies?.[SESSION_COOKIE_NAME];
    if (token) {
      sessionsRepo.deleteByTokenHash(hashToken(token));
    }
    res.clearCookie(SESSION_COOKIE_NAME, cookieOptions());
    res.status(204).end();
  });

  // GET /api/auth/me - dipakai frontend buat cek status login pas mount
  router.get('/auth/me', sessionAuth, (req, res) => {
    res.json({ user: req.user || null });
  });

  return router;
}
