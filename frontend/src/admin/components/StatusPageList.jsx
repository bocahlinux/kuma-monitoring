import { useState } from 'react';
import { adminApi } from '../adminApi';

const SLUG_RE = /^[a-z0-9-]+$/;

export default function StatusPageList({ pages, onOpen, onChanged, onLogout }) {
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);

  const create = async (e) => {
    e.preventDefault();
    if (!slug.trim() || !title.trim()) return;
    if (!SLUG_RE.test(slug.trim())) {
      setError('Slug cuma boleh huruf kecil, angka, dan "-"');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      await adminApi.createStatusPage({ slug: slug.trim(), title: title.trim() });
      setSlug('');
      setTitle('');
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const remove = async (pageSlug) => {
    if (!confirm(`Hapus status page "${pageSlug}"? Ini tidak bisa dibatalkan.`)) return;
    await adminApi.deleteStatusPage(pageSlug);
    onChanged();
  };

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <h1>Status Page — Admin</h1>
        <button className="btn btn--ghost" onClick={onLogout}>
          Keluar
        </button>
      </header>

      <section className="admin-card">
        <h2>Status page yang ada</h2>
        {pages.length === 0 && <p className="admin-dim">Belum ada status page.</p>}
        <ul className="admin-list">
          {pages.map((p) => (
            <li key={p.slug} className="admin-list__item">
              <div>
                <strong>{p.title}</strong>
                <span className="admin-dim">
                  {' — '}
                  <a href={`/${p.slug}`} target="_blank" rel="noreferrer">
                    /{p.slug}
                  </a>
                  {' — '}
                  {p.monitors.length} monitor
                </span>
              </div>
              <div className="admin-list__actions">
                <button className="btn" onClick={() => onOpen(p.slug)}>
                  Kelola
                </button>
                <button className="btn btn--danger" onClick={() => remove(p.slug)}>
                  Hapus
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="admin-card">
        <h2>Buat status page baru</h2>
        <form onSubmit={create} className="admin-form">
          <label>
            Slug (buat URL)
            <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="samsat" />
          </label>
          <label>
            Judul
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Status Layanan SAMSAT" />
          </label>
          <button className="btn btn--primary" type="submit" disabled={creating}>
            {creating ? 'Membuat…' : 'Buat'}
          </button>
          {error && <p className="admin-error">{error}</p>}
        </form>
      </section>
    </div>
  );
}
