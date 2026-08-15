export function createIncidentsRepo(db) {
  return {
    // Dipanggil pas monitor pindah dari up -> down.
    openIncident(kumaMonitorId, startedAt, message) {
      db.prepare(
        'INSERT INTO incidents (kuma_monitor_id, started_at, message) VALUES (?, ?, ?)'
      ).run(kumaMonitorId, startedAt, message || null);
    },

    // Dipanggil pas monitor pindah dari down -> up -- nutup insiden yang masih terbuka
    // (ended_at IS NULL) buat monitor itu. Kalau nggak ada yang terbuka (misal backend
    // baru start di tengah downtime), nggak ngapa-ngapain -- nggak ada insiden buat ditutup.
    // Nggak pakai ORDER BY/LIMIT (SQLite standar nggak dukung itu di UPDATE) -- harusnya
    // memang cuma ada 0 atau 1 baris yang masih terbuka per monitor karena open/close
    // selalu berpasangan di incidentTracker.
    closeOpenIncident(kumaMonitorId, endedAt) {
      db.prepare('UPDATE incidents SET ended_at = ? WHERE kuma_monitor_id = ? AND ended_at IS NULL').run(
        endedAt,
        kumaMonitorId
      );
    },

    hasOpenIncident(kumaMonitorId) {
      const row = db
        .prepare('SELECT id FROM incidents WHERE kuma_monitor_id = ? AND ended_at IS NULL LIMIT 1')
        .get(kumaMonitorId);
      return !!row;
    },

    listRecentForMonitors(monitorIds, limit = 15) {
      if (!monitorIds.length) return [];
      const placeholders = monitorIds.map(() => '?').join(',');
      return db
        .prepare(
          `SELECT * FROM incidents
           WHERE kuma_monitor_id IN (${placeholders})
           ORDER BY started_at DESC
           LIMIT ?`
        )
        .all(...monitorIds, limit);
    },

    // Insiden terakhir yang PERNAH tercatat buat sekumpulan monitor (aktif atau sudah
    // selesai) -- dipakai buat nampilin "insiden terakhir X hari lalu" pas nggak ada
    // insiden aktif, biar halaman publik tetap kasih konteks riwayat.
    getLastForMonitors(monitorIds) {
      if (!monitorIds.length) return null;
      const placeholders = monitorIds.map(() => '?').join(',');
      return (
        db
          .prepare(
            `SELECT * FROM incidents
             WHERE kuma_monitor_id IN (${placeholders})
             ORDER BY started_at DESC
             LIMIT 1`
          )
          .get(...monitorIds) || null
      );
    },

    getById(id) {
      return db.prepare('SELECT * FROM incidents WHERE id = ?').get(id) || null;
    },

    // Catatan manual dari admin (root cause dll), beda dari `message` otomatis Kuma.
    updateNote(id, note) {
      const result = db.prepare('UPDATE incidents SET note = ? WHERE id = ?').run(note || null, id);
      return result.changes > 0;
    },
  };
}
