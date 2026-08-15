export const UPTIME_PERIOD_KEY = import.meta.env.VITE_UPTIME_PERIOD_KEY || '24';

export function getUptimeFraction(uptime) {
  if (!uptime) return null;
  if (UPTIME_PERIOD_KEY in uptime) return uptime[UPTIME_PERIOD_KEY];
  const keys = Object.keys(uptime);
  return keys.length ? uptime[keys[0]] : null;
}

// Kuma ngirim uptime sebagai pecahan 0..1, bukan 0..100.
export function formatPercent(fraction) {
  const percent = Math.round(fraction * 100 * 100) / 100;
  return `${percent}%`;
}

export function formatMeta(fraction, ping) {
  const parts = [];
  if (fraction != null) parts.push(formatPercent(fraction));
  if (typeof ping === 'number') parts.push(`${Math.round(ping)}ms`);
  return parts.join(' · ');
}
