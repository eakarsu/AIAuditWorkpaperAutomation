const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4001/api';

function getHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

async function apiCall(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: getHeaders()
  });
  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'API Error');
  return data;
}

export const auth = {
  login: (email, password) => apiCall('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => apiCall('/auth/me'),
};

export const evidence = {
  getAll: () => apiCall('/evidence'),
  getOne: (id) => apiCall(`/evidence/${id}`),
  create: (data) => apiCall('/evidence', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiCall(`/evidence/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiCall(`/evidence/${id}`, { method: 'DELETE' }),
};

export const sampling = {
  getAll: () => apiCall('/sampling'),
  getOne: (id) => apiCall(`/sampling/${id}`),
  create: (data) => apiCall('/sampling', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiCall(`/sampling/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiCall(`/sampling/${id}`, { method: 'DELETE' }),
};

export const workpapers = {
  getAll: () => apiCall('/workpapers'),
  getOne: (id) => apiCall(`/workpapers/${id}`),
  create: (data) => apiCall('/workpapers', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiCall(`/workpapers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiCall(`/workpapers/${id}`, { method: 'DELETE' }),
};

export const findings = {
  getAll: () => apiCall('/findings'),
  getOne: (id) => apiCall(`/findings/${id}`),
  create: (data) => apiCall('/findings', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiCall(`/findings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiCall(`/findings/${id}`, { method: 'DELETE' }),
};

export const checklists = {
  getAll: () => apiCall('/checklists'),
  getOne: (id) => apiCall(`/checklists/${id}`),
  create: (data) => apiCall('/checklists', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiCall(`/checklists/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiCall(`/checklists/${id}`, { method: 'DELETE' }),
};

export const users = {
  getAll: () => apiCall('/users'),
  create: (data) => apiCall('/users', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiCall(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiCall(`/users/${id}`, { method: 'DELETE' }),
};

export const auditTrail = {
  getAll: (params) => apiCall(`/audit-trail?${new URLSearchParams(params)}`),
  getStats: () => apiCall('/audit-trail/stats'),
};

export const reports = {
  getSummary: () => apiCall('/reports/summary'),
  exportData: (module) => apiCall(`/reports/export/${module}`),
};

export const ai = {
  analyzeEvidence: (evidence) => apiCall('/ai/analyze-evidence', { method: 'POST', body: JSON.stringify({ evidence }) }),
  calculateSample: (sampling) => apiCall('/ai/calculate-sample', { method: 'POST', body: JSON.stringify({ sampling }) }),
  generateWorkpaper: (workpaper) => apiCall('/ai/generate-workpaper', { method: 'POST', body: JSON.stringify({ workpaper }) }),
  analyzeFinding: (finding) => apiCall('/ai/analyze-finding', { method: 'POST', body: JSON.stringify({ finding }) }),
  assessCompliance: (checklist) => apiCall('/ai/assess-compliance', { method: 'POST', body: JSON.stringify({ checklist }) }),
};
