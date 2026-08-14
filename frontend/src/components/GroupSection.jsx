import MonitorRow from './MonitorRow';

// Grup monitor dalam satu status page (fitur "Groups" ala Kuma). Kalau nama grup null
// (monitor belum di-assign ke grup manapun), tampil tanpa header sama sekali.
export default function GroupSection({ group }) {
  return (
    <div className="group">
      {group.name && <h3 className="group__title">{group.name}</h3>}
      <div className="monitor-list">
        {group.monitors.map((m) => (
          <MonitorRow key={m.kumaMonitorId} monitor={m} />
        ))}
      </div>
    </div>
  );
}
