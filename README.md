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
3. **Backend tidak dapat Public Hostname sama sekali** — nginx di container `frontend` yang reverse-proxy `GET /api/status-pages/:slug` ke `kuma-status-backend:4000` lewat docker network internal (lihat `frontend/nginx.conf`). Endpoint admin backend (kelola status page, `GET /api/monitors` mentah) jadi otomatis tidak bisa diakses dari internet sama sekali, cuma dari dalam VPS.

Kalau suatu saat butuh akses langsung tanpa tunnel (misal debug), tambahkan `ports: ["<ip-vps>:<port>:<port>"]` di service terkait pada `docker-compose.yml`.

### Menjalankan perintah admin backend (curl) setelah backend tidak diekspos

Karena backend nggak lagi punya domain publik, jalankan curl admin (`POST`/`PUT`/`DELETE /api/status-pages/*`, `GET /api/monitors`) **dari dalam VPS**, lewat `docker exec`:

```bash
docker exec kuma-status-backend wget -qO- --header="x-api-key: <API_KEY>" http://localhost:4000/api/monitors
```

Atau untuk request `POST`/body JSON, pakai `curl` (kalau image-nya belum ada `curl`, `wget` bawaan Node base image bisa dipakai dengan `--post-data`):

```bash
docker exec kuma-status-backend wget -qO- --header="x-api-key: <API_KEY>" --header="Content-Type: application/json" \
  --post-data '{"kumaMonitorId": 1, "customLabel": "01-palangka-raya", "sortOrder": 1}' \
  http://localhost:4000/api/status-pages/samsat/monitors
```

## Frontend (status page publik)

`frontend/` adalah React (Vite) yang consume `GET /api/status-pages/:slug` (endpoint publik, tanpa API key, di-proxy nginx ke backend) dan polling berkala. Konfigurasinya (`FRONTEND_API_BASE_URL`, `FRONTEND_STATUS_PAGE_SLUG`, dst di `.env`) **di-bake ke file statis saat build**, bukan dibaca saat runtime — jadi tiap ganti nilainya wajib rebuild:

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
