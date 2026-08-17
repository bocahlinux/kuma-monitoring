# frontend

React (Vite) berisi tiga halaman:

- **`/`** — halaman gabungan, tiap status page yang ditandai "tampil di halaman utama" (toggle di `/admin`) muncul sebagai satu kategori/section. Consume `GET /api/home`.
- **`/<slug>`** — status page publik untuk satu status page saja (misal `/samsat`, `/vpn`), buat kalau mau share link satu kategori tanpa yang lain. Consume `GET /api/status-pages/:slug`. Tetap bisa diakses walau toggle "tampil di halaman utama"-nya nonaktif.
- **`/admin`** — kelola status page (buat/hapus, toggle tampil di `/` atau tidak, atur monitor mana yang ditampilkan, label, urutan) lewat UI, tanpa perlu `curl` manual. Login pakai username + password (akun tersimpan di database backend, bisa tambah/edit/hapus user lewat menu "Kelola User"). Tiap status page di list-nya ada link langsung ke halaman publiknya (`/<slug>`).

Di dalam **satu** status page, monitor bisa dikelompokkan lagi pakai **Groups** (persis fitur Groups di status page bawaan Kuma) — bikin grup bernama (misal "VPN", "SAMSAT") lewat editor di `/admin`, lalu assign tiap monitor ke grup yang sesuai. Monitor yang belum di-assign tampil di atas tanpa header grup. Jadi ada dua level pengelompokan: status page (jadi kategori di `/`) → Group di dalamnya (jadi sub-header).

Kedua endpoint publik (`/api/home`, `/api/status-pages/:slug`) sengaja tanpa API key karena memang dimaksudkan buat dilihat publik. Satu deployment frontend melayani **semua** status page yang ada — bikin status page baru di `/admin` langsung bisa diakses, nggak perlu rebuild.

## Struktur

