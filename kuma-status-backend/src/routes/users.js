import { Router } from 'express';
import { hashPassword } from '../lib/passwordHash.js';

// Endpoint admin -- wajib session/x-api-key (dipasang sessionAuth di index.js), dipakai
// buat kelola akun admin lain lewat panel /admin.
export function createUsersRouter({ usersRepo, sessionsRepo }) {
  const router = Router();

  // GET /api/users - daftar user (tanpa password_hash)
  router.get('/users', (req, res) => {
    res.json({ users: usersRepo.listUsers() });
  });

  // POST /api/users - buat user admin baru
  router.post('/users', async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'username dan password wajib diisi' });
    }
    try {
      const passwordHash = await hashPassword(password);
      const user = usersRepo.createUser({ username, passwordHash });
      res.status(201).json({ user: { id: user.id, username: user.username } });
    } catch (err) {
      if (String(err.message).includes('UNIQUE')) {
        return res.status(409).json({ error: 'username sudah dipakai' });
      }
      res.status(400).json({ error: err.message });
    }
  });

  // PUT /api/users/:id - ubah username dan/atau password (password opsional = nggak diganti)
  router.put('/users/:id', async (req, res) => {
    const id = Number(req.params.id);
    const existing = usersRepo.getById(id);
    if (!existing) return res.status(404).json({ error: 'User tidak ditemukan' });

    const { username, password } = req.body || {};
    try {
      if (username) {
        usersRepo.updateUsername(id, username);
      }
      if (password) {
        const passwordHash = await hashPassword(password);
        usersRepo.updatePasswordHash(id, passwordHash);
        // Ganti password bukan operasi delete, jadi sesi lama yang masih nyantol di
        // device lain nggak otomatis kecabut lewat FK cascade -- dicabut manual di sini.
        sessionsRepo.deleteAllForUser(id);
      }
      const user = usersRepo.getById(id);
      res.json({ user: { id: user.id, username: user.username } });
    } catch (err) {
      if (String(err.message).includes('UNIQUE')) {
        return res.status(409).json({ error: 'username sudah dipakai' });
      }
      res.status(400).json({ error: err.message });
    }
  });

  // DELETE /api/users/:id
  router.delete('/users/:id', (req, res) => {
    const id = Number(req.params.id);

    // Nggak boleh nyisain 0 user -- nggak ada alur "lupa password", jadi ini satu-satunya
    // penjaga biar admin nggak kekunci total dari panelnya sendiri.
    if (usersRepo.listUsers().length <= 1) {
      return res.status(400).json({ error: 'Tidak bisa hapus user terakhir' });
    }

    const deleted = usersRepo.deleteUser(id);
    if (!deleted) return res.status(404).json({ error: 'User tidak ditemukan' });
    res.status(204).end();
  });

  return router;
}
