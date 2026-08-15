import HeartbeatBar from './HeartbeatBar';
import { STATUS_LABEL_ID } from '../statusMeta';
import { getUptimeFraction, formatMeta } from '../monitorFormat';
import { getCertWarning, formatCertWarning } from '../certFormat';
import { tagKey, tagLabel, tagColor } from '../tagFormat';

const MAX_VISIBLE_TAGS = 2;

export default function MonitorRow({ monitor }) {
  const { label, live, isPrimary } = monitor;
  const statusLabel = live.statusLabel || 'unknown';
  const statusText = STATUS_LABEL_ID[statusLabel] || STATUS_LABEL_ID.unknown;
  const fraction = getUptimeFraction(live.uptime);
  const meta = formatMeta(fraction, live.ping);
  const certWarning = getCertWarning(live.cert);
  const tags = (live.tags || []).slice(0, MAX_VISIBLE_TAGS);

  return (
    <div className={isPrimary ? 'monitor-row monitor-row--primary' : 'monitor-row'}>
      <span className={`status-dot status-dot--${statusLabel}`} title={statusText}>
        <span className="sr-only">{statusText}</span>
      </span>
      <span className="monitor-row__name">{label}</span>
      {isPrimary && <span className="host-tag">HOST</span>}
      {tags.map((t, i) => (
        <span key={tagKey(t, i)} className="tag-pill" style={{ '--tag-color': tagColor(t) || 'var(--border-strong)' }}>
          {tagLabel(t)}
        </span>
      ))}
      {certWarning && (
        <span
          className={`cert-warning cert-warning--${certWarning.severity}`}
          title={formatCertWarning(certWarning)}
        >
          <span aria-hidden="true">🔒</span> {certWarning.daysRemaining}h
        </span>
      )}
      <HeartbeatBar heartbeats={live.heartbeats || []} />
      {meta && <span className="monitor-row__uptime">{meta}</span>}
    </div>
  );
}
