import { useCallback, useEffect, useState } from 'react';
import { adminApi, clearStoredApiKey, getStoredApiKey } from './adminApi';
import Login from './components/Login';
import StatusPageList from './components/StatusPageList';
import StatusPageEditor from './components/StatusPageEditor';
import './admin.css';

export default function AdminApp() {
  const [loggedIn, setLoggedIn] = useState(!!getStoredApiKey());
  const [pages, setPages] = useState([]);
  const [selectedSlug, setSelectedSlug] = useState(null);
  const [error, setError] = useState(null);

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

  if (!loggedIn) {
    return <Login onSuccess={() => setLoggedIn(true)} />;
  }

  const logout = () => {
    clearStoredApiKey();
    setLoggedIn(false);
    setSelectedSlug(null);
  };

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
      <StatusPageList pages={pages} onOpen={setSelectedSlug} onChanged={loadPages} onLogout={logout} />
    </>
  );
}
