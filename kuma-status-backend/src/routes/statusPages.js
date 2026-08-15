import { Router } from 'express';
import { statusBadgeSvg } from '../badge.js';

const MAX_INCIDENTS = 15;
// Badge status berubah tiap heartbeat, tapi nggak butuh presisi detik -- cache
// pendek biar embed di README/wiki nggak nge-hit backend tiap kali ada yang buka
// halaman itu, tanpa nampilin status yang basi lama-lama.
const BADGE_CACHE_CONTROL = 'public, max-age=60';

function mapIncident(row, labelByMonitorId) {
  if (!row) return null;
  return {
    id: row.id,
    kumaMonitorId: row.kuma_monitor_id,
    monitorLabel: labelByMonitorId.get(row.kuma_monitor_id) || `Monitor #${row.kuma_monitor_id}`,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    message: row.message,
    note: row.note,
  };
}

function composePage(page, pageMonitors, pageGroups, incidentRows, lastIncidentRow, kumaClient) {
  const monitors = pageMonitors.map((pm) => {
    const live = kumaClient.getMonitorById(pm.kuma_monitor_id);
    return {
      kumaMonitorId: pm.kuma_monitor_id,
      label: pm.custom_label || live?.name || `Monitor #${pm.kuma_monitor_id}`,
      sortOrder: pm.sort_order,
      groupId: pm.group_id ?? null,
      isPrimary: !!pm.is_primary,
      live: live || { id: pm.kuma_monitor_id, status: null, statusLabel: 'unknown' },
    };
  });

  const overallStatus = monitors.some((m) => m.live.status === 0)
    ? 'down'
    : monitors.some((m) => m.live.status == null)
      ? 'unknown'
      : 'up';

  const sortedMonitors = [...monitors].sort((a, b) => a.sortOrder - b.sortOrder);

  // Monitor primary ("host") selalu tampil duluan dalam grupnya, apa pun sortOrder-nya
  // -- Array.sort stabil (ES2019+) jadi urutan sortOrder yang lain tetap kejaga di antara
  // sesama monitor yang bukan primary.
  const byPrimaryFirst = (list) => [...list].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));

  const namedGroups = [...pageGroups]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((g) => ({
      id: g.id,
      name: g.name,
      sortOrder: g.sort_order,
      monitors: byPrimaryFirst(sortedMonitors.filter((m) => m.groupId === g.id)),
    }));

  const ungroupedMonitors = byPrimaryFirst(sortedMonitors.filter((m) => m.groupId == null));
  // Grup semu buat monitor yang belum di-assign ke grup manapun -- selalu tampil
  // duluan, tanpa header (name: null) kalau memang ada isinya.
  const groups = ungroupedMonitors.length
    ? [{ id: null, name: null, sortOrder: -1, monitors: ungroupedMonitors }, ...namedGroups]
    : namedGroups;

  const labelByMonitorId = new Map(monitors.map((m) => [m.kumaMonitorId, m.label]));
  const incidents = incidentRows.map((row) => mapIncident(row, labelByMonitorId));

  return {
    slug: page.slug,
    title: page.title,
    description: page.description,
    updatedAt: page.updated_at,
    showOnHome: !!page.show_on_home,
    overallStatus,
    monitors,
    groups,
    incidents,
    // Insiden terakhir yang PERNAH tercatat (aktif atau sudah selesai), dipisah dari
    // `incidents` (yang cuma 15 terbaru) biar selalu ada walau daftar itu kepotong --
    // dipakai halaman publik buat banner "insiden terakhir X hari lalu".
    lastIncident: mapIncident(lastIncidentRow, labelByMonitorId),
  };
}

function composeFull(repo, incidentsRepo, page, kumaClient) {
  const monitors = repo.getPageMonitors(page.id);
  const groups = repo.listGroups(page.id);
  const monitorIds = monitors.map((m) => m.kuma_monitor_id);
  const incidentRows = incidentsRepo.listRecentForMonitors(monitorIds, MAX_INCIDENTS);
  const lastIncidentRow = incidentsRepo.getLastForMonitors(monitorIds);
  return composePage(page, monitors, groups, incidentRows, lastIncidentRow, kumaClient);
}

function combinedOverallStatus(pages) {
  if (pages.some((p) => p.overallStatus === 'down')) return 'down';
  if (pages.some((p) => p.overallStatus === 'unknown')) return 'unknown';
  return 'up';
}