- `src/api.js` — fetch ke backend (status page publik)
- `src/App.jsx` — halaman `/<slug>`: state, polling, satu kategori
- `src/HomePage.jsx` — halaman `/`: fetch `/api/home`, render tiap status page sebagai section kategori
- `src/stats.js` — hitung jumlah terhubung/terputus/total, rata-rata uptime (dipakai buat headline kartu ringkasan MAUPUN rollup per-grup di `GroupSection`), dan tren response time gabungan (`buildPingTrend`, dari heartbeat yang sudah ke-fetch, bukan endpoint baru), dari daftar monitor
- `src/monitorFormat.js` — format uptime%/response time per monitor + `UPTIME_PERIOD_KEY` (dipakai `MonitorRow`, `HostDiagram`, dan rollup grup, satu sumber biar formatnya/periode-nya konsisten)
- `src/incidentFormat.js` — format waktu/durasi insiden (`formatIncidentTiming`, dipakai `IncidentsList` dan admin) + `formatRelativeTime` ("3 hari lalu", dipakai banner "Semua Sistem Normal")
- `src/certFormat.js` — `getCertWarning(cert)` baca field sertifikat TLS DEFENSIF (beberapa kemungkinan nama field, lihat README backend soal `cert` yang diteruskan apa adanya dari Kuma) dan cuma balikin non-null kalau ≤14 hari lagi (biar nggak berisik nampilin "N hari lagi" buat semua monitor HTTPS yang masih sehat) — dipakai `MonitorRow` dan `HostDiagram`
- `src/tagFormat.js` — baca field tag Kuma (`tags[]`) defensif juga (`tagLabel`/`tagColor`/`tagKey`) — dipakai `MonitorRow`, maks 2 tag ditampilkan biar nggak menuh-menuhin baris
- `src/components/StatRow.jsx` — kartu ringkasan (Terhubung/Terputus/Total monitor pakai ikon bulat warna; Uptime jangka panjang pakai `UptimeRing` gauge — satu-satunya tile yang gauge, karena cuma itu yang persentase/bounded), dipakai `App` maupun `HomePage`
- `src/components/UptimeRing.jsx` — gauge lingkaran SVG buat persentase uptime
- `src/components/ActiveIncidentBanner.jsx` — kotak menonjol di atas stat-row, dua varian: kalau ada insiden yang masih berlangsung (`endedAt: null`, difilter dari data `incidents` yang sudah ada, nggak fetch tambahan) tampil peringatan (tinted merah); kalau nggak ada, tetap tampil versi POSITIF "Semua Sistem Normal" (tinted hijau) + "insiden terakhir X lalu" dari field `lastIncident` (insiden paling baru yang PERNAH tercatat, terpisah dari `incidents` yang cuma 15 terbaru — lihat README backend), atau "belum pernah ada insiden" kalau `lastIncident` null. Jadi section ini selalu render, nggak pernah kosong total
- `src/components/MaintenanceBanner.jsx` — kotak netral (bukan merah/hijau, lihat `.active-incident--maintenance`) kalau ada monitor berstatus `maintenance` (Kuma status 3, biasa dari jadwal Maintenance di Kuma) -- beda dari `ActiveIncidentBanner` yang buat gangguan nggak terduga, ini status TERENCANA. Nggak render apa-apa kalau nggak ada
- `src/components/PerformanceChart.jsx` — sparkline SVG sederhana (bukan library), tren response time rata-rata gabungan semua monitor. Hover/pointer-move nampilin crosshair + tooltip (ms + "N pengecekan lalu" — bukan jam beneran, karena titik-titiknya dirata-rata per posisi "seberapa lama yang lalu", bukan waktu asli, lihat komentar `buildPingTrend`)
- `src/components/GroupSection.jsx` — satu Group (header + daftar monitornya), dipakai `App` maupun `HomePage`; tanpa header kalau grup-nya `null` (monitor belum di-assign). Headernya (kalau ada nama grup) juga nampilin rollup rata-rata uptime gabungan seisi grup di `.group__uptime`, cuma kalau anggotanya lebih dari satu. Kalau salah satu monitornya `isPrimary` (host, misal server Proxmox utama) dan jumlah anggota lain ≤ 12 (`MAX_DIAGRAM_CHILDREN`), dua tampilan sekaligus di-render (list bersarang + `HostDiagram`) dan CSS media query (`.group__list-view` / `.group__diagram-view`, breakpoint 640px) yang milih mana yang kelihatan — list di HP, diagram kotak-garis di layar lebar. Lewat dari batas itu atau nggak ada host, tetap list biasa di semua ukuran layar.
- `src/components/HostDiagram.jsx` — diagram kotak-garis: host di atas, anak-anaknya di bawah dengan garis penghubung siku ala org-chart (drop dari host → bus horizontal → drop ke tiap anak, BUKAN garis lurus langsung host→anak — garis lurus sempat dicoba tapi begitu anaknya banyak & sebaris, garis ke anak yang jauh jadi hampir mendatar dan "menembus" kotak-kotak lain yang dilewatinya di tengah jalan, ketutup kotak yang opaque, keliatan zigzag berantakan; bus di jalur kosong antar baris nggak pernah numpuk kotak manapun). Tiap kotak nampilin dot status + nama + baris kedua uptime%/response time (pakai `monitorFormat.js`, format sama kayak `MonitorRow`) + baris ketiga OPSIONAL warning SSL kalau mendekati kadaluarsa (`certFormat.js`), biar diagramnya sendiri sudah informatif tanpa perlu balik lihat list. `.diagram__children` sengaja `align-items: flex-start` (bukan default `stretch`) biar kotak yang punya baris ketiga (lebih tinggi) nggak maksa kotak lain di baris yang sama ikut melar. Semua titik garis (drop host, bus, drop tiap anak) diukur dari posisi asli tiap kotak setelah dirender (`getBoundingClientRect`, di-update ulang tiap `resize`, `scroll`, maupun tiap kali TEKS di salah satu kotak berubah panjangnya — lihat `layoutKey`, karena lebar kotak berubah kalau mis. ping-nya lompat dari 3 digit ke 5 digit pas polling, dan itu HARUS memicu ukur ulang, bukan cuma jumlah anaknya berubah) — bukan ditebak lewat CSS `left:50%`, jadi tetap presisi berapa pun jumlah anaknya dan walau lebar kotak beda-beda (nama panjang = kotak lebih lebar). SVG-nya juga dikasih `viewBox` eksplisit senilai ukuran container yang sama-sama dipakai buat hitung koordinat itu, biar unit internalnya nggak ambigu (kelihatan kalau dilewatkan, khususnya di mode TV yang pakai CSS `zoom` — lihat bagian TV/NOC di bawah). Anak-anaknya sengaja satu baris (`flex-wrap: nowrap` + scroll horizontal kalau kepanjangan, bukan wrap ke baris baru). Garisnya di-animasi "mengalir" (`stroke-dashoffset` + `@keyframes`), dihormati `prefers-reduced-motion`
- `src/components/MonitorRow.jsx` — satu baris monitor: dot status + nama + [maks 2 tag pill, `tagFormat.js`] + [badge warning SSL kalau ada, `certFormat.js`] + bar heartbeat + kolom persentase uptime/response time rata kanan di ujung. Kalau `monitor.isPrimary`, baris ini tampil lebih besar/tebal + badge "HOST" + aksen warna di sisi kiri
- `src/components/HeartbeatBar.jsx` — bar heartbeat di tengah baris; kalau nggak muat, cell tertua terpotong rapi di sisi kiri (bukan bikin baris meluber)
- `src/components/IncidentsList.jsx` — daftar insiden terbaru (waktu mulai/selesai deteksi otomatis oleh backend, `note`-nya opsional diisi manual admin — lihat README backend); nggak render apa-apa kalau belum pernah ada insiden
- `src/components/ThemeToggle.jsx` — tombol toggle mode terang/gelap, disimpan ke `localStorage` per device
- `src/theme.js` — baca/tulis preferensi tema; anti-kedipan tema salah ditangani inline script blocking di `index.html` (jalan sebelum CSS ke-parse)
- `src/statusMeta.js` — ikon + label Indonesia per status (`up`/`down`/`pending`/`maintenance`/`unknown`), satu sumber dipakai halaman publik & admin
- `src/admin/adminApi.js` — fetch ke endpoint admin backend dengan `credentials: 'include'` (cookie sesi httpOnly, bukan header custom yang disimpan di JS)
- `src/admin/AdminApp.jsx` — orchestrator halaman admin (cek sesi via `GET /api/auth/me` → login → list status page/editor/kelola user)
- `src/admin/components/` — `Login` (username+password), `StatusPageList`, `StatusPageEditor` (detail/slug, Groups, Monitor, dan Insiden — bagian terakhir ini cuma buat isi/ubah `note` per insiden, bukan buat bikin insiden manual; waktu mulai/selesainya tetap otomatis dari backend), `UserList` (tambah/ganti password/hapus akun admin)
- `src/main.jsx` — routing sederhana berbasis `window.location.pathname` (kosong = `HomePage`, `admin` = `AdminApp`, selain itu = `App` dengan slug dari segmen pertama URL), tanpa react-router

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
| `VITE_HOME_TITLE` | Judul halaman `/` (halaman gabungan kategori). Juga dipakai buat `<title>`/`og:title`/`og:description` di `index.html`, dan `document.title` per halaman `/<slug>` diganti otomatis ke judul status page-nya. |
| `VITE_HOME_DESCRIPTION` | Meta description / `og:description` — muncul di preview link waktu di-share (WhatsApp/Telegram/dll) |
| `VITE_POLL_INTERVAL_MS` | Interval polling, default 20000 (20 detik) |
| `VITE_UPTIME_PERIOD_KEY` | Key periode uptime yang dipakai sebagai badge persentase per monitor (default `"24"`) — cek response backend buat lihat key apa saja yang tersedia |
| `VITE_HEADLINE_PERIOD_KEY` / `VITE_HEADLINE_PERIOD_LABEL` | Key + label periode buat tile "Uptime" di kartu ringkasan (rata-rata semua monitor), default `"720"` (30 hari) |

