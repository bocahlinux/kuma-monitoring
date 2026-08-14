import { Router } from 'express';

export function createHealthRouter(kumaClient) {
  const router = Router();

  router.get('/health', (req, res) => {
    res.json({
      ok: true,
      kuma: kumaClient.getStatus(),
    });
  });

  return router;
}
