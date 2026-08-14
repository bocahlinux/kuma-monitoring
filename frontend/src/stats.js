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
