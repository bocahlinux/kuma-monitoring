const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export async function fetchStatusPage(slug) {
  const res = await fetch(`${API_BASE_URL}/api/status-pages/${slug}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.statusPage;
}
