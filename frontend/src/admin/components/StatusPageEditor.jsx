import { useEffect, useState } from 'react';
import { adminApi } from '../adminApi';
import { STATUS_ICON, STATUS_LABEL_ID } from '../../statusMeta';

const SLUG_RE = /^[a-z0-9-]+$/;

export default function StatusPageEditor({ slug, onBack, onSlugChanged }) {
  const [page, setPage] = useState(null);
  const [allMonitors, setAllMonitors] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [slugDraft, setSlugDraft] = useState('');
  const [addMonitorId, setAddMonitorId] = useState('');
  const [addLabel, setAddLabel] = useState('');
  const [addGroupId, setAddGroupId] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [labelDrafts, setLabelDrafts] = useState({});
  const [groupNameDrafts, setGroupNameDrafts] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [p, monitors] = await Promise.all([adminApi.getStatusPage(slug), adminApi.listMonitors()]);
    setPage(p);
    setAllMonitors(monitors);
    setTitle(p.title);
    setDescription(p.description || '');
    setSlugDraft(p.slug);
    setLabelDrafts(Object.fromEntries(p.monitors.map((m) => [m.kumaMonitorId, m.label])));
    setGroupNameDrafts(Object.fromEntries(p.groups.filter((g) => g.id != null).map((g) => [g.id, g.name])));
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
  const namedGroups = page.groups.filter((g) => g.id != null);
  const nextOrder = page.monitors.length
    ? Math.max(...page.monitors.map((m) => m.sortOrder)) + 1
    : 1;

  // Nggak pakai runAction di sini -- kalau slug berubah, memanggil load() dengan slug
  // LAMA (closure masih pegang prop lama sebelum parent re-render) bakal 404. Solusinya:
  // beri tahu parent lewat onSlugChanged supaya prop `slug` berubah, biar useEffect di
  // atas yang otomatis reload pakai slug BARU.
  const saveDetails = async () => {
    const trimmedSlug = slugDraft.trim();
    if (!SLUG_RE.test(trimmedSlug)) {
      setError('Slug cuma boleh huruf kecil, angka, dan "-"');
      return;
    }
    const renaming = trimmedSlug !== slug;
    setBusy(true);
    setError(null);
    try {
      await adminApi.updateStatusPage(slug, { title, description, slug: trimmedSlug });
      if (renaming) {
        onSlugChanged?.(trimmedSlug);
      } else {
        await load();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const selectMonitorToAdd = (id) => {
    setAddMonitorId(id);
    const monitor = allMonitors.find((m) => m.id === Number(id));
    setAddLabel(monitor?.name || '');
  };

  const addMonitor = () => {
    if (!addMonitorId) return;
    runAction(() =>
      adminApi.addMonitor(slug, {
        kumaMonitorId: Number(addMonitorId),
        customLabel: addLabel.trim(),
        sortOrder: nextOrder,
        groupId: addGroupId ? Number(addGroupId) : null,
      })
    ).then(() => {
      setAddMonitorId('');
      setAddLabel('');
      setAddGroupId('');
    });
  };

  const removeMonitor = (kumaMonitorId) =>
    runAction(() => adminApi.removeMonitor(slug, kumaMonitorId));

  const saveLabel = (m) =>
    runAction(() =>
      adminApi.addMonitor(slug, {
        kumaMonitorId: m.kumaMonitorId,
        customLabel: labelDrafts[m.kumaMonitorId] ?? m.label,
        sortOrder: m.sortOrder,
        groupId: m.groupId,
      })
    );

  const setMonitorGroup = (m, newGroupId) =>
    runAction(() =>
      adminApi.addMonitor(slug, {
        kumaMonitorId: m.kumaMonitorId,
        customLabel: m.label,
        sortOrder: m.sortOrder,
        groupId: newGroupId,
      })
    );

  // Reorder cuma antar monitor DALAM grup yang sama -- sort_order antar grup beda nggak
  // saling ngaruh karena composePage nge-bucket per grup dulu baru diurut di dalamnya.
  const moveMonitorInGroup = (groupMonitors, index, direction) => {
    const current = groupMonitors[index];
    const target = groupMonitors[index + direction];
    if (!target) return;
    runAction(async () => {
      await adminApi.addMonitor(slug, {
        kumaMonitorId: current.kumaMonitorId,
        customLabel: current.label,
        sortOrder: target.sortOrder,
        groupId: current.groupId,
      });
      await adminApi.addMonitor(slug, {
        kumaMonitorId: target.kumaMonitorId,
        customLabel: target.label,
        sortOrder: current.sortOrder,
        groupId: target.groupId,
      });
    });
  };

  const addGroup = () => {
    if (!newGroupName.trim()) return;
    runAction(() => adminApi.createGroup(slug, { name: newGroupName.trim() })).then(() =>
      setNewGroupName('')
    );
  };

  const saveGroupName = (group) =>
    runAction(() => adminApi.updateGroup(slug, group.id, { name: groupNameDrafts[group.id] ?? group.name }));

  const removeGroup = (group) => {
    if (!confirm(`Hapus grup "${group.name}"? Monitor di dalamnya tetap ada, cuma jadi tanpa grup.`)) return;
    runAction(() => adminApi.deleteGroup(slug, group.id));
  };

  const moveGroup = (index, direction) => {
    const target = namedGroups[index + direction];
    const current = namedGroups[index];
    if (!target) return;
    runAction(async () => {
      await adminApi.updateGroup(slug, current.id, { sortOrder: target.sortOrder });
      await adminApi.updateGroup(slug, target.id, { sortOrder: current.sortOrder });
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
          <label>
            Slug (URL: /{slugDraft || '...'})
            <input value={slugDraft} onChange={(e) => setSlugDraft(e.target.value)} />
          </label>
          {slugDraft.trim() !== slug && (
            <p className="admin-dim">
              Link lama (/{slug}) akan berhenti berfungsi setelah slug diganti.
            </p>
          )}
          <button className="btn btn--primary" onClick={saveDetails} disabled={busy}>
            Simpan detail
          </button>
        </div>
      </section>

      <section className="admin-card">
        <h2>Grup</h2>
        <p className="admin-dim">
          Kelompokkan monitor di bawah header bernama, mirip fitur Groups di Kuma. Monitor yang belum
          di-assign ke grup manapun tampil di atas tanpa header.
        </p>
        {namedGroups.length === 0 && <p className="admin-dim">Belum ada grup.</p>}
        <ul className="admin-list">
          {namedGroups.map((g, i) => (
            <li key={g.id} className="admin-list__item">
              <input
                className="admin-list__label-input"
                value={groupNameDrafts[g.id] ?? g.name}
                onChange={(e) => setGroupNameDrafts((d) => ({ ...d, [g.id]: e.target.value }))}
              />
              <div className="admin-list__actions">
                <button className="btn" disabled={busy || i === 0} onClick={() => moveGroup(i, -1)}>
                  ↑
                </button>
                <button
                  className="btn"
                  disabled={busy || i === namedGroups.length - 1}
                  onClick={() => moveGroup(i, 1)}
                >
                  ↓
                </button>
                <button className="btn" disabled={busy} onClick={() => saveGroupName(g)}>
                  Simpan nama
                </button>
                <button className="btn btn--danger" disabled={busy} onClick={() => removeGroup(g)}>
                  Hapus grup
                </button>
              </div>
            </li>
          ))}
        </ul>
        <div className="admin-form admin-form--inline">
          <input
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="Nama grup, misal VPN"
          />
          <button className="btn btn--primary" onClick={addGroup} disabled={busy || !newGroupName.trim()}>
            Tambah grup
          </button>
        </div>
      </section>

      <section className="admin-card">
        <h2>Monitor ({page.monitors.length})</h2>

        {page.groups.map((g) => (
          <div key={g.id ?? 'ungrouped'} className="admin-group">
            {g.name && <h3 className="admin-group__title">{g.name}</h3>}
            <ul className="admin-list">
              {g.monitors.map((m, i) => (
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
                  <select
                    value={m.groupId ?? ''}
                    onChange={(e) => setMonitorGroup(m, e.target.value ? Number(e.target.value) : null)}
                    disabled={busy}
                  >
                    <option value="">Tanpa grup</option>
                    {namedGroups.map((ng) => (
                      <option key={ng.id} value={ng.id}>
                        {ng.name}
                      </option>
                    ))}
                  </select>
                  <div className="admin-list__actions">
                    <button className="btn" disabled={busy || i === 0} onClick={() => moveMonitorInGroup(g.monitors, i, -1)}>
                      ↑
                    </button>
                    <button
                      className="btn"
                      disabled={busy || i === g.monitors.length - 1}
                      onClick={() => moveMonitorInGroup(g.monitors, i, 1)}
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
          </div>
        ))}

        <div className="admin-form admin-form--inline">
          <select value={addMonitorId} onChange={(e) => selectMonitorToAdd(e.target.value)}>
            <option value="">— pilih monitor untuk ditambahkan —</option>
            {available.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.hostname})
              </option>
            ))}
          </select>
          {addMonitorId && (
            <input
              value={addLabel}
              onChange={(e) => setAddLabel(e.target.value)}
              placeholder="Nama tampilan"
            />
          )}
          <select value={addGroupId} onChange={(e) => setAddGroupId(e.target.value)}>
            <option value="">Tanpa grup</option>
            {namedGroups.map((ng) => (
              <option key={ng.id} value={ng.id}>
                {ng.name}
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
