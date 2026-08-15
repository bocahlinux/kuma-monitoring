import { useState } from 'react';
import { buildPingTrend } from '../stats';

const WIDTH = 100;
const HEIGHT = 32;

function pointToXY(points, min, range, i) {
  const x = (i / (points.length - 1)) * WIDTH;
  const y = HEIGHT - ((points[i] - min) / range) * (HEIGHT - 4) - 2;
  return { x, y };
}

// Sparkline sederhana (bukan library chart) -- garis tunggal, tren response time
// rata-rata gabungan semua monitor. Nggak render apa-apa kalau datanya kurang dari
// 2 titik (belum cukup buat digambar jadi garis).
//
// Hover/crosshair: titik-titik ini bukan sejajar waktu asli (lihat buildPingTrend di
// stats.js -- dirata-rata per "seberapa lama yang lalu", bukan jam beneran, karena
// monitor nggak check bebarengan), jadi label hover sengaja "N pengecekan lalu", bukan
// jam/tanggal yang bakal kesannya presisi padahal enggak.
export default function PerformanceChart({ monitors }) {
  const [hoverIndex, setHoverIndex] = useState(null);
  const points = buildPingTrend(monitors);
  if (points.length < 2) return null;

  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;

  const coords = points
    .map((v, i) => {
      const { x, y } = pointToXY(points, min, range, i);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const latest = Math.round(points.at(-1));

  const handlePointerMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setHoverIndex(Math.round(ratio * (points.length - 1)));
  };

  const hovered = hoverIndex != null ? pointToXY(points, min, range, hoverIndex) : null;
  const agoLabel =
    hoverIndex != null
      ? hoverIndex === points.length - 1
        ? 'Terbaru'
        : `${points.length - 1 - hoverIndex} pengecekan lalu`
      : null;
  // Tooltip nempel ke sisi yang nggak bikin dia kepotong tepi chart -- rata kiri titiknya
  // kalau titiknya di separuh kanan, rata kanan kalau di separuh kiri.
  const tooltipSide = hovered && hovered.x > WIDTH / 2 ? 'right' : 'left';

  return (
    <div className="perf-chart">
      <div className="perf-chart__header">
        <span className="stat__label">Response Time</span>
        <span className="perf-chart__value">{latest}ms</span>
      </div>
      <div className="perf-chart__plot">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
          className="perf-chart__svg"
          role="img"
          aria-label={`Tren response time, terakhir ${latest}ms`}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverIndex(null)}
        >
          <polyline
            points={coords}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
          {hovered && (
            <line
              x1={hovered.x}
              y1="0"
              x2={hovered.x}
              y2={HEIGHT}
              stroke="var(--border-strong)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {hovered && (
            <circle cx={hovered.x} cy={hovered.y} r="2.2" fill="var(--accent)" vectorEffect="non-scaling-stroke" />
          )}
        </svg>
        {hovered && (
          <div
            className={`perf-chart__tooltip perf-chart__tooltip--${tooltipSide}`}
            style={{ left: `${(hovered.x / WIDTH) * 100}%`, top: `${(hovered.y / HEIGHT) * 100}%` }}
          >
            <strong>{Math.round(points[hoverIndex])}ms</strong>
            <span>{agoLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
}
