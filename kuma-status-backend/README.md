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
API_KEY=<opsional, buat script/curl -- lihat bagian Autentikasi>
ADMIN_USERNAME=<username admin pertama, dibuat sekali saat tabel users masih kosong>
ADMIN_PASSWORD=<password admin pertama>
COOKIE_SECURE=false   # "true" cuma kalau backend HANYA diakses lewat HTTPS
```

Jalankan:

```bash
npm run dev    # dengan auto-restart
npm start      # production
```

Server jalan di `http://localhost:4000` (ubah lewat `PORT` di `.env`).

## Autentikasi

`GET /api/home` dan `GET /api/status-pages/:slug` **sengaja publik, tanpa login** — itu endpoint yang dikonsumsi frontend status page yang memang buat dilihat umum.

Semua endpoint `/api/*` lainnya (termasuk `GET /api/monitors`, semua endpoint kelola status page, dan `/api/users`) **wajib** salah satu dari dua jalur berikut:

1. **Cookie sesi** hasil `POST /api/auth/login` (body `{ username, password }`) — akun disimpan di tabel `users` (password di-hash `bcrypt`), sesi disimpan di tabel `sessions` dan dikirim ke browser sebagai cookie `httpOnly`. Ini yang dipakai panel `/admin`. Akun pertama otomatis dibuat dari `ADMIN_USERNAME`/`ADMIN_PASSWORD` di `.env` saat tabel `users` masih kosong (cuma sekali, restart berikutnya tidak menimpa password yang sudah diganti lewat UI). `POST /api/auth/logout` mencabut sesi, `GET /api/auth/me` buat cek status login.
2. **Header `x-api-key`**, kalau `API_KEY` diisi di `.env` — jalur alternatif buat script/curl/integrasi lain, berdampingan dengan login di atas:

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
| GET | `/api/status-pages/:slug/badge.svg` | **publik** | Badge status ala shields.io (`image/svg+xml`, cache 60 detik) — buat ditempel di README/wiki/dokumen lain di luar situs ini |
| GET | `/api/home/badge.svg` | **publik** | Sama kayak di atas, tapi gabungan semua status page yang tampil di halaman utama |
| GET | `/api/monitors` | login | Semua monitor mentah + status terkini |
| GET | `/api/monitors/:id` | login | Detail satu monitor berdasarkan ID Kuma |
| GET | `/api/monitors/hostname/:hostname` | login | Cari monitor berdasarkan hostname (partial match) |
| GET | `/api/status-pages` | login | List semua custom status page (admin, termasuk yang `showOnHome`-nya nonaktif) |
| POST | `/api/status-pages` | login | Buat status page baru — body: `{ slug, title, description, showOnHome? }` (default `showOnHome: true`) |
| PUT | `/api/status-pages/:slug` | login | Update title/description/showOnHome/slug — body: `{ title?, description?, showOnHome?, slug? }`. Ganti `slug` cuma ubah URL akses (`/<slug>` lama langsung 404), relasi monitor/grup nggak kepengaruh karena dikaitkan lewat id numerik internal, bukan slug. |
| DELETE | `/api/status-pages/:slug` | login | Hapus status page |
| POST | `/api/status-pages/:slug/groups` | login | Buat grup baru di status page ini (fitur "Groups" ala Kuma) — body: `{ name, sortOrder? }` |
| PUT | `/api/status-pages/:slug/groups/:groupId` | login | Ubah nama/urutan grup — body: `{ name?, sortOrder? }` |
| DELETE | `/api/status-pages/:slug/groups/:groupId` | login | Hapus grup — monitor di dalamnya **tidak ikut terhapus**, cuma jadi tanpa grup |
| POST | `/api/status-pages/:slug/monitors` | login | Tambah/update monitor di status page — body: `{ kumaMonitorId, customLabel, sortOrder, groupId? }` (`groupId: null`/dikosongkan = tanpa grup) |
| PUT | `/api/status-pages/:slug/monitors/:kumaMonitorId/primary` | login | Toggle jadi/bukan "host" grupnya — lihat "Host per grup" di bawah |
| DELETE | `/api/status-pages/:slug/monitors/:kumaMonitorId` | login | Keluarkan monitor dari status page |
| PUT | `/api/status-pages/:slug/incidents/:incidentId` | login | Isi/ubah catatan admin (root cause dll) — body: `{ note }`. Insiden harus dari monitor yang ter-assign di status page ini, kalau tidak 404 |
| POST | `/api/auth/login` | publik | body: `{ username, password }` — set cookie sesi kalau cocok |
| POST | `/api/auth/logout` | publik | Cabut sesi (idempotent, boleh dipanggil walau sudah logout) |
| GET | `/api/auth/me` | login | Info user dari sesi/x-api-key yang sedang dipakai |
| GET | `/api/users` | login | List user admin (tanpa password) |
| POST | `/api/users` | login | Buat user admin baru — body: `{ username, password }` |
| PUT | `/api/users/:id` | login | Ubah username dan/atau password (password opsional = tidak diganti; ganti password mencabut sesi lama user itu) |
| DELETE | `/api/users/:id` | login | Hapus user — ditolak (400) kalau itu user terakhir yang tersisa |

## Host per grup (dinamis)

