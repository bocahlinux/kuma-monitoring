import { useState } from 'react';
import { adminApi } from '../adminApi';

export default function Login({ onSuccess }) {
  const [key, setKey] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!key.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await adminApi.login(key.trim());
      onSuccess();
    } catch (err) {
      setError(err.message === 'UNAUTHORIZED' ? 'API key salah' : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login">
      <form onSubmit={submit} className="admin-login__form">
        <h1>Admin — Status Page</h1>
        <input
          type="password"
          placeholder="API key"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          autoFocus
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Memeriksa…' : 'Masuk'}
        </button>
        {error && <p className="admin-error">{error}</p>}
      </form>
    </div>
  );
}
