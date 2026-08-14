# kuma-status-backend

Backend perantara (BFF) antara Uptime Kuma dan frontend status page custom kamu.

- Konek ke Uptime Kuma lewat Socket.IO (login username/password), dapat data lengkap: nama monitor, hostname, status, response time, uptime %.
- Ekspos REST API (`/api/monitors`, `/api/status-pages`) untuk frontend.
- Broadcast update realtime ke frontend lewat WebSocket sendiri (`/ws`).
- Custom status page (pengelompokan monitor, label, urutan) disimpan di SQLite lokal — data uptime historis tetap bersumber dari Kuma.

> Untuk deploy production (Docker, satu stack dengan Uptime Kuma), lihat [README di root repo](../README.md). Dokumen ini untuk development lokal (jalan langsung dengan Node, di luar Docker) dan referensi API.

## Setup development lokal

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

## Bentuk data monitor

Setiap monitor (di `/api/monitors`, `/api/monitors/:id`, dan di dalam `monitors[].live` pada `/api/status-pages/*`) punya field:

```jsonc
{
  "id": 1,
  "name": "01-palangka-raya",
  "hostname": "10.0.1.1",
  "status": 1,               // 0=down, 1=up, 2=pending, 3=maintenance
  "statusLabel": "up",
  "message": null,
  "ping": 12,
  "lastCheckedAt": "2026-08-14 10:00:00",
  "avgPing": 15.2,
  "uptime": { "24": 100, "720": 91.67 },   // key = periode dari Kuma, value = persen
  "cert": null,
  "heartbeats": [                           // maks 50 item terakhir, urut lama -> baru
    { "status": 1, "statusLabel": "up", "time": "...", "ping": 12, "msg": null }
  ]
}
```

`heartbeats` ini yang dipakai buat bikin bar chart ala status page bawaan Kuma (tiap elemen = satu kotak/bar, warnanya dari `status`). Cuma nyimpen 50 heartbeat terakhir per monitor di memory (bukan seluruh history) — kalau butuh history lebih panjang dari itu, ambil langsung dari Kuma, bukan dari backend ini.

## WebSocket (`/ws`)

Setelah connect, server kirim `{ type: "snapshot", kumaStatus, monitors }` sekali di awal, lalu tiap ada perubahan dari Kuma:

- `{ type: "monitor-update", reason, monitor }` — satu monitor berubah (heartbeat baru, uptime update, dll)
- `{ type: "kuma-status", status }` — koneksi/login ke Kuma berubah (connected/loggedIn/error)

## Catatan penting

- Kredensial di `KUMA_USERNAME`/`KUMA_PASSWORD` dipakai backend untuk login ke Kuma seperti dashboard biasa — jangan commit `.env` ke git (`.gitignore` sudah menghandle ini).
- Uptime Kuma tidak mendukung API key untuk login Socket.IO (API key Kuma hanya berlaku untuk endpoint `/metrics` Prometheus), jadi username/password tetap diperlukan untuk metode ini.
- Nama-nama event Socket.IO (`monitorList`, `heartbeat`, `heartbeatList`, `uptime`, dst) mengikuti perilaku Uptime Kuma versi umum saat ini. Kalau ada event yang tidak sesuai dengan versi Kuma kamu, cek console log backend — semua event yang diterima dari socket akan terlihat prosesnya di `src/kuma/kumaClient.js`.
