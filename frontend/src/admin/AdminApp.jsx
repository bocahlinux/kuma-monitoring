import { useCallback, useEffect, useState } from 'react';
import { adminApi } from './adminApi';
import Login from './components/Login';
import StatusPageList from './components/StatusPageList';
import StatusPageEditor from './components/StatusPageEditor';
import UserList from './components/UserList';
import './admin.css';

export default function AdminApp() {
  // null = lagi dicek ke server, true/false = hasil pengecekan. Nggak bisa langsung
  // tau dari JS apakah cookie sesi ada (httpOnly), jadi wajib tanya /api/auth/me dulu.
  const [loggedIn, setLoggedIn] = useState(null);
  const [pages, setPages] = useState([]);
  const [selectedSlug, setSelectedSlug] = useState(null);
  const [showUsers, setShowUsers] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    adminApi
      .me()
      .then(() => setLoggedIn(true))
      .catch(() => setLoggedIn(false));
  }, []);

  const loadPages = useCallback(async () => {
    try {
      const list = await adminApi.listStatusPages();
      setPages(list);
      setError(null);
    } catch (err) {
      if (err.message === 'UNAUTHORIZED') {
        setLoggedIn(false);
      } else {
        setError(err.message);
      }
    }
  }, []);

  useEffect(() => {
    if (loggedIn) loadPages();
  }, [loggedIn, loadPages]);

  if (loggedIn === null) {
    return <p className="admin-dim" style={{ textAlign: 'center', marginTop: 40 }}>Memuat…</p>;
  }

  if (!loggedIn) {
    return <Login onSuccess={() => setLoggedIn(true)} />;
  }

  const logout = async () => {
    try {
      await adminApi.logout();
    } finally {
      setLoggedIn(false);
      setSelectedSlug(null);
      setShowUsers(false);
    }
  };

  if (showUsers) {
    return <UserList onBack={() => setShowUsers(false)} />;
  }

  if (selectedSlug) {
    return (
      <StatusPageEditor
        slug={selectedSlug}
        onBack={() => { setSelectedSlug(null); loadPages(); }}
        onSlugChanged={setSelectedSlug}
      />
    );
  }

  return (
    <>
      {error && <p className="admin-error admin-error--floating">{error}</p>}
      <StatusPageList
        pages={pages}
        onOpen={setSelectedSlug}
        onChanged={loadPages}
        onLogout={logout}
        onManageUsers={() => setShowUsers(true)}
      />
    </>
  );
}
