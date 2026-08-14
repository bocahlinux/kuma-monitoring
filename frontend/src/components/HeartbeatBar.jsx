const STATUS_VAR = {
  up: 'var(--status-good)',
  down: 'var(--status-critical)',
  pending: 'var(--status-warning)',
  maintenance: 'var(--border-strong)',
  unknown: 'var(--border)',
};

// Sejajar dengan label (bukan di bawahnya), lebar mengikuti sisa ruang baris. Kalau
// nggak cukup lebar buat semua cell, kelebihannya "kepotong" rapi di sisi kiri (data
// terlama) lewat overflow:hidden + justify-content:flex-end di CSS -- cell terbaru
// (paling kanan) selalu yang pertama dipertahankan.
export default function HeartbeatBar({ heartbeats }) {
  const cells = heartbeats.length ? heartbeats : Array.from({ length: 30 }, () => null);

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
