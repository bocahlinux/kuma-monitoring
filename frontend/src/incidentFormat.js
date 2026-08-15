// Dipakai halaman publik (IncidentsList) dan admin (StatusPageEditor), satu sumber
// biar format waktu/durasi insiden konsisten di dua tempat.
export function formatIncidentTiming(inc) {
  const started = new Date(inc.startedAt);
  const startedText = started.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

  if (!inc.endedAt) {
    return `Sejak ${startedText} — masih berlangsung`;
  }

  const ended = new Date(inc.endedAt);
  const durationMin = Math.max(1, Math.round((ended - started) / 60000));
  const durationText =
    durationMin >= 60 ? `${Math.floor(durationMin / 60)} jam ${durationMin % 60} menit` : `${durationMin} menit`;
  return `${startedText} · durasi ${durationText}`;
}

// "3 hari lalu", "baru saja", dst -- buat banner "insiden terakhir X lalu".
export function formatRelativeTime(isoString) {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'baru saja';
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} hari lalu`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} bulan lalu`;
  const years = Math.round(months / 12);
  return `${years} tahun lalu`;
}
