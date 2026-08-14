import { io } from 'socket.io-client';
import { EventEmitter } from 'node:events';

// Status heartbeat dari Uptime Kuma: 0 = DOWN, 1 = UP, 2 = PENDING, 3 = MAINTENANCE
export const HEARTBEAT_STATUS = {
  0: 'down',
  1: 'up',
  2: 'pending',
  3: 'maintenance',
};

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

    // Live state di-cache di memory, sumber kebenarannya tetap Kuma.
    // Cuma nyimpen heartbeat TERAKHIR per monitor (bukan history), supaya footprint
    // memory tetap datar walau backend jalan berhari-hari -- penting di VPS RAM kecil.
    this.monitors = new Map(); // id(string) -> monitor config dari Kuma
    this.heartbeats = new Map(); // id(number) -> heartbeat terakhir
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
      this.heartbeats.set(hb.monitorID, hb);
      this.emit('update', { type: 'heartbeat', monitorId: hb.monitorID });
    });

    this.socket.on('heartbeatList', (monitorID, data) => {
      const list = Array.isArray(data) ? data : [];
      if (list.length) {
        this.heartbeats.set(monitorID, list[list.length - 1]);
      }
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

    this.socket.emit(
      'login',
      { username: this.username, password: this.password, token: '' },
      (res) => {
        if (res && res.ok) {
          this.loggedIn = true;
          this.lastError = null;
          console.log('[kuma] login berhasil');
        } else {
          this.loggedIn = false;
          this.lastError = (res && res.msg) || 'login gagal';
          console.error('[kuma] login gagal:', this.lastError);
        }
        this._emitStatus();
      }
    );
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
    const hb = this.heartbeats.get(idNum);
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
    };
  }
}

export default KumaClient;
