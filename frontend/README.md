# frontend

Status page publik — React (Vite), consume `GET /api/status-pages/:slug` dari [kuma-status-backend](../kuma-status-backend) lewat polling berkala. Endpoint itu sengaja tanpa API key karena memang dimaksudkan buat dilihat publik.

## Struktur

- `src/api.js` — fetch ke backend
- `src/App.jsx` — state, polling, banner status keseluruhan
- `src/components/MonitorRow.jsx` — satu baris monitor (badge persentase + nama)
- `src/components/HeartbeatBar.jsx` — bar chart heartbeat (maks 50 terakhir, dari backend)

## Development lokal

```bash
npm install
cp .env.example .env
nano .env   # isi VITE_API_BASE_URL ke backend yang sudah jalan (lokal atau VPS)
npm run dev
```

**Penting:** semua variabel `VITE_*` di-bake ke bundle JS **saat build** (`npm run build` / `npm run dev`), bukan dibaca saat runtime seperti env var backend biasa. Kalau `.env` diubah, restart `npm run dev` atau build ulang.

## Konfigurasi (`.env`)

| Variabel | Keterangan |
|---|---|
| `VITE_API_BASE_URL` | Kosongkan buat production (nginx yang reverse-proxy ke backend, lihat `nginx.conf`). Isi kalau dev lokal langsung ke backend tanpa proxy, misal `http://localhost:4000`. |
| `VITE_STATUS_PAGE_SLUG` | Slug status page yang mau ditampilkan (dari `POST /api/status-pages` di backend) |
| `VITE_POLL_INTERVAL_MS` | Interval polling, default 20000 (20 detik) |
| `VITE_UPTIME_PERIOD_KEY` | Key periode uptime yang dipakai sebagai badge persentase (default `"24"`) — cek response backend buat lihat key apa saja yang tersedia |

## Build & Docker

```bash
npm run build   # -> dist/
```

`Dockerfile` di sini multi-stage: build dengan Node, lalu di-serve pakai nginx (`nginx.conf`, SPA fallback ke `index.html`). Deploy production diatur lewat `docker-compose.yml` di root repo — lihat [README di root](../README.md#frontend-status-page-publik).
