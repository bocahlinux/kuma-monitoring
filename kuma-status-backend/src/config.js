import 'dotenv/config';

function requireEnv(name, fallback) {
  const value = process.env[name] ?? fallback;
  return value;
}

export const config = {
  port: Number(process.env.PORT || 4000),
  apiKey: process.env.API_KEY || '',
  corsOrigin: process.env.CORS_ORIGIN || '*',

  kuma: {
    baseUrl: requireEnv('KUMA_BASE_URL', 'http://192.168.168.200:3001'),
    username: requireEnv('KUMA_USERNAME', ''),
    password: requireEnv('KUMA_PASSWORD', ''),
  },

  dbPath: requireEnv('DB_PATH', './data/app.db'),
};

if (!config.kuma.username || !config.kuma.password) {
  console.warn(
    '[config] KUMA_USERNAME / KUMA_PASSWORD belum diisi di .env — koneksi ke Uptime Kuma akan gagal login.'
  );
}
