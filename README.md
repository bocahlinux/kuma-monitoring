# kuma-monitoring

Satu stack Docker Compose berisi Uptime Kuma, MariaDB, Cloudflare Tunnel, dan backend perantara (`kuma-status-backend`) yang mengekspos data monitor Kuma sebagai REST API + WebSocket untuk frontend status page custom.

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
nano .env   # isi TZ, KUMA_USERNAME/PASSWORD, MYSQL_*, CLOUDFLARE_TUNNEL_TOKEN, dst

docker compose up -d --build
docker compose logs -f kuma-status-backend   # pastikan muncul "login berhasil"
```

Semua data persisten (database Kuma, MariaDB, SQLite custom status page) tersimpan di `./data/` — cukup backup folder ini kalau perlu migrasi/restore.

## Akses dari luar (Cloudflare Tunnel)

`kuma-status-backend` dan `frontend` sengaja **tidak** publish port ke host (`ports:` dikosongkan) — cuma bisa diakses dari dalam `monitoring-network`. Hanya **satu** Public Hostname yang dibutuhkan, mengarah ke `frontend`:

1. Buka **Cloudflare Zero Trust dashboard → Networks → Tunnels**, pilih tunnel yang dipakai `monitoring-cloudflared`.
2. Public Hostname domain kamu (misal `kuma-status.domainkamu.com`) arahkan ke `http://kuma-status-frontend:80`. Kalau sebelumnya domain ini sempat diarahkan ke `kuma-status-backend:4000`, **ubah Service-nya** ke `kuma-status-frontend:80`.
3. **Backend tidak dapat Public Hostname sendiri** — nginx di container `frontend` yang reverse-proxy semua `/api/*` ke `kuma-status-backend:4000` lewat docker network internal (lihat `frontend/nginx.conf`). Proteksinya tetap ada di backend: `GET /api/status-pages/:slug` publik (dipakai halaman `/`), endpoint lainnya (kelola status page, `GET /api/monitors` mentah, dipakai halaman `/admin`) wajib header `x-api-key` — salah/tanpa key otomatis dapat `401` dari backend, siapa pun yang tahu URL-nya tetap nggak bisa ngapa-ngapain tanpa API key yang benar.

Kalau suatu saat butuh akses backend langsung tanpa lewat frontend (misal debug), backend juga sudah di-bind ke IP Tailscale di `docker-compose.yml` (`100.83.41.88:4000`) — lihat service `kuma-status-backend`.

## Frontend (status page publik + admin)

`frontend/` adalah React (Vite) dengan dua halaman:

- **`/<slug>`** — status page publik untuk status page itu (misal `/samsat`, `/vpn`), consume `GET /api/status-pages/:slug` (tanpa API key, di-proxy nginx ke backend) lewat polling berkala. `/` (tanpa slug) menampilkan status page default (`FRONTEND_STATUS_PAGE_SLUG`). Satu deployment melayani semua status page yang ada — bikin status page baru di `/admin` langsung bisa diakses lewat `/<slug>`-nya, tanpa rebuild.
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
