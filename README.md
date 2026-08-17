# kuma-monitoring

Satu stack Docker Compose berisi Uptime Kuma, MariaDB, dan backend perantara (`kuma-status-backend`) yang mengekspos data monitor Kuma sebagai REST API + WebSocket untuk frontend status page custom.

```
.
├── docker-compose.yml        # orkestrasi seluruh stack
├── .env.example               # template variabel untuk semua service
├── data/                      # (dibuat otomatis, di-gitignore) volume tiap service
│   ├── uptime-kuma/
│   ├── mariadb/
│   └── kuma-status-backend/
├── kuma-status-backend/       # source code backend perantara
└── frontend/                  # source code status page publik (React + Vite)
```

## Deploy ke VPS

Taruh repo ini di `/opt/kuma-monitoring` di VPS. `/opt` adalah konvensi standar Linux (FHS) untuk software/stack yang berdiri sendiri di luar package manager, tidak terikat ke home directory user tertentu — cocok untuk service yang dikelola via systemd/root/deploy user, dan tetap konsisten kalau nanti akun user berganti. Hindari `/home/<user>` supaya stack tidak "menempel" ke akun personal.

**Penting:** pastikan `git clone` diarahkan langsung ke `/opt/kuma-monitoring` (bukan `git clone <url>` tanpa target sambil `cd`-nya di `/opt`), supaya nama foldernya bukan hasil tebakan Git dari nama repo. `docker-compose.yml` di repo ini juga sudah mengunci `name: kuma-monitoring` di baris paling atas, jadi Compose selalu memakai nama project yang sama persis **apa pun nama folder tempat kamu menjalankannya** — kalau suatu saat repo ini ke-clone lagi di folder lain, Compose tidak akan bingung dan mencoba bikin container baru yang bentrok nama dengan yang sudah jalan.

```bash
sudo mkdir -p /opt/kuma-monitoring
sudo chown $USER:$USER /opt/kuma-monitoring
git clone https://github.com/bocahlinux/kuma-monitoring.git /opt/kuma-monitoring
cd /opt/kuma-monitoring

cp .env.example .env
nano .env   # isi TZ, KUMA_USERNAME/PASSWORD, MYSQL_*, ADMIN_USERNAME/PASSWORD, dst

docker compose up -d --build
docker compose logs -f kuma-status-backend   # pastikan muncul "login berhasil"
```

Semua data persisten (database Kuma, MariaDB, SQLite custom status page) tersimpan di `./data/` — cukup backup folder ini kalau perlu migrasi/restore.

## Akses dari luar

Stack ini **tidak** memakai Cloudflare Tunnel — `kuma-status-backend` dan `frontend` di-bind langsung ke IP Tailscale (`100.83.41.88`) di `docker-compose.yml` (port `4000` dan `80`), bukan publish ke semua interface. Akses dari luar VPS lewat IP Tailscale itu saja.

`frontend` (nginx) reverse-proxy semua `/api/*` ke `kuma-status-backend:4000` lewat docker network internal (lihat `frontend/nginx.conf`), jadi backend tidak perlu port terbuka sendiri untuk dipakai status page publik — port `4000` yang di-bind ke Tailscale IP itu cuma buat akses langsung/debug. Proteksinya tetap ada di backend: `GET /api/home` dan `GET /api/status-pages/:slug` publik (dipakai halaman `/` dan `/<slug>`), endpoint lainnya (kelola status page, `GET /api/monitors` mentah, dipakai halaman `/admin`) wajib login (cookie sesi) atau header `x-api-key` — salah/tanpa itu otomatis dapat `401` dari backend.

## Frontend (status page publik + admin)

`frontend/` adalah React (Vite) dengan tiga halaman (`/`, `/<slug>`, `/admin`) — detail lengkap termasuk fitur **Groups** (pengelompokan monitor di dalam satu status page, mirip Kuma) ada di [frontend/README.md](frontend/README.md).

Satu deployment melayani semua status page yang ada — bikin status page baru di `/admin` langsung bisa diakses lewat `/<slug>`-nya (dan otomatis ikut di `/` kalau toggle-nya nyala), tanpa rebuild.
- **`/admin`** — kelola status page (buat/hapus, atur monitor, label, urutan) lewat UI, login pakai `API_KEY` yang sama dengan backend. Detail keamanannya ada di [frontend/README.md](frontend/README.md#keamanan-halaman-admin).

Konfigurasi frontend (`FRONTEND_API_BASE_URL`, `FRONTEND_STATUS_PAGE_SLUG`, dst di `.env`) **di-bake ke file statis saat build**, bukan dibaca saat runtime — jadi tiap ganti nilainya wajib rebuild:

```bash
docker compose up -d --build frontend
```

Detail komponen & cara dev lokal ada di [frontend/README.md](frontend/README.md).

## Update / redeploy

```bash
cd /opt/kuma-monitoring
git pull
docker compose up -d --build
```

## Dokumentasi backend & API

Lihat [kuma-status-backend/README.md](kuma-status-backend/README.md) untuk daftar endpoint REST, format pesan WebSocket, dan cara menjalankan backend secara lokal (development, di luar Docker).
