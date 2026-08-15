import { useCallback, useEffect, useState } from 'react';
import { fetchStatusPage } from './api';
import GroupSection from './components/GroupSection';
import StatRow from './components/StatRow';
import ActiveIncidentBanner from './components/ActiveIncidentBanner';
import PerformanceChart from './components/PerformanceChart';
import IncidentsList from './components/IncidentsList';
import ThemeToggle from './components/ThemeToggle';
import './App.css';

const POLL_INTERVAL_MS = Number(import.meta.env.VITE_POLL_INTERVAL_MS) || 20000;

export default function App({ slug }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async () => {
    try {
      const statusPage = await fetchStatusPage(slug);
      setData(statusPage);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
    }
  }, [slug]);

  useEffect(() => {
    setData(null);
    setError(null);
    load();
    const id = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (data?.title) document.title = data.title;
  }, [data?.title]);

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

  const activeIncidents = data.incidents.filter((i) => !i.endedAt);

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1>{data.title}</h1>
          {data.description && <p className="page__description">{data.description}</p>}
        </div>
        <ThemeToggle />
      </header>

      <ActiveIncidentBanner incidents={activeIncidents} lastIncident={data.lastIncident} />

      <StatRow monitors={data.monitors} />

      <PerformanceChart monitors={data.monitors} />

      <main>
        {data.groups.map((g) => (
          <GroupSection key={g.id ?? 'ungrouped'} group={g} />
        ))}
      </main>

      <IncidentsList incidents={data.incidents} />

      {error && <p className="error-text error-text--inline">Update terakhir gagal: {error}</p>}

      <footer className="page__footer">
        {lastUpdated && <span>Diperbarui {lastUpdated.toLocaleTimeString('id-ID')} · </span>}
        Otomatis tiap {Math.round(POLL_INTERVAL_MS / 1000)} detik
      </footer>
    </div>
  );
}
