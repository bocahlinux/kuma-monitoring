const STATUS_COLOR = {
  up: '#16a34a',
  down: '#dc2626',
  pending: '#d97706',
  maintenance: '#2563eb',
  unknown: '#4b5563',
};

export default function HeartbeatBar({ heartbeats }) {
  const cells = heartbeats.length ? heartbeats : Array.from({ length: 50 }, () => null);

  return (
    <div className="heartbeat-bar">
      {cells.map((hb, i) => (
        <span
          key={i}
          className="heartbeat-bar__cell"
          style={{ background: hb ? STATUS_COLOR[hb.statusLabel] || STATUS_COLOR.unknown : STATUS_COLOR.unknown }}
          title={hb ? `${hb.statusLabel} — ${hb.time}` : 'Belum ada data'}
        />
      ))}
    </div>
  );
}