## Build & Docker

```bash
npm run build   # -> dist/
```

`Dockerfile` di sini multi-stage: build dengan Node, lalu di-serve pakai nginx (`nginx.conf`, SPA fallback ke `index.html`, plus reverse-proxy `/api/` ke backend). Deploy production diatur lewat `docker-compose.yml` di root repo — lihat [README di root](../README.md#frontend-status-page-publik).

## Mode TV/NOC (layar ≥1600px)

Dipakai buat monitor 32"+ yang dipasang di dinding/kantor, dilihat dari jarak beberapa meter, bukan dari meja. `App.css` punya breakpoint `@media (min-width: 1600px)` yang: (1) melebarkan `.page` dan pakai CSS `zoom` (bukan cuma naikin `font-size`) biar teks, padding, dan gap ikut membesar proporsional sekaligus — kalau cuma teksnya yang dibesarkan, spacing-nya jadi keliatan dempet; (2) grup (`.page__groups`, wrapper baru di `App.jsx`/`HomePage.jsx`) disusun jadi beberapa kolom lewat CSS grid `auto-fit`, bukan ditumpuk vertikal terus — biar lebih banyak muat dalam satu layar tanpa perlu scroll (TV nggak ada mouse/remote buat itu); grup yang punya `HostDiagram` sengaja dikecualikan dari pembagian kolom (`grid-column: 1 / -1`, pakai selector `:has()`) biar dapat lebar penuh, ngurangin kemungkinan diagramnya perlu scroll horizontal. Ada tingkat kedua di `≥2400px` (zoom lebih besar lagi) buat panel 4K.

## Keamanan halaman `/admin`

Login `/admin` pakai username + password sungguhan: akun disimpan di tabel `users` (password di-hash `bcrypt`) pada database backend, dan sesi login pakai cookie `httpOnly` (bukan disimpan/dibaca lewat JS) yang dicocokkan ke tabel `sessions`. Admin bisa tambah/ganti password/hapus user lain lewat menu "Kelola User" — tidak ada lagi satu shared secret buat semua orang. Backend juga masih menerima header `x-api-key` (kalau `API_KEY` diisi di `.env`) sebagai jalur alternatif buat script/integrasi, berdampingan dengan login cookie ini. Detail implementasi ada di `kuma-status-backend/src/middleware/sessionAuth.js`, `src/routes/auth.js`, dan `src/routes/users.js`.
