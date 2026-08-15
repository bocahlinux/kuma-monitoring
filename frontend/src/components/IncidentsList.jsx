import { formatIncidentTiming } from '../incidentFormat';

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
              <span className="incident-row__meta">{formatIncidentTiming(inc)}</span>
              {inc.note && <span className="incident-row__note">{inc.note}</span>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
