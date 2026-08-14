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

`GET /api/home` dan `GET /api/status-pages/:slug` **sengaja publik, tanpa API key** — itu endpoint yang dikonsumsi frontend status page yang memang buat dilihat umum. Kalau API key diwajibkan di situ, key-nya bakal kelihatan siapa saja lewat DevTools browser, jadi percuma jadi rahasia.

Semua endpoint `/api/*` lainnya (termasuk `GET /api/monitors` yang isinya semua monitor mentah, dan semua endpoint kelola status page) **wajib** header, kalau `API_KEY` diisi di `.env`:

```
x-api-key: <API_KEY>
```

`/health` juga selalu tanpa proteksi.

## REST API

| Method | Endpoint | Auth | Keterangan |
|---|---|---|---|
| GET | `/health` | publik | Status backend + status koneksi ke Kuma |
| GET | `/api/home` | **publik** | Gabungan semua status page yang di-toggle `showOnHome` — dipakai halaman `/` frontend |
| GET | `/api/status-pages/:slug` | **publik** | Detail satu status page + status live monitor di dalamnya — dipakai halaman `/<slug>` frontend |
| GET | `/api/monitors` | API key | Semua monitor mentah + status terkini |
| GET | `/api/monitors/:id` | API key | Detail satu monitor berdasarkan ID Kuma |
| GET | `/api/monitors/hostname/:hostname` | API key | Cari monitor berdasarkan hostname (partial match) |
| GET | `/api/status-pages` | API key | List semua custom status page (admin, termasuk yang `showOnHome`-nya nonaktif) |
| POST | `/api/status-pages` | API key | Buat status page baru — body: `{ slug, title, description, showOnHome? }` (default `showOnHome: true`) |
| PUT | `/api/status-pages/:slug` | API key | Update title/description/showOnHome/slug — body: `{ title?, description?, showOnHome?, slug? }`. Ganti `slug` cuma ubah URL akses (`/<slug>` lama langsung 404), relasi monitor/grup nggak kepengaruh karena dikaitkan lewat id numerik internal, bukan slug. |
| DELETE | `/api/status-pages/:slug` | API key | Hapus status page |
| POST | `/api/status-pages/:slug/groups` | API key | Buat grup baru di status page ini (fitur "Groups" ala Kuma) — body: `{ name, sortOrder? }` |
| PUT | `/api/status-pages/:slug/groups/:groupId` | API key | Ubah nama/urutan grup — body: `{ name?, sortOrder? }` |
| DELETE | `/api/status-pages/:slug/groups/:groupId` | API key | Hapus grup — monitor di dalamnya **tidak ikut terhapus**, cuma jadi tanpa grup |
| POST | `/api/status-pages/:slug/monitors` | API key | Tambah/update monitor di status page — body: `{ kumaMonitorId, customLabel, sortOrder, groupId? }` (`groupId: null`/dikosongkan = tanpa grup) |
| DELETE | `/api/status-pages/:slug/monitors/:kumaMonitorId` | API key | Keluarkan monitor dari status page |

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

## Bentuk data status page (Groups)

Response `statusPage` (dari `/api/home` → `statusPages[]`, atau `/api/status-pages/:slug`) punya `monitors` (flat, semua monitor apa adanya) **dan** `groups` (sudah dikelompokkan, ini yang dipakai buat render):

```jsonc
{
  "slug": "samsat",
  "title": "Status Layanan",
  "showOnHome": true,
  "overallStatus": "up",
  "monitors": [ /* flat, tiap item punya groupId (null kalau tanpa grup) */ ],
  "groups": [
    { "id": null, "name": null, "monitors": [ /* belum di-assign ke grup manapun */ ] },
    { "id": 1, "name": "VPN", "sortOrder": 0, "monitors": [ /* ... */ ] },
    { "id": 2, "name": "SAMSAT", "sortOrder": 1, "monitors": [ /* ... */ ] }
  ],
  "incidents": [
    { "id": 1, "kumaMonitorId": 4, "monitorLabel": "01-palangka-raya", "startedAt": "2026-08-14T10:00:00.000Z", "endedAt": "2026-08-14T10:05:00.000Z", "message": "Connection timeout" }
  ]
}
```

Grup `id: null` (tanpa nama) selalu muncul pertama kalau ada monitor yang belum di-assign — frontend nge-render itu tanpa header sama sekali. Kelola grup lewat endpoint `/api/status-pages/:slug/groups*` di tabel di atas.

## Riwayat insiden (otomatis, bukan manual)

Backend sendiri yang mendeteksi transisi up↔down dari live heartbeat Kuma (lihat `src/kuma/incidentTracker.js`) dan mencatatnya ke tabel `incidents` di SQLite — **bukan** sesuatu yang di-input manual lewat `/admin`. Tiap `statusPage` response otomatis membawa maks 15 insiden terbaru (`incidents`, sudah urut terbaru dulu) dari monitor-monitor yang ada di page itu; `endedAt: null` artinya insiden masih berlangsung.

Batasan yang perlu diketahui: state "status terakhir yang diobservasi" cuma disimpan di memory (bukan di database), jadi kalau backend di-restart pas ada monitor yang lagi down, transisi down→up berikutnya buat monitor itu tidak akan tercatat sebagai insiden yang "ditutup" (karena tracker menganggap itu observasi pertama, bukan pemulihan) — insiden historis yang sudah tercatat sebelum restart tetap aman, cuma satu insiden yang kebetulan lagi berlangsung pas restart itu yang datanya tidak lengkap.

## WebSocket (`/ws`)

Setelah connect, server kirim `{ type: "snapshot", kumaStatus, monitors }` sekali di awal, lalu tiap ada perubahan dari Kuma:

- `{ type: "monitor-update", reason, monitor }` — satu monitor berubah (heartbeat baru, uptime update, dll)
- `{ type: "kuma-status", status }` — koneksi/login ke Kuma berubah (connected/loggedIn/error)

## Catatan penting

- Kredensial di `KUMA_USERNAME`/`KUMA_PASSWORD` dipakai backend untuk login ke Kuma seperti dashboard biasa — jangan commit `.env` ke git (`.gitignore` sudah menghandle ini).
- Uptime Kuma tidak mendukung API key untuk login Socket.IO (API key Kuma hanya berlaku untuk endpoint `/metrics` Prometheus), jadi username/password tetap diperlukan untuk metode ini.
- Nama-nama event Socket.IO (`monitorList`, `heartbeat`, `heartbeatList`, `uptime`, dst) mengikuti perilaku Uptime Kuma versi umum saat ini. Kalau ada event yang tidak sesuai dengan versi Kuma kamu, cek console log backend — semua event yang diterima dari socket akan terlihat prosesnya di `src/kuma/kumaClient.js`.
