import { config } from '../config.js';

export function apiKeyAuth(req, res, next) {
  // Kalau API_KEY tidak diisi di .env, backend dianggap dipakai internal saja (tanpa proteksi).
  if (!config.apiKey) return next();

  const key = req.header('x-api-key');
  if (key && key === config.apiKey) return next();

  return res.status(401).json({ error: 'Unauthorized: header x-api-key tidak valid' });
}
