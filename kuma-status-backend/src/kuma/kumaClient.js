import { io } from 'socket.io-client';
import { EventEmitter } from 'node:events';

// Status heartbeat dari Uptime Kuma: 0 = DOWN, 1 = UP, 2 = PENDING, 3 = MAINTENANCE
export const HEARTBEAT_STATUS = {
  0: 'down',
  1: 'up',
  2: 'pending',
  3: 'maintenance',
};

// Jumlah heartbeat terakhir yang disimpan per monitor (buat bar chart di frontend,
// mirip status page bawaan Kuma). Dibatasi supaya memory tetap datar walau backend
// jalan berhari-hari -- lihat catatan di constructor.
const MAX_HEARTBEAT_HISTORY = 50;

class KumaClient extends EventEmitter {
  constructor({ baseUrl, username, password }) {
    super();
    this.baseUrl = baseUrl;
    this.username = username;
    this.password = password;

    this.socket = null;
    this.connected = false;
    this.loggedIn = false;
    this.lastError = null;
    this.loginRetryTimer = null;

    // Live state di-cache di memory, sumber kebenarannya tetap Kuma.
    // heartbeatHistory dibatasi MAX_HEARTBEAT_HISTORY per monitor (bukan tak terbatas),
    // supaya footprint memory tetap kecil & terprediksi walau backend jalan berhari-hari.
    this.monitors = new Map(); // id(string) -> monitor config dari Kuma
    this.heartbeatHistory = new Map(); // id(number) -> array heartbeat terbaru (maks MAX_HEARTBEAT_HISTORY)
    this.uptime = new Map(); // id(number) -> { [periodKey]: percent }
    this.avgPing = new Map(); // id(number) -> number
    this.certInfo = new Map(); // id(number) -> info sertifikat (monitor https)
  }

  connect() {
    this.socket = io(this.baseUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
    });

    this.socket.on('connect', () => {
      this.connected = true;
      this.lastError = null;
      console.log(`[kuma] terhubung ke ${this.baseUrl}, mencoba login...`);
      this._login();
    });

    this.socket.on('disconnect', (reason) => {
      this.connected = false;
      this.loggedIn = false;
      clearTimeout(this.loginRetryTimer);
      console.warn('[kuma] terputus:', reason);
      this._emitStatus();
    });

    this.socket.on('connect_error', (err) => {
      this.lastError = err.message;
      console.error('[kuma] gagal konek:', err.message);
      this._emitStatus();
    });

    this.socket.on('monitorList', (list) => {
      this.monitors = new Map(Object.entries(list || {}));
      this.emit('update', { type: 'monitorList' });
    });

    this.socket.on('heartbeat', (hb) => {
      if (!hb) return;
      const history = this.heartbeatHistory.get(hb.monitorID) || [];
      history.push(hb);
      if (history.length > MAX_HEARTBEAT_HISTORY) {
        history.splice(0, history.length - MAX_HEARTBEAT_HISTORY);
      }
      this.heartbeatHistory.set(hb.monitorID, history);
      this.emit('update', { type: 'heartbeat', monitorId: hb.monitorID });
    });

    this.socket.on('heartbeatList', (monitorID, data, overwrite) => {
      // Awalnya kode ini CUMA nerima kalau overwrite=true (asumsi: itu satu-satunya
      // sync awal yang beneran, sisanya pagination yang nggak pernah kita minta).
      // Ternyata asumsi itu bikin history kepotong -- Kuma kadang ngirim sync awal
      // dalam beberapa event dengan overwrite=false juga. Sekarang overwrite=false
      // di-APPEND (bukan diabaikan), tetap di-cap MAX_HEARTBEAT_HISTORY jadi nggak
      // mungkin tumbuh tak terbatas walau ternyata itu beneran event pagination.
      const incoming = Array.isArray(data) ? data : [];
      const existing = this.heartbeatHistory.get(monitorID) || [];
      const merged = overwrite ? incoming : [...existing, ...incoming];
      this.heartbeatHistory.set(monitorID, merged.slice(-MAX_HEARTBEAT_HISTORY));
      this.emit('update', { type: 'heartbeatList', monitorId: monitorID });
    });

    this.socket.on('importantHeartbeatList', (monitorID, data) => {
      this.emit('update', { type: 'importantHeartbeatList', monitorId: monitorID, data });
    });

    this.socket.on('uptime', (monitorID, type, percent) => {
      const current = this.uptime.get(monitorID) || {};
      current[type] = percent;
      this.uptime.set(monitorID, current);
      this.emit('update', { type: 'uptime', monitorId: monitorID });
    });

