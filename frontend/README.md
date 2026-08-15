# frontend

React (Vite) berisi tiga halaman:

- **`/`** — halaman gabungan, tiap status page yang ditandai "tampil di halaman utama" (toggle di `/admin`) muncul sebagai satu kategori/section. Consume `GET /api/home`.
- **`/<slug>`** — status page publik untuk satu status page saja (misal `/samsat`, `/vpn`), buat kalau mau share link satu kategori tanpa yang lain. Consume `GET /api/status-pages/:slug`. Tetap bisa diakses walau toggle "tampil di halaman utama"-nya nonaktif.
- **`/admin`** — kelola status page (buat/hapus, toggle tampil di `/` atau tidak, atur monitor mana yang ditampilkan, label, urutan) lewat UI, tanpa perlu `curl` manual. Login pakai `API_KEY` yang sama dengan backend. Tiap status page di list-nya ada link langsung ke halaman publiknya (`/<slug>`).

Di dalam **satu** status page, monitor bisa dikelompokkan lagi pakai **Groups** (persis fitur Groups di status page bawaan Kuma) — bikin grup bernama (misal "VPN", "SAMSAT") lewat editor di `/admin`, lalu assign tiap monitor ke grup yang sesuai. Monitor yang belum di-assign tampil di atas tanpa header grup. Jadi ada dua level pengelompokan: status page (jadi kategori di `/`) → Group di dalamnya (jadi sub-header).

Kedua endpoint publik (`/api/home`, `/api/status-pages/:slug`) sengaja tanpa API key karena memang dimaksudkan buat dilihat publik. Satu deployment frontend melayani **semua** status page yang ada — bikin status page baru di `/admin` langsung bisa diakses, nggak perlu rebuild.

## Struktur

- `src/api.js` — fetch ke backend (status page publik)
- `src/App.jsx` — halaman `/<slug>`: state, polling, satu kategori
- `src/HomePage.jsx` — halaman `/`: fetch `/api/home`, render tiap status page sebagai section kategori
- `src/stats.js` — hitung jumlah terhubung/terputus/total, rata-rata uptime jangka panjang, dan tren response time gabungan (`buildPingTrend`, dari heartbeat yang sudah ke-fetch, bukan endpoint baru), dari daftar monitor
- `src/components/StatRow.jsx` — kartu ringkasan (Terhubung/Terputus/Total monitor pakai ikon bulat warna; Uptime jangka panjang pakai `UptimeRing` gauge — satu-satunya tile yang gauge, karena cuma itu yang persentase/bounded), dipakai `App` maupun `HomePage`
- `src/components/UptimeRing.jsx` — gauge lingkaran SVG buat persentase uptime
- `src/components/ActiveIncidentBanner.jsx` — kotak menonjol di atas kalau ada insiden yang masih berlangsung (`endedAt: null`); difilter dari data `incidents` yang sudah ada, nggak fetch tambahan. Nggak render apa-apa kalau nggak ada yang aktif
- `src/components/PerformanceChart.jsx` — sparkline SVG sederhana (bukan library), tren response time rata-rata gabungan semua monitor
- `src/components/GroupSection.jsx` — satu Group (header + daftar monitornya), dipakai `App` maupun `HomePage`; tanpa header kalau grup-nya `null` (monitor belum di-assign). Kalau salah satu monitornya `isPrimary` (host, misal server Proxmox utama) dan jumlah anggota lain ≤ 6, dua tampilan sekaligus di-render (list bersarang + `HostDiagram`) dan CSS media query (`.group__list-view` / `.group__diagram-view`, breakpoint 640px) yang milih mana yang kelihatan — list di HP, diagram kotak-garis di layar lebar. Lewat dari 6 anggota atau nggak ada host, tetap list biasa di semua ukuran layar.
- `src/components/HostDiagram.jsx` — diagram kotak-garis: host di atas, anak-anaknya di bawah dengan garis penghubung. Garis digambar sebagai `<svg><line>` yang koordinatnya diukur dari posisi asli tiap kotak setelah dirender (`getBoundingClientRect`, di-update ulang tiap `resize`) — bukan ditebak lewat CSS `left:50%`, jadi tetap presisi lurus berapa pun jumlah anaknya dan walau lebar kotak beda-beda (nama panjang = kotak lebih lebar). Garisnya di-animasi "mengalir" (`stroke-dashoffset` + `@keyframes`), dihormati `prefers-reduced-motion`
- `src/components/MonitorRow.jsx` — satu baris monitor: dot status + nama + bar heartbeat + kolom persentase uptime/response time rata kanan di ujung. Kalau `monitor.isPrimary`, baris ini tampil lebih besar/tebal + badge "HOST" + aksen warna di sisi kiri
- `src/components/HeartbeatBar.jsx` — bar heartbeat di tengah baris; kalau nggak muat, cell tertua terpotong rapi di sisi kiri (bukan bikin baris meluber)
- `src/components/IncidentsList.jsx` — daftar insiden terbaru (deteksi otomatis oleh backend, lihat README backend); nggak render apa-apa kalau belum pernah ada insiden
- `src/components/ThemeToggle.jsx` — tombol toggle mode terang/gelap, disimpan ke `localStorage` per device
- `src/theme.js` — baca/tulis preferensi tema; anti-kedipan tema salah ditangani inline script blocking di `index.html` (jalan sebelum CSS ke-parse)
- `src/statusMeta.js` — ikon + label Indonesia per status (`up`/`down`/`pending`/`maintenance`/`unknown`), satu sumber dipakai halaman publik & admin
- `src/admin/adminApi.js` — fetch ke endpoint admin backend, kirim header `x-api-key` (disimpan di `sessionStorage`, hilang begitu tab ditutup)
- `src/admin/AdminApp.jsx` — orchestrator halaman admin (login → list status page → editor)
- `src/admin/components/` — `Login`, `StatusPageList`, `StatusPageEditor`
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

## Keamanan halaman `/admin`

`/admin` **tidak dilindungi login system beneran** — cuma modal "masukkan API key" yang disimpan di `sessionStorage` browser lalu dikirim sebagai header `x-api-key` ke tiap request. Proteksi sebenarnya ada di backend (Express middleware `apiKeyAuth`): tanpa key yang cocok, semua endpoint admin balas `401`. Siapa pun yang tahu URL `/admin` bisa membuka halamannya, tapi tidak bisa melakukan apa-apa tanpa API key yang benar. Ini cukup buat kebutuhan satu admin/tim kecil — kalau nanti butuh multi-user dengan hak akses berbeda, ini perlu diganti sistem auth yang lebih proper (bukan sekadar shared API key).
