const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const STATUS_PAGE_SLUG = import.meta.env.VITE_STATUS_PAGE_SLUG || 'public';

export async function fetchStatusPage() {
  const res = await fetch(`${API_BASE_URL}/api/status-pages/${STATUS_PAGE_SLUG}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.statusPage;
}
