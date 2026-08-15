const STORAGE_KEY = 'kuma_status_theme';

// Pencegah kedipan tema salah pas load pertama sudah ditangani inline script blocking
// di index.html (jalan sebelum CSS ke-parse) -- modul ini cuma dipakai runtime, pas
// user klik toggle.

// null/undefined = ikut preferensi sistem (belum pernah di-toggle manual).
export function getStoredTheme() {
  return localStorage.getItem(STORAGE_KEY) || null;
}

export function getEffectiveTheme() {
  const stored = getStoredTheme();
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function setTheme(theme) {
  localStorage.setItem(STORAGE_KEY, theme);
  document.documentElement.setAttribute('data-theme', theme);
}
