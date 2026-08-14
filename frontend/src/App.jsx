import { useCallback, useEffect, useState } from 'react';
import { fetchStatusPage } from './api';
import MonitorRow from './components/MonitorRow';
import './App.css';

const POLL_INTERVAL_MS = Number(import.meta.env.VITE_POLL_INTERVAL_MS) || 20000;

function overallBanner(status) {
  if (status === 'up') {
    return { icon: '✓', text: 'Semua layanan normal', className: 'banner banner--up' };
  }
  if (status === 'down') {
    return { icon: '✕', text: 'Ada gangguan pada sebagian layanan', className: 'banner banner--down' };
  }
  return { icon: '?', text: 'Status belum diketahui', className: 'banner banner--unknown' };
}

export default function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async () => {
    try {
      const statusPage = await fetchStatusPage();
      setData(statusPage);
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
  const monitors = [...data.monitors].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="page">
      <header className="page__header">
        <h1>{data.title}</h1>
        {data.description && <p className="page__description">{data.description}</p>}
      </header>

      <div className={banner.className}>
        <span className="banner__icon" aria-hidden="true">
          {banner.icon}
        </span>
        {banner.text}
      </div>

      <main className="monitor-list">
        {monitors.map((m) => (
          <MonitorRow key={m.kumaMonitorId} monitor={m} />
        ))}
      </main>

      {error && <p className="error-text error-text--inline">Update terakhir gagal: {error}</p>}

      <footer className="page__footer">
        {lastUpdated && <span>Diperbarui {lastUpdated.toLocaleTimeString('id-ID')} · </span>}
        Otomatis tiap {Math.round(POLL_INTERVAL_MS / 1000)} detik
      </footer>
    </div>
  );
}
