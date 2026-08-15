import { STATUS_ICON } from '../statusMeta';

// Beda dari ActiveIncidentBanner (gangguan nggak terduga) -- ini status TERENCANA
// (monitor Kuma status 3, biasa dari jadwal Maintenance di Kuma sendiri). Warna netral
// (bukan merah/hijau, biar nggak disalahartikan insiden beneran) -- lihat statusMeta.js
// buat ikon/label status yang konsisten dipakai di seluruh halaman publik & admin.
export default function MaintenanceBanner({ monitors }) {
  const inMaintenance = monitors.filter((m) => m.live.statusLabel === 'maintenance');
  if (!inMaintenance.length) return null;

  return (
    <div className="active-incident active-incident--maintenance">
      <div className="active-incident__title">
        <span aria-hidden="true">{STATUS_ICON.maintenance}</span> Sedang Pemeliharaan Terjadwal
      </div>
      <ul className="active-incident__list">
        {inMaintenance.map((m) => (
          <li key={m.kumaMonitorId}>
            <strong>{m.label}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
