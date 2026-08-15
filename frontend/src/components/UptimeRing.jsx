// Gauge lingkaran -- sengaja cuma dipakai buat SATU metrik (uptime jangka panjang di
// StatRow), bukan tiap angka. Count (Terhubung/Terputus/Total) tetap angka polos karena
// bukan persentase/bounded value -- gauge di situ nggak akan masuk akal.
export default function UptimeRing({ percent, size = 52, stroke = 5 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = c - (clamped / 100) * c;
  const color =
    clamped >= 99 ? 'var(--status-good)' : clamped >= 95 ? 'var(--status-warning)' : 'var(--status-critical)';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="uptime-ring" role="img" aria-label={`Uptime ${percent}%`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="uptime-ring__text">
        {clamped}%
      </text>
    </svg>
  );
}