Satu monitor dalam satu grup bisa ditandai sebagai **host** (misal server Proxmox utama, dengan CT/VM-nya sebagai anggota grup yang sama) lewat `PUT .../monitors/:kumaMonitorId/primary` — endpoint ini **toggle**, bukan set: panggil sekali untuk jadi host (otomatis melepas host lama di grup yang sama, cuma boleh satu per grup), panggil lagi untuk melepas. Monitor yang jadi host otomatis tampil **paling atas** dalam grupnya di response (`groups[].monitors`), apa pun `sortOrder`-nya — dan field `isPrimary: true` ikut kebawa di objek monitor. Pindah host kapan saja lewat endpoint yang sama, nggak ada batasan permanen.

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
  "tags": [],                               // fitur tag Kuma, lihat catatan di bawah
  "heartbeats": [                           // maks 50 item terakhir, urut lama -> baru
    { "status": 1, "statusLabel": "up", "time": "...", "ping": 12, "msg": null }
  ]
}
```

`heartbeats` ini yang dipakai buat bikin bar chart ala status page bawaan Kuma (tiap elemen = satu kotak/bar, warnanya dari `status`). Cuma nyimpen 50 heartbeat terakhir per monitor di memory (bukan seluruh history) — kalau butuh history lebih panjang dari itu, ambil langsung dari Kuma, bukan dari backend ini.

`cert` (info sertifikat TLS, buat monitor HTTPS) dan `tags` (kategori berwarna per monitor) diteruskan **apa adanya** dari payload Kuma tanpa dinormalisasi — backend ini nggak mem-validasi bentuknya karena beda versi Kuma bisa beda struktur. Konsumen (frontend) baca kedua field ini secara defensif (`?.`, fallback ke nggak nampilin apa-apa kalau field yang diharapkan nggak ada), bukan mengasumsikan bentuknya pasti sama.

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
    { "id": 1, "kumaMonitorId": 4, "monitorLabel": "01-palangka-raya", "startedAt": "2026-08-14T10:00:00.000Z", "endedAt": "2026-08-14T10:05:00.000Z", "message": "Connection timeout", "note": "Kabel fiber putus, sudah diperbaiki teknisi." },
  ],
  "lastIncident": { /* insiden paling baru yang PERNAH tercatat (aktif atau selesai), bentuknya sama kayak isi `incidents`, atau null kalau belum pernah ada insiden sama sekali. Dipisah dari `incidents` (yang cuma 15 terbaru) biar selalu ada walau daftar itu kepotong -- dipakai buat banner "insiden terakhir X hari lalu" pas nggak ada yang aktif */ }
}
```

`message` diisi otomatis dari Kuma (pesan error mentah, mis. "Timeout") pas insiden kedeteksi. `note` beda -- kosong (`null`) sampai admin isi manual lewat `/admin` (endpoint di atas), buat keterangan/root cause yang lebih manusiawi ketimbang pesan error teknis.

Grup `id: null` (tanpa nama) selalu muncul pertama kalau ada monitor yang belum di-assign — frontend nge-render itu tanpa header sama sekali. Kelola grup lewat endpoint `/api/status-pages/:slug/groups*` di tabel di atas.

## Riwayat insiden (deteksi otomatis, catatan manual opsional)

Backend sendiri yang mendeteksi transisi up↔down dari live heartbeat Kuma (lihat `src/kuma/incidentTracker.js`) dan mencatatnya ke tabel `incidents` di SQLite — kapan mulai/selesai insiden **bukan** sesuatu yang di-input manual lewat `/admin`. Tiap `statusPage` response otomatis membawa maks 15 insiden terbaru (`incidents`, sudah urut terbaru dulu) dari monitor-monitor yang ada di page itu; `endedAt: null` artinya insiden masih berlangsung. Yang bisa diisi manual cuma `note`-nya (lewat `PUT .../incidents/:incidentId`) — keterangan/root cause, opsional, nggak mempengaruhi deteksi/waktu insidennya sama sekali.

Batasan yang perlu diketahui: state "status terakhir yang diobservasi" cuma disimpan di memory (bukan di database), jadi kalau backend di-restart pas ada monitor yang lagi down, transisi down→up berikutnya buat monitor itu tidak akan tercatat sebagai insiden yang "ditutup" (karena tracker menganggap itu observasi pertama, bukan pemulihan) — insiden historis yang sudah tercatat sebelum restart tetap aman, cuma satu insiden yang kebetulan lagi berlangsung pas restart itu yang datanya tidak lengkap.

## WebSocket (`/ws`)

Setelah connect, server kirim `{ type: "snapshot", kumaStatus, monitors }` sekali di awal, lalu tiap ada perubahan dari Kuma:

- `{ type: "monitor-update", reason, monitor }` — satu monitor berubah (heartbeat baru, uptime update, dll)
- `{ type: "kuma-status", status }` — koneksi/login ke Kuma berubah (connected/loggedIn/error)

## Catatan penting

- Kredensial di `KUMA_USERNAME`/`KUMA_PASSWORD` dipakai backend untuk login ke Kuma seperti dashboard biasa — jangan commit `.env` ke git (`.gitignore` sudah menghandle ini).
- Uptime Kuma tidak mendukung API key untuk login Socket.IO (API key Kuma hanya berlaku untuk endpoint `/metrics` Prometheus), jadi username/password tetap diperlukan untuk metode ini.
- Nama-nama event Socket.IO (`monitorList`, `heartbeat`, `heartbeatList`, `uptime`, dst) mengikuti perilaku Uptime Kuma versi umum saat ini. Kalau ada event yang tidak sesuai dengan versi Kuma kamu, cek console log backend — semua event yang diterima dari socket akan terlihat prosesnya di `src/kuma/kumaClient.js`.
