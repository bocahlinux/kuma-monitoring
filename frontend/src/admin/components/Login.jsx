import { useState } from 'react';
import { adminApi } from '../adminApi';

export default function Login({ onSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setLoading(true);
    setError(null);
    try {
      await adminApi.login(username.trim(), password);
      onSuccess();
    } catch (err) {
      setError(err.message === 'UNAUTHORIZED' ? 'Username atau password salah' : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login">
      <form onSubmit={submit} className="admin-login__form">
        <h1>Admin — Status Page</h1>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Memeriksa…' : 'Masuk'}
        </button>
        {error && <p className="admin-error">{error}</p>}
      </form>
    </div>
  );
}
