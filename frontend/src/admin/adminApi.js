async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
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
  login: (username, password) => request('/auth/login', { method: 'POST', body: { username, password } }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me').then((d) => d.user),
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
  createGroup: (slug, payload) =>
    request(`/status-pages/${slug}/groups`, { method: 'POST', body: payload }).then((d) => d.statusPage),
  updateGroup: (slug, groupId, payload) =>
    request(`/status-pages/${slug}/groups/${groupId}`, { method: 'PUT', body: payload }).then((d) => d.statusPage),
  deleteGroup: (slug, groupId) =>
    request(`/status-pages/${slug}/groups/${groupId}`, { method: 'DELETE' }).then((d) => d.statusPage),
  togglePrimary: (slug, kumaMonitorId) =>
    request(`/status-pages/${slug}/monitors/${kumaMonitorId}/primary`, { method: 'PUT' }).then((d) => d.statusPage),
  updateIncidentNote: (slug, incidentId, note) =>
    request(`/status-pages/${slug}/incidents/${incidentId}`, { method: 'PUT', body: { note } }).then(
      (d) => d.statusPage
    ),
  listUsers: () => request('/users').then((d) => d.users),
  createUser: (payload) => request('/users', { method: 'POST', body: payload }).then((d) => d.user),
  updateUser: (id, payload) => request(`/users/${id}`, { method: 'PUT', body: payload }).then((d) => d.user),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),
};
