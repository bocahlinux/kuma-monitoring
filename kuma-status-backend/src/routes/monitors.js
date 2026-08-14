import { Router } from 'express';

export function createMonitorsRouter(kumaClient) {
  const router = Router();

  // GET /api/monitors - semua monitor + status terkini
  router.get('/monitors', (req, res) => {
    res.json({ monitors: kumaClient.getMonitorsSnapshot() });
  });

  // GET /api/monitors/hostname/:hostname - cari monitor berdasarkan hostname (partial match)
  router.get('/monitors/hostname/:hostname', (req, res) => {
    const matches = kumaClient.findMonitorsByHostname(req.params.hostname);
    if (!matches.length) {
      return res.status(404).json({ error: 'Tidak ada monitor dengan hostname tersebut' });
    }
    res.json({ monitors: matches });
  });

  // GET /api/monitors/:id - detail satu monitor berdasarkan ID Kuma
  router.get('/monitors/:id', (req, res) => {
    const monitor = kumaClient.getMonitorById(req.params.id);
    if (!monitor) {
      return res.status(404).json({ error: 'Monitor tidak ditemukan' });
    }
    res.json({ monitor });
  });

  return router;
}
