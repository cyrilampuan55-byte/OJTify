const defaultApiBase = () => {
  const envBase = import.meta.env.VITE_API_BASE;
  if (envBase) return envBase.replace(/\/$/, '');

  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;
    if (protocol === 'file:') return 'http://127.0.0.1:3001/api';
    if (protocol.startsWith('capacitor:')) {
      return envBase ? envBase.replace(/\/$/, '') : 'http://127.0.0.1:3001/api';
    }
    if ((hostname === 'localhost' || hostname === '127.0.0.1') && port === '8080') return '/api';
    if (hostname === 'localhost' || hostname === '127.0.0.1') return 'http://127.0.0.1:3001/api';
  }

  return '/api';
};

const API_BASE = defaultApiBase();

const getToken = () => localStorage.getItem('ojt_token');

const request = async (path: string, options: RequestInit = {}) => {
  const token = getToken();
  const headers = new Headers(options.headers || {});

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error(`Cannot reach the local API server at ${API_BASE}. Start it with "npm run dev" or "npm run dev:server".`);
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = data?.error || 'Request failed';
    throw new Error(error);
  }
  return data;
};

export const api = {
  login: async (email: string, password: string) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: async (email: string, password: string, name: string) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),

  verify: async () => request('/auth/verify'),

  timeIn: async () =>
    request('/time/in', {
      method: 'POST',
    }),

  timeOut: async () =>
    request('/time/out', {
      method: 'POST',
    }),

  getActiveSession: async () => request('/time/active-session'),
  activeSession: async () => api.getActiveSession(),

  getLogs: async (params: Record<string, any> = {}) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        search.set(key, String(value));
      }
    });
    return request(`/logs${search.size ? `?${search.toString()}` : ''}`);
  },

  logs: async (params: Record<string, any> = {}) => api.getLogs(params),

  getStats: async (userId?: string) =>
    request(`/stats${userId ? `?userId=${encodeURIComponent(userId)}` : ''}`),

  stats: async (userId?: string) => api.getStats(userId),

  getSettings: async () => request('/settings'),

  saveSettings: async (settings: Record<string, any>) =>
    request('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),

  addEntry: async (time_in: string, time_out: string) =>
    request('/entries', {
      method: 'POST',
      body: JSON.stringify({ time_in, time_out }),
    }),

  deleteEntry: async (entryId: string) =>
    request(`/entries/${encodeURIComponent(entryId)}`, {
      method: 'DELETE',
    }),

  resetData: async () =>
    request('/reset-data', {
      method: 'POST',
    }),

  getNotifications: async (params: Record<string, any> = {}) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        search.set(key, String(value));
      }
    });
    return request(`/notifications${search.size ? `?${search.toString()}` : ''}`);
  },

  markNotificationRead: async (notificationId: string) =>
    request(`/notifications/${encodeURIComponent(notificationId)}/read`, {
      method: 'POST',
    }),

  markAllNotificationsRead: async () =>
    request('/notifications/read-all', {
      method: 'POST',
    }),

  getAdminUsers: async () => request('/admin/users'),
  adminUsers: async () => api.getAdminUsers(),

  deleteUser: async (userId: string) =>
    request(`/admin/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    }),

  adminDelete: async (userId: string) => api.deleteUser(userId),

  exportLogs: async (params: Record<string, any> = {}) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        search.set(key, String(value));
      }
    });
    return request(`/admin/export${search.size ? `?${search.toString()}` : ''}`);
  },

  adminExport: async (params: Record<string, any> = {}) => api.exportLogs(params),

  subscribe: (onMessage: (payload: any) => void) => {
    let disposed = false;
    let source: EventSource | null = null;

    const connect = () => {
      if (disposed) return;
      source = new EventSource(`${API_BASE}/events`);
      source.onmessage = (event) => {
        try {
          onMessage(JSON.parse(event.data));
        } catch {
          onMessage(event.data);
        }
      };
      source.onerror = () => {
        source?.close();
        source = null;
        if (!disposed) {
          setTimeout(connect, 2000);
        }
      };
    };

    connect();

    return () => {
      disposed = true;
      source?.close();
    };
  },
};
