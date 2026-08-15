import { useCallback, useEffect, useState } from 'react';
import { fetchHome } from './api';
import GroupSection from './components/GroupSection';
import StatRow from './components/StatRow';
import IncidentsList from './components/IncidentsList';
import ThemeToggle from './components/ThemeToggle';
import './App.css';

const POLL_INTERVAL_MS = Number(import.meta.env.VITE_POLL_INTERVAL_MS) || 20000;
const HOME_TITLE = import.meta.env.VITE_HOME_TITLE || 'Status Layanan';
const MAX_INCIDENTS = 15;

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

  useEffect(() => {
    document.title = HOME_TITLE;
  }, []);

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

  const pages = data.statusPages;
  const allMonitors = pages.flatMap((p) => p.monitors);
  const allIncidents = pages
    .flatMap((p) => p.incidents.map((inc) => ({ ...inc, monitorLabel: `${inc.monitorLabel} — ${p.title}` })))
    .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
    .slice(0, MAX_INCIDENTS);

  return (
    <div className="page">
      <header className="page__header">
        <h1>{HOME_TITLE}</h1>
        <ThemeToggle />
      </header>

      <StatRow monitors={allMonitors} />

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

      <IncidentsList incidents={allIncidents} />

      {error && <p className="error-text error-text--inline">Update terakhir gagal: {error}</p>}

      <footer className="page__footer">
        {lastUpdated && <span>Diperbarui {lastUpdated.toLocaleTimeString('id-ID')} · </span>}
        Otomatis tiap {Math.round(POLL_INTERVAL_MS / 1000)} detik
      </footer>
    </div>
  );
}
