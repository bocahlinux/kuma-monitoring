function formatIncident(inc) {
  const started = new Date(inc.startedAt);
  const startedText = started.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

  if (!inc.endedAt) {
    return `Sejak ${startedText} — masih berlangsung`;
  }

  const ended = new Date(inc.endedAt);
  const durationMin = Math.max(1, Math.round((ended - started) / 60000));
  const durationText =
    durationMin >= 60 ? `${Math.floor(durationMin / 60)} jam ${durationMin % 60} menit` : `${durationMin} menit`;
  return `${startedText} · durasi ${durationText}`;
}

// Kosong = nggak render apa-apa sama sekali -- status page yang belum pernah ada
// insiden nggak perlu section ini nongol buat bilang "belum ada insiden".
export default function IncidentsList({ incidents }) {
  if (!incidents.length) return null;

  return (
    <section className="incidents">
      <h2 className="category__title">Riwayat Insiden</h2>
      <div className="monitor-list">
        {incidents.map((inc) => (
          <div key={inc.id} className="incident-row">
            <span className="status-dot status-dot--down" aria-hidden="true" />
            <div className="incident-row__body">
              <span className="incident-row__name">{inc.monitorLabel}</span>
              <span className="incident-row__meta">{formatIncident(inc)}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
