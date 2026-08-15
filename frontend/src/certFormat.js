// Data sertifikat TLS (`cert`) diteruskan APA ADANYA dari Kuma oleh backend --
// nggak dinormalisasi, jadi field-nya bisa beda tergantung versi Kuma (lihat README
// backend). Baca beberapa kemungkinan lokasi field secara defensif, bukan asumsi satu
// bentuk pasti benar -- kalau semuanya nggak ketemu, dianggap nggak ada info sertifikat
// (monitor non-HTTPS, atau versi Kuma yang beda), bukan nge-crash atau nampilin "NaN hari".
function extractDaysRemaining(cert) {
  if (!cert || typeof cert !== 'object') return null;
  const candidates = [cert.daysRemaining, cert.certInfo?.daysRemaining];
  for (const v of candidates) {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
  }
  const validTo = cert.validTo || cert.certInfo?.validTo;
  if (validTo) {
    const diffMs = new Date(validTo).getTime() - Date.now();
    if (Number.isFinite(diffMs)) return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }
  return null;
}

const WARNING_THRESHOLD_DAYS = 14;
const CRITICAL_THRESHOLD_DAYS = 3;

// null kalau nggak ada info sertifikat ATAU sertifikatnya masih sehat (> 14 hari lagi)
// -- badge ini sengaja cuma muncul pas jadi perhatian, bukan selalu nampilin "N hari
// lagi" buat semua monitor HTTPS (noise, nggak actionable kalau masih jauh).
export function getCertWarning(cert) {
  const daysRemaining = extractDaysRemaining(cert);
  if (daysRemaining == null || daysRemaining > WARNING_THRESHOLD_DAYS) return null;
  return {
    daysRemaining,
    severity: daysRemaining <= CRITICAL_THRESHOLD_DAYS ? 'critical' : 'warning',
  };
}

export function formatCertWarning({ daysRemaining }) {
  if (daysRemaining < 0) return `SSL kadaluarsa ${Math.abs(daysRemaining)} hari lalu`;
  if (daysRemaining === 0) return 'SSL kadaluarsa hari ini';
  return `SSL ${daysRemaining} hari lagi`;
}
