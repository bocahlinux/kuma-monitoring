import { formatRelativeTime } from '../incidentFormat';

function formatSince(startedAt) {
  return new Date(startedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

// Dua kondisi: ada insiden aktif (endedAt null, difilter di pemanggil) -> banner
// peringatan seperti sebelumnya; kalau nggak ada, tetap tampil banner POSITIF ("Semua
// Sistem Normal") + kapan terakhir kali down (dari `lastIncident`, insiden PALING baru
// yang pernah tercatat, aktif atau selesai -- lihat backend README). Biar halaman publik
// nggak diam aja pas semuanya baik-baik saja, tetap kasih konteks riwayat.
export default function ActiveIncidentBanner({ incidents, lastIncident }) {
  if (incidents.length > 0) {
    return (
      <div className="active-incident active-incident--down">
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

  return (
    <div className="active-incident active-incident--ok">
      <div className="active-incident__title">
        <span aria-hidden="true">✓</span> Semua Sistem Normal
      </div>
      <p className="active-incident__meta active-incident__meta--standalone">
        {lastIncident
          ? `Insiden terakhir: ${formatRelativeTime(lastIncident.endedAt || lastIncident.startedAt)}`
          : 'Belum pernah ada insiden yang tercatat.'}
      </p>
    </div>
  );
}