// Endpoint publik -- ini yang dikonsumsi frontend status page, sengaja TANPA API key
// karena datanya memang dimaksudkan buat dilihat publik. Cuma expose status page yang
// slug-nya sudah diketahui, atau (buat /home) status page yang di-toggle "tampil di
// halaman utama" -- bukan daftar SEMUA status page (itu tetap admin-only).
export function createPublicStatusPagesRouter(repo, incidentsRepo, kumaClient) {
  const router = Router();

  // GET /api/home - gabungan semua status page yang di-toggle tampil di halaman utama
  router.get('/home', (req, res) => {
    const pages = repo.listVisiblePages().map((p) => composeFull(repo, incidentsRepo, p, kumaClient));
    res.json({ statusPages: pages, overallStatus: combinedOverallStatus(pages) });
  });

  // GET /api/status-pages/:slug - detail satu status page + status live monitor-nya
  router.get('/status-pages/:slug', (req, res) => {
    const page = repo.getPageBySlug(req.params.slug);
    if (!page) return res.status(404).json({ error: 'Status page tidak ditemukan' });
    res.json({ statusPage: composeFull(repo, incidentsRepo, page, kumaClient) });
  });

  // GET /api/status-pages/:slug/badge.svg - badge status ala shields.io, buat ditempel
  // di README/wiki/dokumen lain di luar situs ini.
  router.get('/status-pages/:slug/badge.svg', (req, res) => {
    const page = repo.getPageBySlug(req.params.slug);
    if (!page) return res.status(404).type('text/plain').send('status page tidak ditemukan');
    const composed = composeFull(repo, incidentsRepo, page, kumaClient);
    res.set('Content-Type', 'image/svg+xml').set('Cache-Control', BADGE_CACHE_CONTROL);
    res.send(statusBadgeSvg(composed.overallStatus));
  });

  // GET /api/home/badge.svg - badge gabungan semua status page yang tampil di halaman utama
  router.get('/home/badge.svg', (req, res) => {
    const pages = repo.listVisiblePages().map((p) => composeFull(repo, incidentsRepo, p, kumaClient));
    res.set('Content-Type', 'image/svg+xml').set('Cache-Control', BADGE_CACHE_CONTROL);
    res.send(statusBadgeSvg(combinedOverallStatus(pages)));
  });

  return router;
}

