import MonitorRow from './MonitorRow';
import HostDiagram from './HostDiagram';
import { computeUptimeSummary } from '../stats';
import { UPTIME_PERIOD_KEY } from '../monitorFormat';

// Diagram cuma ditawarkan kalau jumlah anaknya wajar -- kebanyakan kotak bikin
// diagramnya sesak/nggak kebaca, mendingan tetap list buat kasus itu. Garis
// penghubungnya diukur dari posisi asli tiap kotak (lihat HostDiagram.jsx), jadi
// tetap presisi di angka ini -- batasnya murni soal kepadatan visual, bukan akurasi.
const MAX_DIAGRAM_CHILDREN = 12;

// Grup monitor dalam satu status page (fitur "Groups" ala Kuma). Kalau nama grup null
// (monitor belum di-assign ke grup manapun), tampil tanpa header sama sekali.
//
// Kalau ada monitor yang ditandai "host" (isPrimary, diatur di /admin) dan jumlah
// anggota lainnya nggak kebanyakan, tersedia DUA tampilan sekaligus di DOM: list
// bersarang (buat layar sempit/HP) dan diagram kotak-garis (buat layar lebar) --
// yang mana yang kelihatan diatur murni lewat CSS media query (lihat App.css
// .group__list-view / .group__diagram-view), bukan deteksi lebar layar pakai JS.
export default function GroupSection({ group }) {
  const primary = group.monitors.find((m) => m.isPrimary);
  const rest = primary ? group.monitors.filter((m) => m.kumaMonitorId !== primary.kumaMonitorId) : [];
  const canDiagram = !!primary && rest.length > 0 && rest.length <= MAX_DIAGRAM_CHILDREN;
  // Rata-rata uptime gabungan semua anggota grup (host + anak-anaknya), periode sama
  // kayak badge per-monitor -- biar kesehatan satu kelompok kelihatan sekali lihat
  // tanpa harus itung manual dari tiap baris.
  const groupUptime = group.monitors.length > 1 ? computeUptimeSummary(group.monitors, UPTIME_PERIOD_KEY) : null;

  const listView = (
    <div className="monitor-list">
      {primary ? (
        <>
          <MonitorRow monitor={primary} />
          {rest.length > 0 && (
            <div className="monitor-children">
              {rest.map((m) => (
                <MonitorRow key={m.kumaMonitorId} monitor={m} />
              ))}
            </div>
          )}
        </>
      ) : (
        group.monitors.map((m) => <MonitorRow key={m.kumaMonitorId} monitor={m} />)
      )}
    </div>
  );

  return (
    <div className="group">
      {group.name && (
        <div className="group__header">
          <h3 className="group__title">{group.name}</h3>
          {groupUptime != null && <span className="group__uptime">{groupUptime}% uptime</span>}
        </div>
      )}
      {canDiagram ? (
        <div className="group__dual">
          <div className="group__list-view">{listView}</div>
          <div className="group__diagram-view">
            <HostDiagram primary={primary} childMonitors={rest} />
          </div>
        </div>
      ) : (
        listView
      )}
    </div>
  );
}
