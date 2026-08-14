import { useEffect, useState } from 'react';
import { adminApi } from '../adminApi';
import { STATUS_ICON, STATUS_LABEL_ID } from '../../statusMeta';

export default function StatusPageEditor({ slug, onBack }) {
  const [page, setPage] = useState(null);
  const [allMonitors, setAllMonitors] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [addMonitorId, setAddMonitorId] = useState('');
  const [labelDrafts, setLabelDrafts] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [p, monitors] = await Promise.all([adminApi.getStatusPage(slug), adminApi.listMonitors()]);
    setPage(p);
    setAllMonitors(monitors);
    setTitle(p.title);
    setDescription(p.description || '');
    setLabelDrafts(Object.fromEntries(p.monitors.map((m) => [m.kumaMonitorId, m.label])));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const runAction = async (fn) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!page) return <div className="admin-page">Memuat…</div>;

  const usedIds = new Set(page.monitors.map((m) => m.kumaMonitorId));
  const available = allMonitors.filter((m) => !usedIds.has(m.id));
  const sorted = [...page.monitors].sort((a, b) => a.sortOrder - b.sortOrder);

  const saveDetails = () =>
    runAction(() => adminApi.updateStatusPage(slug, { title, description }));

  const addMonitor = () => {
    if (!addMonitorId) return;
    const monitor = allMonitors.find((m) => m.id === Number(addMonitorId));
    const nextOrder = sorted.length ? sorted[sorted.length - 1].sortOrder + 1 : 1;
    runAction(() =>
      adminApi.addMonitor(slug, {
        kumaMonitorId: Number(addMonitorId),
        customLabel: monitor?.name || '',
        sortOrder: nextOrder,
      })
    ).then(() => setAddMonitorId(''));
  };

  const removeMonitor = (kumaMonitorId) =>
    runAction(() => adminApi.removeMonitor(slug, kumaMonitorId));

  const saveLabel = (m) =>
    runAction(() =>
      adminApi.addMonitor(slug, {
        kumaMonitorId: m.kumaMonitorId,
        customLabel: labelDrafts[m.kumaMonitorId] ?? m.label,
        sortOrder: m.sortOrder,
      })
    );

  const move = (index, direction) => {
    const target = sorted[index + direction];
    const current = sorted[index];
    if (!target) return;
    runAction(async () => {
      await adminApi.addMonitor(slug, {
        kumaMonitorId: current.kumaMonitorId,
        customLabel: current.label,
        sortOrder: target.sortOrder,
      });
      await adminApi.addMonitor(slug, {
        kumaMonitorId: target.kumaMonitorId,
        customLabel: target.label,
        sortOrder: current.sortOrder,
      });
    });
  };

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <h1>{page.title}</h1>
        <button className="btn btn--ghost" onClick={onBack}>
          ← Kembali
        </button>
      </header>

      {error && <p className="admin-error">{error}</p>}

      <section className="admin-card">
        <h2>Detail</h2>
        <div className="admin-form">
          <label>
            Judul
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label>
            Deskripsi
            <input value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <button className="btn btn--primary" onClick={saveDetails} disabled={busy}>
            Simpan detail
          </button>
        </div>
      </section>

      <section className="admin-card">
        <h2>Monitor ({sorted.length})</h2>
        <ul className="admin-list">
          {sorted.map((m, i) => (
            <li key={m.kumaMonitorId} className="admin-list__item admin-list__item--monitor">
              <span className={`status-badge status-badge--${m.live.statusLabel || 'unknown'}`}>
                <span aria-hidden="true">{STATUS_ICON[m.live.statusLabel] || STATUS_ICON.unknown}</span>
                {STATUS_LABEL_ID[m.live.statusLabel] || STATUS_LABEL_ID.unknown}
              </span>
              <input
                className="admin-list__label-input"
                value={labelDrafts[m.kumaMonitorId] ?? m.label}
                onChange={(e) =>
                  setLabelDrafts((d) => ({ ...d, [m.kumaMonitorId]: e.target.value }))
                }
              />
              <span className="admin-dim">{m.live.hostname}</span>
              <div className="admin-list__actions">
                <button className="btn" disabled={busy || i === 0} onClick={() => move(i, -1)}>
                  ↑
                </button>
                <button
                  className="btn"
                  disabled={busy || i === sorted.length - 1}
                  onClick={() => move(i, 1)}
                >
                  ↓
                </button>
                <button className="btn" disabled={busy} onClick={() => saveLabel(m)}>
                  Simpan label
                </button>
                <button
                  className="btn btn--danger"
                  disabled={busy}
                  onClick={() => removeMonitor(m.kumaMonitorId)}
                >
                  Hapus
                </button>
              </div>
            </li>
          ))}
        </ul>

        <div className="admin-form admin-form--inline">
          <select value={addMonitorId} onChange={(e) => setAddMonitorId(e.target.value)}>
            <option value="">— pilih monitor untuk ditambahkan —</option>
            {available.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.hostname})
              </option>
            ))}
          </select>
          <button className="btn btn--primary" onClick={addMonitor} disabled={busy || !addMonitorId}>
            Tambah
          </button>
        </div>
      </section>
    </div>
  );
}
