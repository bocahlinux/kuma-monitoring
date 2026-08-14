import { Router } from 'express';

function composePage(page, pageMonitors, kumaClient) {
  const monitors = pageMonitors.map((pm) => {
    const live = kumaClient.getMonitorById(pm.kuma_monitor_id);
    return {
      kumaMonitorId: pm.kuma_monitor_id,
      label: pm.custom_label || live?.name || `Monitor #${pm.kuma_monitor_id}`,
      sortOrder: pm.sort_order,
      live: live || { id: pm.kuma_monitor_id, status: null, statusLabel: 'unknown' },
    };
  });

  const overallStatus = monitors.some((m) => m.live.status === 0)
    ? 'down'
    : monitors.some((m) => m.live.status == null)
      ? 'unknown'
      : 'up';

  return {
    slug: page.slug,
    title: page.title,
    description: page.description,
    updatedAt: page.updated_at,
    overallStatus,
    monitors,
  };
}

// Endpoint publik -- ini yang dikonsumsi frontend status page, sengaja TANPA API key
// karena datanya memang dimaksudkan buat dilihat publik. Cuma expose status page yang
// slug-nya sudah diketahui (bukan daftar semua status page).
export function createPublicStatusPagesRouter(repo, kumaClient) {
  const router = Router();

  // GET /api/status-pages/:slug - detail satu status page + status live monitor-nya
  router.get('/status-pages/:slug', (req, res) => {
    const page = repo.getPageBySlug(req.params.slug);
    if (!page) return res.status(404).json({ error: 'Status page tidak ditemukan' });
    res.json({ statusPage: composePage(page, repo.getPageMonitors(page.id), kumaClient) });
  });

  return router;
}

// Endpoint admin -- wajib API key, dipakai buat kelola status page (bukan dari frontend publik).
export function createStatusPagesRouter(repo, kumaClient) {
  const router = Router();

  // GET /api/status-pages - list semua custom status page (ringkas)
  router.get('/status-pages', (req, res) => {
    const pages = repo.listPages();
    res.json({
      statusPages: pages.map((p) => composePage(p, repo.getPageMonitors(p.id), kumaClient)),
    });
  });

  // POST /api/status-pages - buat status page baru
  router.post('/status-pages', (req, res) => {
    const { slug, title, description } = req.body || {};
    if (!slug || !title) {
      return res.status(400).json({ error: 'slug dan title wajib diisi' });
    }
    try {
      const page = repo.createPage({ slug, title, description });
      res.status(201).json({ statusPage: composePage(page, repo.getPageMonitors(page.id), kumaClient) });
    } catch (err) {
      if (String(err.message).includes('UNIQUE')) {
        return res.status(409).json({ error: 'slug sudah dipakai' });
      }
      res.status(400).json({ error: err.message });
    }
  });

  // PUT /api/status-pages/:slug - update title/description
  router.put('/status-pages/:slug', (req, res) => {
    const existing = repo.getPageBySlug(req.params.slug);
    if (!existing) return res.status(404).json({ error: 'Status page tidak ditemukan' });
    const { title, description } = req.body || {};
    const page = repo.updatePage(req.params.slug, { title, description });
    res.json({ statusPage: composePage(page, repo.getPageMonitors(page.id), kumaClient) });
  });

  // DELETE /api/status-pages/:slug
  router.delete('/status-pages/:slug', (req, res) => {
    const deleted = repo.deletePage(req.params.slug);
    if (!deleted) return res.status(404).json({ error: 'Status page tidak ditemukan' });
    res.status(204).end();
  });

  // POST /api/status-pages/:slug/monitors - tambah/update monitor dalam status page
  router.post('/status-pages/:slug/monitors', (req, res) => {
    const page = repo.getPageBySlug(req.params.slug);
    if (!page) return res.status(404).json({ error: 'Status page tidak ditemukan' });

    const { kumaMonitorId, customLabel, sortOrder } = req.body || {};
    if (kumaMonitorId == null) {
      return res.status(400).json({ error: 'kumaMonitorId wajib diisi' });
    }
    if (!kumaClient.getMonitorById(kumaMonitorId)) {
      return res.status(400).json({ error: `Monitor id ${kumaMonitorId} tidak ditemukan di Kuma` });
    }

    const monitors = repo.addMonitor(page.id, { kumaMonitorId, customLabel, sortOrder });
    res.status(201).json({ statusPage: composePage(page, monitors, kumaClient) });
  });

  // DELETE /api/status-pages/:slug/monitors/:kumaMonitorId
  router.delete('/status-pages/:slug/monitors/:kumaMonitorId', (req, res) => {
    const page = repo.getPageBySlug(req.params.slug);
    if (!page) return res.status(404).json({ error: 'Status page tidak ditemukan' });

    const removed = repo.removeMonitor(page.id, Number(req.params.kumaMonitorId));
    if (!removed) return res.status(404).json({ error: 'Monitor tidak ada di status page ini' });
    res.status(204).end();
  });

  return router;
}
