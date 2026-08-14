import { computeStats } from '../stats';

export default function StatRow({ monitors }) {
  const { up, down, total } = computeStats(monitors);

  return (
    <div className="stat-row">
      <div className="stat">
        <span className="stat__label">Terhubung</span>
        <span className="stat__value">{up}</span>
      </div>
      <div className="stat">
        <span className="stat__label">Terputus</span>
        <span className={down > 0 ? 'stat__value stat__value--critical' : 'stat__value'}>{down}</span>
      </div>
      <div className="stat">
        <span className="stat__label">Total monitor</span>
        <span className="stat__value">{total}</span>
      </div>
    </div>
  );
}
