export function computeStats(monitors) {
  let up = 0;
  let down = 0;
  for (const m of monitors) {
    if (m.live.statusLabel === 'up') up += 1;
    else if (m.live.statusLabel === 'down') down += 1;
  }
  return { up, down, total: monitors.length };
}

// Rata-rata uptime (persen) semua monitor buat satu periode Kuma (mis. "720" = 30
// hari). null kalau nggak ada satupun monitor yang punya data periode itu.
export function computeUptimeSummary(monitors, periodKey) {
  const values = monitors
    .map((m) => m.live?.uptime?.[periodKey])
    .filter((v) => typeof v === 'number');
  if (!values.length) return null;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.round(avg * 10000) / 100;
}

// Tren response time gabungan -- dirata-ratakan PER POSISI "seberapa lama yang lalu"
// (bukan jam beneran, karena tiap monitor check-nya nggak sinkron), dari heartbeat yang
// sudah kepakai buat bar chart (nggak fetch data baru). Diurut lama -> baru.
export function buildPingTrend(monitors, maxPoints = 30) {
  const series = monitors.map((m) => (m.live?.heartbeats || []).filter((h) => typeof h.ping === 'number'));
  const longest = Math.max(0, ...series.map((s) => s.length));
  const n = Math.min(longest, maxPoints);
  if (!n) return [];

  const points = [];
  for (let offsetFromEnd = n; offsetFromEnd >= 1; offsetFromEnd--) {
    const values = series
      .map((s) => s[s.length - offsetFromEnd])
      .filter((h) => h && typeof h.ping === 'number')
      .map((h) => h.ping);
    if (values.length) {
      points.push(values.reduce((a, b) => a + b, 0) / values.length);
    }
  }
  return points;
}
