import { useEffect, useState } from 'react';
import { adminApi } from '../adminApi';

export default function UserList({ onBack }) {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);

  const load = async () => {
    try {
      setUsers(await adminApi.listUsers());
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setCreating(true);
    setError(null);
    try {
      await adminApi.createUser({ username: username.trim(), password });
      setUsername('');
      setPassword('');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const remove = async (user) => {
    if (!confirm(`Hapus user "${user.username}"? Ini tidak bisa dibatalkan.`)) return;
    try {
      await adminApi.deleteUser(user.id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const startEditPassword = (user) => {
    setEditingId(user.id);
    setNewPassword('');
    setError(null);
  };

  const savePassword = async (e, userId) => {
    e.preventDefault();
    if (!newPassword) return;
    try {
      await adminApi.updateUser(userId, { password: newPassword });
      setEditingId(null);
      setNewPassword('');
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <h1>Kelola User</h1>
        <button className="btn btn--ghost" onClick={onBack}>
          Kembali
        </button>
      </header>

      {error && <p className="admin-error admin-error--floating">{error}</p>}

      <section className="admin-card">
        <h2>User admin yang ada</h2>
        <ul className="admin-list">
          {users.map((u) => (
            <li key={u.id} className="admin-list__item">
              <div>
                <strong>{u.username}</strong>
              </div>
              {editingId === u.id ? (
                <form className="admin-form admin-form--inline" onSubmit={(e) => savePassword(e, u.id)}>
                  <input
                    type="password"
                    placeholder="Password baru"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoFocus
                  />
                  <button className="btn btn--primary" type="submit">
                    Simpan
                  </button>
                  <button className="btn btn--ghost" type="button" onClick={() => setEditingId(null)}>
                    Batal
                  </button>
                </form>
              ) : (
                <div className="admin-list__actions">
                  <button className="btn" onClick={() => startEditPassword(u)}>
                    Ganti Password
                  </button>
                  <button className="btn btn--danger" onClick={() => remove(u)}>
                    Hapus
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="admin-card">
        <h2>Tambah user baru</h2>
        <form onSubmit={create} className="admin-form">
          <label>
            Username
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin2" />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </label>
          <button className="btn btn--primary" type="submit" disabled={creating}>
            {creating ? 'Membuat…' : 'Buat'}
          </button>
        </form>
      </section>
    </div>
  );
}