// Endpoint admin -- wajib API key, dipakai buat kelola status page (bukan dari frontend publik).
export function createStatusPagesRouter(repo, incidentsRepo, kumaClient) {
  const router = Router();

  function requirePage(req, res) {
    const page = repo.getPageBySlug(req.params.slug);
    if (!page) {
      res.status(404).json({ error: 'Status page tidak ditemukan' });
      return null;
    }
    return page;
  }

  // Group harus benar-benar milik status page di URL -- jangan sampai slug A bisa
  // ngedit/hapus grup milik slug B cuma dengan nebak groupId.
  function requireOwnedGroup(page, groupId, res) {
    const group = repo.getGroupById(groupId);
    if (!group || group.status_page_id !== page.id) {
      res.status(404).json({ error: 'Grup tidak ditemukan di status page ini' });
      return null;
    }
    return group;
  }

  // GET /api/status-pages - list semua custom status page (ringkas)
  router.get('/status-pages', (req, res) => {
    const pages = repo.listPages();
    res.json({ statusPages: pages.map((p) => composeFull(repo, incidentsRepo, p, kumaClient)) });
  });

  // POST /api/status-pages - buat status page baru
  router.post('/status-pages', (req, res) => {
    const { slug, title, description, showOnHome } = req.body || {};
    if (!slug || !title) {
      return res.status(400).json({ error: 'slug dan title wajib diisi' });
    }
    try {
      const page = repo.createPage({ slug, title, description, showOnHome });
      res.status(201).json({ statusPage: composeFull(repo, incidentsRepo, page, kumaClient) });
    } catch (err) {
      if (String(err.message).includes('UNIQUE')) {
        return res.status(409).json({ error: 'slug sudah dipakai' });
      }
      res.status(400).json({ error: err.message });
    }
  });

  // PUT /api/status-pages/:slug - update title/description/showOnHome/slug
  router.put('/status-pages/:slug', (req, res) => {
    const existing = requirePage(req, res);
    if (!existing) return;
    const { title, description, showOnHome, slug } = req.body || {};
    try {
      const page = repo.updatePage(req.params.slug, { title, description, showOnHome, slug });
      res.json({ statusPage: composeFull(repo, incidentsRepo, page, kumaClient) });
    } catch (err) {
      if (String(err.message).includes('UNIQUE')) {
        return res.status(409).json({ error: 'slug sudah dipakai' });
      }
      res.status(400).json({ error: err.message });
    }
  });

  // DELETE /api/status-pages/:slug
  router.delete('/status-pages/:slug', (req, res) => {
    const deleted = repo.deletePage(req.params.slug);
    if (!deleted) return res.status(404).json({ error: 'Status page tidak ditemukan' });
    res.status(204).end();
  });

  // POST /api/status-pages/:slug/groups - buat grup baru di status page ini
  router.post('/status-pages/:slug/groups', (req, res) => {
    const page = requirePage(req, res);
    if (!page) return;
    const { name, sortOrder } = req.body || {};
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'name wajib diisi' });
    }
    repo.createGroup(page.id, { name: name.trim(), sortOrder });
    res.status(201).json({ statusPage: composeFull(repo, incidentsRepo, page, kumaClient) });
  });

  // PUT /api/status-pages/:slug/groups/:groupId - ubah nama/urutan grup
  router.put('/status-pages/:slug/groups/:groupId', (req, res) => {
    const page = requirePage(req, res);
    if (!page) return;
    const group = requireOwnedGroup(page, Number(req.params.groupId), res);
    if (!group) return;
    const { name, sortOrder } = req.body || {};
    repo.updateGroup(group.id, { name, sortOrder });
    res.json({ statusPage: composeFull(repo, incidentsRepo, page, kumaClient) });
  });

  // DELETE /api/status-pages/:slug/groups/:groupId - hapus grup (monitor di dalamnya jadi tanpa grup)
  router.delete('/status-pages/:slug/groups/:groupId', (req, res) => {
    const page = requirePage(req, res);
    if (!page) return;
    const group = requireOwnedGroup(page, Number(req.params.groupId), res);
    if (!group) return;
    repo.deleteGroup(group.id);
    res.json({ statusPage: composeFull(repo, incidentsRepo, page, kumaClient) });
  });

  // POST /api/status-pages/:slug/monitors - tambah/update monitor dalam status page
  router.post('/status-pages/:slug/monitors', (req, res) => {
    const page = requirePage(req, res);
    if (!page) return;

    const { kumaMonitorId, customLabel, sortOrder, groupId } = req.body || {};
    if (kumaMonitorId == null) {
      return res.status(400).json({ error: 'kumaMonitorId wajib diisi' });
    }
    if (!kumaClient.getMonitorById(kumaMonitorId)) {
      return res.status(400).json({ error: `Monitor id ${kumaMonitorId} tidak ditemukan di Kuma` });
    }
    if (groupId != null && !requireOwnedGroup(page, groupId, res)) return;

    repo.addMonitor(page.id, { kumaMonitorId, customLabel, sortOrder, groupId });
    res.status(201).json({ statusPage: composeFull(repo, incidentsRepo, page, kumaClient) });
  });

  // PUT /api/status-pages/:slug/monitors/:kumaMonitorId/primary - toggle jadi/bukan "host" grupnya
  router.put('/status-pages/:slug/monitors/:kumaMonitorId/primary', (req, res) => {
    const page = requirePage(req, res);
    if (!page) return;
    repo.togglePrimaryMonitor(page.id, Number(req.params.kumaMonitorId));
    res.json({ statusPage: composeFull(repo, incidentsRepo, page, kumaClient) });
  });

  // DELETE /api/status-pages/:slug/monitors/:kumaMonitorId
  router.delete('/status-pages/:slug/monitors/:kumaMonitorId', (req, res) => {
    const page = requirePage(req, res);
    if (!page) return;

    const removed = repo.removeMonitor(page.id, Number(req.params.kumaMonitorId));
    if (!removed) return res.status(404).json({ error: 'Monitor tidak ada di status page ini' });
    res.status(204).end();
  });

  // PUT /api/status-pages/:slug/incidents/:incidentId - isi/ubah catatan admin (root cause dll)
  router.put('/status-pages/:slug/incidents/:incidentId', (req, res) => {
    const page = requirePage(req, res);
    if (!page) return;

    const incident = incidentsRepo.getById(Number(req.params.incidentId));
    if (!incident) return res.status(404).json({ error: 'Insiden tidak ditemukan' });

    // Insiden nggak punya status_page_id sendiri -- kepemilikannya dicek lewat monitor-nya
    // memang ter-assign ke status page di URL, biar slug A nggak bisa ngedit insiden slug B.
    const pageMonitorIds = new Set(repo.getPageMonitors(page.id).map((m) => m.kuma_monitor_id));
    if (!pageMonitorIds.has(incident.kuma_monitor_id)) {
      return res.status(404).json({ error: 'Insiden tidak ditemukan di status page ini' });
    }

    incidentsRepo.updateNote(incident.id, req.body?.note);
    res.json({ statusPage: composeFull(repo, incidentsRepo, page, kumaClient) });
  });

  return router;
}
