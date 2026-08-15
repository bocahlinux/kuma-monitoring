import { buildPingTrend } from '../stats';

const WIDTH = 100;
const HEIGHT = 32;

// Sparkline sederhana (bukan library chart) -- garis tunggal, tren response time
// rata-rata gabungan semua monitor. Nggak render apa-apa kalau datanya kurang dari
// 2 titik (belum cukup buat digambar jadi garis).
export default function PerformanceChart({ monitors }) {
  const points = buildPingTrend(monitors);
  if (points.length < 2) return null;

  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;

  const coords = points
    .map((v, i) => {
      const x = (i / (points.length - 1)) * WIDTH;
      const y = HEIGHT - ((v - min) / range) * (HEIGHT - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const latest = Math.round(points.at(-1));

  return (
    <div className="perf-chart">
      <div className="perf-chart__header">
        <span className="stat__label">Response Time</span>
        <span className="perf-chart__value">{latest}ms</span>
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" className="perf-chart__svg" role="img" aria-label={`Tren response time, terakhir ${latest}ms`}>
        <polyline points={coords} fill="none" stroke="var(--accent)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}
