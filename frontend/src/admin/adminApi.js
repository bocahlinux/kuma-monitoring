const KEY_STORAGE = 'kuma_status_admin_api_key';

// sessionStorage (bukan localStorage) -- key hilang begitu tab ditutup, nggak nempel
// terus-terusan di browser publik/shared.
export function getStoredApiKey() {
  return sessionStorage.getItem(KEY_STORAGE) || '';
}

export function setStoredApiKey(key) {
  sessionStorage.setItem(KEY_STORAGE, key);
}

export function clearStoredApiKey() {
  sessionStorage.removeItem(KEY_STORAGE);
}

async function request(path, { method = 'GET', body } = {}) {
  const apiKey = getStoredApiKey();
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    clearStoredApiKey();
    throw new Error('UNAUTHORIZED');
  }

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

export const adminApi = {
  login(key) {
    setStoredApiKey(key);
    return request('/status-pages').catch((err) => {
      clearStoredApiKey();
      throw err;
    });
  },
  listMonitors: () => request('/monitors').then((d) => d.monitors),
  listStatusPages: () => request('/status-pages').then((d) => d.statusPages),
  getStatusPage: (slug) => request(`/status-pages/${slug}`).then((d) => d.statusPage),
  createStatusPage: (payload) =>
    request('/status-pages', { method: 'POST', body: payload }).then((d) => d.statusPage),
  updateStatusPage: (slug, payload) =>
    request(`/status-pages/${slug}`, { method: 'PUT', body: payload }).then((d) => d.statusPage),
  deleteStatusPage: (slug) => request(`/status-pages/${slug}`, { method: 'DELETE' }),
  addMonitor: (slug, payload) =>
    request(`/status-pages/${slug}/monitors`, { method: 'POST', body: payload }).then((d) => d.statusPage),
  removeMonitor: (slug, kumaMonitorId) =>
    request(`/status-pages/${slug}/monitors/${kumaMonitorId}`, { method: 'DELETE' }),
};
