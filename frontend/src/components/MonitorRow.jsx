import HeartbeatBar from './HeartbeatBar';

const UPTIME_PERIOD_KEY = import.meta.env.VITE_UPTIME_PERIOD_KEY || '24';

function getUptimePercent(uptime) {
  if (!uptime) return null;
  if (UPTIME_PERIOD_KEY in uptime) return uptime[UPTIME_PERIOD_KEY];
  const keys = Object.keys(uptime);
  return keys.length ? uptime[keys[0]] : null;
}

function formatPercent(percent) {
  const rounded = Math.round(percent * 100) / 100;
  return `${rounded}%`;
}

function badgeClass(statusLabel) {
  return `badge badge--${statusLabel || 'unknown'}`;
}

export default function MonitorRow({ monitor }) {
  const { label, live } = monitor;
  const percent = getUptimePercent(live.uptime);

  return (
    <div className="monitor-row">
      <div className="monitor-row__info">
        <span className={badgeClass(live.statusLabel)}>
          {percent != null ? formatPercent(percent) : live.statusLabel}
        </span>
        <span className="monitor-row__name">{label}</span>
      </div>
      <HeartbeatBar heartbeats={live.heartbeats || []} />
    </div>
  );
}