    this.socket.on('avgPing', (monitorID, avgPing) => {
      this.avgPing.set(monitorID, avgPing);
      this.emit('update', { type: 'avgPing', monitorId: monitorID });
    });

    this.socket.on('certInfo', (monitorID, info) => {
      this.certInfo.set(monitorID, info);
      this.emit('update', { type: 'certInfo', monitorId: monitorID });
    });
  }

  _login() {
    if (!this.username || !this.password) {
      this.lastError = 'KUMA_USERNAME/KUMA_PASSWORD belum diisi';
      console.error(`[kuma] ${this.lastError}`);
      this._emitStatus();
      return;
    }

    // .timeout() penting -- tanpa ini, kalau Kuma nggak pernah balas ack request login
    // (bukan ditolak, cuma diem aja -- pernah kejadian tanpa error jelas), callback di
    // bawah nggak akan pernah jalan dan kita nyangkut selamanya di "connected tapi
    // belum loggedIn" sampai koneksi websocket-nya sendiri putus-nyambung ulang.
    this.socket.timeout(15000).emit(
      'login',
      { username: this.username, password: this.password, token: '' },
      (err, res) => {
        if (err) {
          this.loggedIn = false;
          this.lastError = 'login timeout (Kuma tidak merespons), mencoba lagi';
          console.error(`[kuma] ${this.lastError}`);
          this._emitStatus();
          this._scheduleLoginRetry();
          return;
        }
        if (res && res.ok) {
          this.loggedIn = true;
          this.lastError = null;
          console.log('[kuma] login berhasil');
        } else {
          this.loggedIn = false;
          this.lastError = (res && res.msg) || 'login gagal';
          console.error('[kuma] login gagal:', this.lastError);
          this._scheduleLoginRetry();
        }
        this._emitStatus();
      }
    );
  }

  _scheduleLoginRetry() {
    clearTimeout(this.loginRetryTimer);
    this.loginRetryTimer = setTimeout(() => {
      if (this.connected && !this.loggedIn) this._login();
    }, 5000);
  }

  _emitStatus() {
    this.emit('status', {
      connected: this.connected,
      loggedIn: this.loggedIn,
      error: this.lastError,
    });
  }

  getStatus() {
    return { connected: this.connected, loggedIn: this.loggedIn, error: this.lastError };
  }

  getMonitorsSnapshot() {
    const result = [];
    for (const [id, monitor] of this.monitors.entries()) {
      result.push(this._composeMonitor(id, monitor));
    }
    return result;
  }

  getMonitorById(id) {
    const key = String(id);
    const monitor = this.monitors.get(key);
    if (!monitor) return null;
    return this._composeMonitor(key, monitor);
  }

  findMonitorsByHostname(hostname) {
    const needle = hostname.toLowerCase();
    return this.getMonitorsSnapshot().filter(
      (m) => m.hostname && m.hostname.toLowerCase().includes(needle)
    );
  }

  _composeMonitor(idString, monitor) {
    const idNum = Number(idString);
    const history = this.heartbeatHistory.get(idNum) || [];
    const hb = history.length ? history[history.length - 1] : null;
    return {
      id: idNum,
      name: monitor.name,
      hostname: monitor.hostname || monitor.url || null,
      type: monitor.type,
      active: !!monitor.active,
      status: hb ? hb.status : null,
      statusLabel: hb && hb.status in HEARTBEAT_STATUS ? HEARTBEAT_STATUS[hb.status] : 'unknown',
      message: hb ? hb.msg : null,
      ping: hb ? hb.ping : null,
      lastCheckedAt: hb ? hb.time : null,
      avgPing: this.avgPing.get(idNum) ?? null,
      uptime: this.uptime.get(idNum) || {},
      cert: this.certInfo.get(idNum) || null,
      // Fitur tag Kuma (kategori berwarna per monitor) -- diteruskan apa adanya dari
      // Kuma, bentuknya nggak kita normalisasi di sini. Konsumen (frontend) baca
      // defensif (name/color/value bisa kosong tergantung versi Kuma).
      tags: Array.isArray(monitor.tags) ? monitor.tags : [],
      // Buat bar chart di frontend, urut lama -> baru, maks MAX_HEARTBEAT_HISTORY item.
      heartbeats: history.map((h) => ({
        status: h.status,
        statusLabel: h.status in HEARTBEAT_STATUS ? HEARTBEAT_STATUS[h.status] : 'unknown',
        time: h.time,
        ping: h.ping,
        msg: h.msg,
      })),
    };
  }
}

export default KumaClient;
