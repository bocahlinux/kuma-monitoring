import HeartbeatBar from './HeartbeatBar';
import { STATUS_ICON, STATUS_LABEL_ID } from '../statusMeta';

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

export default function MonitorRow({ monitor }) {
  const { label, live } = monitor;
  const statusLabel = live.statusLabel || 'unknown';
  const fraction = getUptimeFraction(live.uptime);

  return (
    <div className="monitor-row">
      <div className="monitor-row__top">
        <span
          className={`status-badge status-badge--${statusLabel}`}
          title={STATUS_LABEL_ID[statusLabel] || STATUS_LABEL_ID.unknown}
        >
          <span aria-hidden="true">{STATUS_ICON[statusLabel] || STATUS_ICON.unknown}</span>
          {fraction != null ? formatPercent(fraction) : (STATUS_LABEL_ID[statusLabel] || statusLabel)}
        </span>
        <span className="monitor-row__name">{label}</span>
      </div>
      <HeartbeatBar heartbeats={live.heartbeats || []} />
    </div>
  );
}
