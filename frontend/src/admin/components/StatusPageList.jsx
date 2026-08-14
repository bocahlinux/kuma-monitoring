import { useState } from 'react';
import { adminApi } from '../adminApi';

const SLUG_RE = /^[a-z0-9-]+$/;

export default function StatusPageList({ pages, onOpen, onChanged, onLogout }) {
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [showOnHome, setShowOnHome] = useState(true);
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
      await adminApi.createStatusPage({ slug: slug.trim(), title: title.trim(), showOnHome });
      setSlug('');
      setTitle('');
      setShowOnHome(true);
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

  const toggleHome = async (page) => {
    await adminApi.updateStatusPage(page.slug, { showOnHome: !page.showOnHome });
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
        <p className="admin-dim">
          "Tampil di /" = ikut muncul sebagai kategori di halaman utama (<a href="/" target="_blank" rel="noreferrer">/</a>).
          Nonaktif = cuma bisa diakses lewat link langsungnya.
        </p>
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
                <label className="admin-checkbox">
                  <input type="checkbox" checked={p.showOnHome} onChange={() => toggleHome(p)} />
                  Tampil di /
                </label>
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
          <label className="admin-checkbox">
            <input
              type="checkbox"
              checked={showOnHome}
              onChange={(e) => setShowOnHome(e.target.checked)}
            />
            Tampil di halaman utama (/)
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
