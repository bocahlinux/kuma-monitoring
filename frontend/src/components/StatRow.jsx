import { computeStats, computeUptimeSummary } from '../stats';
import UptimeRing from './UptimeRing';

const HEADLINE_PERIOD_KEY = import.meta.env.VITE_HEADLINE_PERIOD_KEY || '720';
const HEADLINE_PERIOD_LABEL = import.meta.env.VITE_HEADLINE_PERIOD_LABEL || '30 hari';

export default function StatRow({ monitors }) {
  const { up, down, total } = computeStats(monitors);
  const uptimePercent = computeUptimeSummary(monitors, HEADLINE_PERIOD_KEY);

  return (
    <div className="stat-row">
      <div className="stat">
        <span className="stat__icon stat__icon--good" aria-hidden="true" />
        <div>
          <span className="stat__label">Terhubung</span>
          <span className="stat__value">{up}</span>
        </div>
      </div>
      <div className="stat">
        <span className={down > 0 ? 'stat__icon stat__icon--critical' : 'stat__icon stat__icon--muted'} aria-hidden="true" />
        <div>
          <span className="stat__label">Terputus</span>
          <span className={down > 0 ? 'stat__value stat__value--critical' : 'stat__value'}>{down}</span>
        </div>
      </div>
      <div className="stat">
        <span className="stat__icon stat__icon--accent" aria-hidden="true" />
        <div>
          <span className="stat__label">Total monitor</span>
          <span className="stat__value">{total}</span>
        </div>
      </div>
      {uptimePercent != null && (
        <div className="stat stat--ring">
          <UptimeRing percent={uptimePercent} />
          <span className="stat__label">Uptime {HEADLINE_PERIOD_LABEL}</span>
        </div>
      )}
    </div>
  );
}
