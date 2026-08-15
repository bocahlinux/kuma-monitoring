// Badge status ala shields.io (dua kotak: label abu-abu + pesan berwarna), buat
// ditempel di README/wiki/dokumen lain di luar situs status ini. Nggak pakai library
// gambar apa pun -- cuma template SVG teks, lebar tiap kotak ditaksir dari jumlah
// karakter (bukan pengukuran font asli kayak shields.io beneran, tapi cukup buat teks
// pendek yang dipakai di sini).
const CHAR_WIDTH = 6.5;
const PADDING = 10;

function escapeXml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
}

function textWidth(text) {
  return Math.round(text.length * CHAR_WIDTH + PADDING * 2);
}

export function renderStatusBadge(label, message, color) {
  const safeLabel = escapeXml(label);
  const safeMessage = escapeXml(message);
  const labelWidth = textWidth(label);
  const messageWidth = textWidth(message);
  const width = labelWidth + messageWidth;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20" role="img" aria-label="${safeLabel}: ${safeMessage}">
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${width}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${messageWidth}" height="20" fill="${color}"/>
    <rect width="${width}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${labelWidth / 2}" y="14">${safeLabel}</text>
    <text x="${labelWidth + messageWidth / 2}" y="14">${safeMessage}</text>
  </g>
</svg>`;
}

// Warna & teks pesan dari overallStatus (lihat composePage di routes/statusPages.js) --
// dipisah dari status internal Kuma (0-3) yang lebih detail, badge ini cuma butuh
// ringkasan tiga kondisi.
const STATUS_BADGE = {
  up: { message: 'operational', color: '#0ca30c' },
  down: { message: 'down', color: '#d03b3b' },
  unknown: { message: 'unknown', color: '#8c8c8c' },
};

export function statusBadgeSvg(overallStatus) {
  const { message, color } = STATUS_BADGE[overallStatus] || STATUS_BADGE.unknown;
  return renderStatusBadge('status', message, color);
}
