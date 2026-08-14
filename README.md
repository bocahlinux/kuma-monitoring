# kuma-status-backend

Backend perantara (BFF) antara Uptime Kuma dan frontend status page custom kamu.

- Konek ke Uptime Kuma lewat Socket.IO (login username/password), dapat data lengkap: nama monitor, hostname, status, response time, uptime %.
- Ekspos REST API (`/api/monitors`, `/api/status-pages`) untuk frontend.
- Broadcast update realtime ke frontend lewat WebSocket sendiri (`/ws`).
- Custom status page (pengelompokan monitor, label, urutan) disimpan di SQLite lokal — data uptime historis tetap bersumber dari Kuma.

## Setup

```bash
npm install
cp .env.example .env
```

Isi `.env`:

```
KUMA_BASE_URL=http://192.168.168.200:3001
KUMA_USERNAME=<username login Kuma>
KUMA_PASSWORD=<password login Kuma>
API_KEY=<isi kalau backend ini diakses dari luar jaringan lokal>
```

Jalankan:

```bash
npm run dev    # dengan auto-restart
npm start      # production
```

Server jalan di `http://localhost:4000` (ubah lewat `PORT` di `.env`).

## Autentikasi

Kalau `API_KEY` diisi di `.env`, semua endpoint `/api/*` wajib kirim header:

```
x-api-key: <API_KEY>
```

Untuk WebSocket, kirim sebagai query string: `ws://localhost:4000/ws?apiKey=<API_KEY>`.

`/health` selalu tanpa proteksi.

## REST API

| Method | Endpoint | Keterangan |
|---|---|---|
| GET | `/health` | Status backend + status koneksi ke Kuma |
| GET | `/api/monitors` | Semua monitor + status terkini |
| GET | `/api/monitors/:id` | Detail satu monitor berdasarkan ID Kuma |
| GET | `/api/monitors/hostname/:hostname` | Cari monitor berdasarkan hostname (partial match) |
| GET | `/api/status-pages` | List custom status page |
| GET | `/api/status-pages/:slug` | Detail status page + status live monitor di dalamnya |
| POST | `/api/status-pages` | Buat status page baru — body: `{ slug, title, description }` |
| PUT | `/api/status-pages/:slug` | Update title/description |
| DELETE | `/api/status-pages/:slug` | Hapus status page |
| POST | `/api/status-pages/:slug/monitors` | Tambah/update monitor di status page — body: `{ kumaMonitorId, customLabel, sortOrder }` |
| DELETE | `/api/status-pages/:slug/monitors/:kumaMonitorId` | Keluarkan monitor dari status page |

## WebSocket (`/ws`)

Setelah connect, server kirim `{ type: "snapshot", kumaStatus, monitors }` sekali di awal, lalu tiap ada perubahan dari Kuma:

- `{ type: "monitor-update", reason, monitor }` — satu monitor berubah (heartbeat baru, uptime update, dll)
- `{ type: "kuma-status", status }` — koneksi/login ke Kuma berubah (connected/loggedIn/error)

## Deploy dengan Docker (satu stack dengan Uptime Kuma)

Kalau kamu menjalankan Uptime Kuma via docker-compose (`uptime-kuma` + `monitoring-mariadb` + `monitoring-cloudflared` di network `monitoring-network`), backend ini dijalankan sebagai service tambahan di compose yang sama supaya bisa saling terhubung lewat nama container, tanpa keluar ke internet/LAN.

1. Di host Docker Kuma, salin folder project ini ke `./kuma-status-backend` (sejajar dengan folder `./data` yang sudah ada), **tanpa** ikut menyalin `node_modules`, `data/`, atau `.env` lokal (`.dockerignore` sudah menghandle ini saat build).
2. Ganti `docker-compose.yml` yang sekarang dengan [deploy/docker-compose.yml](deploy/docker-compose.yml) — isinya sama seperti punya kamu, ditambah service `kuma-status-backend`.
3. Tambahkan variabel berikut ke `.env` yang dipakai compose (satu file dengan `TZ`, `MYSQL_*`, `CLOUDFLARE_TUNNEL_TOKEN`):
   ```
   KUMA_USERNAME=<username login Kuma>
   KUMA_PASSWORD=<password login Kuma>
   API_KEY=<isi kalau mau proteksi endpoint /api/*>
   CORS_ORIGIN=*
   ```
4. Jalankan:
   ```bash
   docker compose up -d --build kuma-status-backend
   ```
5. Cek statusnya: `docker compose logs -f kuma-status-backend` — pastikan log menunjukkan `login berhasil`.

Karena tidak ada `ports:` yang di-publish, backend ini **hanya bisa diakses dari dalam `monitoring-network`** (termasuk oleh `monitoring-cloudflared`). Supaya bisa diakses dari luar:

- Buka **Cloudflare Zero Trust dashboard → Networks → Tunnels** → pilih tunnel yang dipakai `monitoring-cloudflared`.
- Tambahkan **Public Hostname** baru, misal `status-api.domainkamu.com`, dengan **Service** mengarah ke `http://kuma-status-backend:4000` (nama container + port internal, bukan IP).
- Frontend custom kamu tinggal fetch ke `https://status-api.domainkamu.com/api/...` dan connect WebSocket ke `wss://status-api.domainkamu.com/ws?apiKey=...`.

Kalau suatu saat butuh akses langsung tanpa lewat tunnel (misal buat debug), tambahkan `ports: ["100.83.41.88:4000:4000"]` di service `kuma-status-backend` seperti pola Kuma.

## Catatan penting

- Kredensial di `KUMA_USERNAME`/`KUMA_PASSWORD` dipakai backend untuk login ke Kuma seperti dashboard biasa — jangan commit `.env` ke git (`.gitignore` sudah menghandle ini).
- Uptime Kuma tidak mendukung API key untuk login Socket.IO (API key Kuma hanya berlaku untuk endpoint `/metrics` Prometheus), jadi username/password tetap diperlukan untuk metode ini.
- Nama-nama event Socket.IO (`monitorList`, `heartbeat`, `heartbeatList`, `uptime`, dst) mengikuti perilaku Uptime Kuma versi umum saat ini. Kalau ada event yang tidak sesuai dengan versi Kuma kamu, cek console log backend — semua event yang diterima dari socket akan terlihat prosesnya di `src/kuma/kumaClient.js`.
