// Simple state machine: setiap kali status live monitor berubah down<->up, catat
// jadi insiden di database. Baseline (observasi pertama tiap monitor, biasanya pas
// backend baru connect) sengaja TIDAK bikin insiden -- kita nggak tahu kapan
// sebenarnya monitor itu mulai down kalau backend baru aja nyala/reconnect di
// tengah downtime, jadi lebih baik nggak nebak-nebak daripada catat waktu yang salah.
//
// State ini di memory doang (reset kalau backend restart) -- insiden yang SUDAH
// tercatat di database tetap aman, cuma insiden yang lagi berlangsung PAS backend
// restart nggak bakal kedeteksi transisi awalnya (started_at hilang), tapi begitu dia
// pulih (down -> up) itu tetap dianggap "observasi pertama" jadi nggak nutup apa-apa
// juga -- nggak ada insiden nyasar "ditutup" tanpa pernah "dibuka".
export function createIncidentTracker(kumaClient, incidentsRepo) {
  const lastStatus = new Map(); // monitorId -> status code terakhir yang diobservasi

  kumaClient.on('update', ({ type, monitorId }) => {
    if (type !== 'heartbeat' && type !== 'heartbeatList') return;
    if (monitorId == null) return;

    const monitor = kumaClient.getMonitorById(monitorId);
    if (!monitor || monitor.status == null) return;

    const prev = lastStatus.get(monitorId);
    const current = monitor.status;

    if (prev === undefined) {
      lastStatus.set(monitorId, current);
      return;
    }

    if (prev !== current) {
      const now = new Date().toISOString();
      if (prev === 1 && current === 0) {
        incidentsRepo.openIncident(monitorId, now, monitor.message);
      } else if (prev === 0 && current === 1) {
        incidentsRepo.closeOpenIncident(monitorId, now);
      }
      lastStatus.set(monitorId, current);
    }
  });
}
