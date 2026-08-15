import MonitorRow from './MonitorRow';

// Grup monitor dalam satu status page (fitur "Groups" ala Kuma). Kalau nama grup null
// (monitor belum di-assign ke grup manapun), tampil tanpa header sama sekali.
//
// Kalau ada monitor yang ditandai "host" (isPrimary, diatur di /admin), monitor
// lainnya dalam grup itu di-render sebagai anak bersarang di bawahnya (garis
// penghubung + indentasi) -- bukan cuma baris rata sejajar biasa. Kalau nggak ada
// host, tampil flat seperti sebelumnya.
export default function GroupSection({ group }) {
  const primary = group.monitors.find((m) => m.isPrimary);
  const rest = primary ? group.monitors.filter((m) => m.kumaMonitorId !== primary.kumaMonitorId) : [];

  return (
    <div className="group">
      {group.name && <h3 className="group__title">{group.name}</h3>}
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
    </div>
  );
}
