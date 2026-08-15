import { STATUS_LABEL_ID } from '../statusMeta';

function DiagramNode({ monitor, isHost }) {
  const statusLabel = monitor.live.statusLabel || 'unknown';
  const statusText = STATUS_LABEL_ID[statusLabel] || STATUS_LABEL_ID.unknown;

  return (
    <div className={isHost ? 'diagram-box diagram-box--host' : 'diagram-box'}>
      <span className={`status-dot status-dot--${statusLabel}`} title={statusText}>
        <span className="sr-only">{statusText}</span>
      </span>
      <span className="diagram-box__name">{monitor.label}</span>
    </div>
  );
}

// Diagram kotak-garis (host di atas, anak-anaknya di bawah terhubung garis) --
// alternatif visual dari list bersarang, dipakai GroupSection cuma di layar lebar
// (lihat CSS .group__diagram-view) dan cuma kalau jumlah anaknya nggak kebanyakan,
// biar nggak sesak/berantakan.
export default function HostDiagram({ primary, childMonitors }) {
  return (
    <div className="diagram">
      <div className="diagram__host">
        <DiagramNode monitor={primary} isHost />
      </div>
      {childMonitors.length > 0 && (
        <div className="diagram__children">
          {childMonitors.map((m) => (
            <div key={m.kumaMonitorId} className="diagram__child-wrap">
              <DiagramNode monitor={m} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
