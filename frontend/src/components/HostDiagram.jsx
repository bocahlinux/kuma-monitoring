import { useEffect, useRef, useState } from 'react';
import { STATUS_LABEL_ID } from '../statusMeta';
import { getUptimeFraction, formatMeta } from '../monitorFormat';

function DiagramNode({ monitor, isHost, nodeRef }) {
  const statusLabel = monitor.live.statusLabel || 'unknown';
  const statusText = STATUS_LABEL_ID[statusLabel] || STATUS_LABEL_ID.unknown;
  const meta = formatMeta(getUptimeFraction(monitor.live.uptime), monitor.live.ping);

  return (
    <div ref={nodeRef} className={isHost ? 'diagram-box diagram-box--host' : 'diagram-box'}>
      <span className={`status-dot status-dot--${statusLabel}`} title={statusText}>
        <span className="sr-only">{statusText}</span>
      </span>
      <span className="diagram-box__text">
        <span className="diagram-box__name">{monitor.label}</span>
        {meta && <span className="diagram-box__meta">{meta}</span>}
      </span>
    </div>
  );
}

// Diagram kotak-garis (host di atas, anak-anaknya di bawah terhubung garis) --
// alternatif visual dari list bersarang, dipakai GroupSection cuma di layar lebar
// (lihat CSS .group__diagram-view) dan cuma kalau jumlah anaknya nggak kebanyakan,
// biar nggak sesak/berantakan.
//
// Garis penghubung digambar sebagai SVG, koordinatnya diukur dari posisi asli
// tiap kotak setelah dirender (getBoundingClientRect) -- bukan ditebak lewat
// left:50%/right:50% di CSS. Pendekatan CSS-murni sebelumnya asumsi semua kotak
// anak lebar-nya sama persis, jadi meleset begitu ada nama yang lebih panjang
// (kotak jadi lebih lebar, garis ke kotak lain ikut nggak lurus). Ngukur beneran
// dari DOM otomatis benar buat berapa pun jumlah anaknya dan berapa pun lebar
// kotaknya, tanpa perlu logika khusus per jumlah.
export default function HostDiagram({ primary, childMonitors }) {
  const containerRef = useRef(null);
  const hostRef = useRef(null);
  const childRefs = useRef([]);
  const [lines, setLines] = useState([]);

  childRefs.current = [];
  const registerChild = (el) => {
    if (el) childRefs.current.push(el);
  };

  useEffect(() => {
    const container = containerRef.current;
    const host = hostRef.current;
    if (!container || !host) return undefined;

    function measure() {
      const containerRect = container.getBoundingClientRect();
      const hostRect = host.getBoundingClientRect();
      // Kalau diagram lagi disembunyikan (display:none di layar sempit), rect-nya
      // nol semua -- jangan gambar garis sampah, biarin nunggu resize berikutnya.
      if (hostRect.width === 0 && hostRect.height === 0) {
        setLines([]);
        return;
      }
      const from = {
        x: hostRect.left + hostRect.width / 2 - containerRect.left,
        y: hostRect.bottom - containerRect.top,
      };
      const next = childRefs.current.map((el) => {
        const r = el.getBoundingClientRect();
        return {
          x1: from.x,
          y1: from.y,
          x2: r.left + r.width / 2 - containerRect.left,
          y2: r.top - containerRect.top,
        };
      });
      setLines(next);
    }

    measure();
    // Jaga-jaga layout belum settle di render pertama (misal font/ikon masih loading).
    const raf = requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', measure);
    };
  }, [childMonitors.length]);

  return (
    <div className="diagram" ref={containerRef}>
      <svg className="diagram__lines" aria-hidden="true">
        {lines.map((line, i) => (
          <line
            key={i}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            className="diagram-connector"
          />
        ))}
      </svg>
      <div className="diagram__host">
        <DiagramNode monitor={primary} isHost nodeRef={hostRef} />
      </div>
      {childMonitors.length > 0 && (
        <div className="diagram__children">
          {childMonitors.map((m) => (
            <div key={m.kumaMonitorId} className="diagram__child-wrap">
              <DiagramNode monitor={m} nodeRef={registerChild} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
