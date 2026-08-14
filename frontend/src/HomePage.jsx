import { useCallback, useEffect, useState } from 'react';
import { fetchHome } from './api';
import GroupSection from './components/GroupSection';
import './App.css';

const POLL_INTERVAL_MS = Number(import.meta.env.VITE_POLL_INTERVAL_MS) || 20000;
const HOME_TITLE = import.meta.env.VITE_HOME_TITLE || 'Status Layanan';

function overallBanner(status) {
  if (status === 'up') {
    return { icon: '✓', text: 'Semua layanan normal', className: 'banner banner--up' };
  }
  if (status === 'down') {
    return { icon: '✕', text: 'Ada gangguan pada sebagian layanan', className: 'banner banner--down' };
  }
  return { icon: '?', text: 'Status belum diketahui', className: 'banner banner--unknown' };
}

export default function HomePage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async () => {
    try {
      const result = await fetchHome();
      setData(result);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [load]);

  if (error && !data) {
    return (
      <div className="page page--center">
        <p className="error-text">Gagal memuat status: {error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page page--center">
        <div className="spinner" aria-hidden="true" />
        <p className="page__loading-text">Memuat status…</p>
      </div>
    );
  }

  const banner = overallBanner(data.overallStatus);
  const pages = data.statusPages;

  return (
    <div className="page">
      <header className="page__header">
        <h1>{HOME_TITLE}</h1>
      </header>

      <div className={banner.className}>
        <span className="banner__icon" aria-hidden="true">
          {banner.icon}
        </span>
        {banner.text}
      </div>

      {pages.length === 0 && <p className="page__description">Belum ada status page yang ditampilkan di sini.</p>}

      {pages.map((p) => (
        <section key={p.slug} className="category">
          <h2 className="category__title">{p.title}</h2>
          {p.description && <p className="category__description">{p.description}</p>}
          {p.groups.map((g) => (
            <GroupSection key={g.id ?? 'ungrouped'} group={g} />
          ))}
        </section>
      ))}

      {error && <p className="error-text error-text--inline">Update terakhir gagal: {error}</p>}

      <footer className="page__footer">
        {lastUpdated && <span>Diperbarui {lastUpdated.toLocaleTimeString('id-ID')} · </span>}
        Otomatis tiap {Math.round(POLL_INTERVAL_MS / 1000)} detik
      </footer>
    </div>
  );
}
