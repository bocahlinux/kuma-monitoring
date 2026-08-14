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
└── kuma-status-backend/       # source code backend perantara
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

`kuma-status-backend` sengaja **tidak** publish port ke host (`ports:` dikosongkan) — hanya bisa diakses dari dalam `monitoring-network`, termasuk oleh container `monitoring-cloudflared` yang sudah ada. Supaya frontend bisa mengaksesnya dari internet:

1. Buka **Cloudflare Zero Trust dashboard → Networks → Tunnels**, pilih tunnel yang dipakai `monitoring-cloudflared`.
2. Tambahkan **Public Hostname** baru, misal `status-api.domainkamu.com`, dengan **Service** mengarah ke `http://kuma-status-backend:4000` (nama container + port internal, bukan IP).
3. Frontend fetch ke `https://status-api.domainkamu.com/api/...` dan connect WebSocket ke `wss://status-api.domainkamu.com/ws?apiKey=...`.

Kalau suatu saat butuh akses langsung tanpa tunnel (misal debug), tambahkan `ports: ["<ip-vps>:4000:4000"]` di service `kuma-status-backend` pada `docker-compose.yml`.

## Update / redeploy

```bash
cd /opt/kuma-monitoring
git pull
docker compose up -d --build kuma-status-backend
```

## Dokumentasi backend & API

Lihat [kuma-status-backend/README.md](kuma-status-backend/README.md) untuk daftar endpoint REST, format pesan WebSocket, dan cara menjalankan backend secara lokal (development, di luar Docker).
