function formatSince(startedAt) {
  return new Date(startedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

// Cuma render kalau ada insiden yang BENERAN masih berlangsung (endedAt null) --
// filter dilakukan di pemanggil (App.jsx/HomePage.jsx) dari data incidents yang sudah
// di-fetch, jadi nggak butuh endpoint/fetch tambahan.
export default function ActiveIncidentBanner({ incidents }) {
  if (!incidents.length) return null;

  return (
    <div className="active-incident">
      <div className="active-incident__title">
        <span aria-hidden="true">⚠</span> Insiden Aktif
      </div>
      <ul className="active-incident__list">
        {incidents.map((inc) => (
          <li key={inc.id}>
            <strong>{inc.monitorLabel}</strong>
            <span className="active-incident__meta">
              sejak {formatSince(inc.startedAt)}
              {inc.message ? ` — ${inc.message}` : ''}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
