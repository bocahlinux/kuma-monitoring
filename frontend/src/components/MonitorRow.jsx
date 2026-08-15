import HeartbeatBar from './HeartbeatBar';
import { STATUS_LABEL_ID } from '../statusMeta';
import { getUptimeFraction, formatMeta } from '../monitorFormat';

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
