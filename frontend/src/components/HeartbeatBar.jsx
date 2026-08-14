const STATUS_VAR = {
  up: 'var(--status-good)',
  down: 'var(--status-critical)',
  pending: 'var(--status-warning)',
  maintenance: 'var(--border-strong)',
  unknown: 'var(--border)',
};

export default function HeartbeatBar({ heartbeats }) {
  const cells = heartbeats.length ? heartbeats : Array.from({ length: 50 }, () => null);

  return (
    <div className="heartbeat-bar" role="img" aria-label="Riwayat heartbeat">
      {cells.map((hb, i) => (
        <span
          key={i}
          className="heartbeat-bar__cell"
          style={{ background: hb ? STATUS_VAR[hb.statusLabel] || STATUS_VAR.unknown : STATUS_VAR.unknown }}
          title={hb ? `${hb.statusLabel} — ${hb.time}` : 'Belum ada data'}
        />
      ))}
    </div>
  );
}
