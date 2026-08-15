import HeartbeatBar from './HeartbeatBar';
import { STATUS_LABEL_ID } from '../statusMeta';

const UPTIME_PERIOD_KEY = import.meta.env.VITE_UPTIME_PERIOD_KEY || '24';

function getUptimeFraction(uptime) {
  if (!uptime) return null;
  if (UPTIME_PERIOD_KEY in uptime) return uptime[UPTIME_PERIOD_KEY];
  const keys = Object.keys(uptime);
  return keys.length ? uptime[keys[0]] : null;
}

// Kuma ngirim uptime sebagai pecahan 0..1, bukan 0..100.
function formatPercent(fraction) {
  const percent = Math.round(fraction * 100 * 100) / 100;
  return `${percent}%`;
}

function formatMeta(fraction, ping) {
  const parts = [];
  if (fraction != null) parts.push(formatPercent(fraction));
  if (typeof ping === 'number') parts.push(`${Math.round(ping)}ms`);
  return parts.join(' · ');
}

export default function MonitorRow({ monitor }) {
  const { label, live, isPrimary } = monitor;
  const statusLabel = live.statusLabel || 'unknown';
  const statusText = STATUS_LABEL_ID[statusLabel] || STATUS_LABEL_ID.unknown;
  const fraction = getUptimeFraction(live.uptime);
  const meta = formatMeta(fraction, live.ping);

  return (
    <div className={isPrimary ? 'monitor-row monitor-row--primary' : 'monitor-row'}>
      <span className={`status-dot status-dot--${statusLabel}`} title={statusText}>
        <span className="sr-only">{statusText}</span>
      </span>
      <span className="monitor-row__name">{label}</span>
      {isPrimary && <span className="host-tag">HOST</span>}
      <HeartbeatBar heartbeats={live.heartbeats || []} />
      {meta && <span className="monitor-row__uptime">{meta}</span>}
    </div>
  );
}
