export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export interface PublicSettings {
  footerBio?: string;
  footerName?: string;
  siteTitle?: string;
  sections?: {
    writings?: { enabled?: boolean };
    projects?: { enabled?: boolean };
    books?: { enabled?: boolean };
  };
}

let publicSettingsCache: PublicSettings | null = null;
let publicSettingsPromise: Promise<PublicSettings> | null = null;

// In-memory cache for admin settings (non-sensitive)
let adminSettingsCache: Record<string, unknown> | null = null;
let adminSettingsPromise: Promise<Record<string, unknown>> | null = null;
const ADMIN_SETTINGS_TTL = 30_000; // 30 seconds
let adminSettingsTimestamp = 0;

type CacheEntry<T> = { data: T; ts: number };
const runtimeCache: Record<string, CacheEntry<unknown>> = {};
const DEFAULT_CACHE_TTL = 60_000;

export function getRuntimeCache<T>(key: string, ttlMs = DEFAULT_CACHE_TTL): T | null {
  const entry = runtimeCache[key] as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() - entry.ts > ttlMs) return null;
  return entry.data;
}

export function setRuntimeCache<T>(key: string, data: T): void {
  runtimeCache[key] = { data, ts: Date.now() };
}

export function invalidateRuntimeCache(prefix?: string): void {
  if (!prefix) {
    Object.keys(runtimeCache).forEach((key) => delete runtimeCache[key]);
    return;
  }
  Object.keys(runtimeCache).forEach((key) => {
    if (key.startsWith(prefix)) delete runtimeCache[key];
  });
}

export const api = {
  getToken() {
    return localStorage.getItem('cms_token');
  },

  headers(withAuth = true) {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (withAuth) {
      const token = this.getToken();
      if (token) h['Authorization'] = `Bearer ${token}`;
    }
    return h;
  },

  async login(username: string, password: string) {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) throw new Error('Invalid credentials');
    const data = await res.json();
    localStorage.setItem('cms_token', data.token);
    localStorage.setItem('cms_user', data.username);
    return data;
  },

  logout() {
    localStorage.removeItem('cms_token');
    localStorage.removeItem('cms_user');
  },

  isLoggedIn() {
    return !!this.getToken();
  },

  // Generic fetch helpers
  async get(path: string, auth = true) {
    const res = await fetch(`${API_BASE}${path}`, { headers: this.headers(auth) });
    if (res.status === 401 && auth) { this.logout(); window.location.href = '/admin/login'; throw new Error('Unauthorized'); }
    if (!res.ok) throw new Error(`GET ${path} failed`);
    return res.json();
  },

  async post(path: string, data: unknown) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST', headers: this.headers(), body: JSON.stringify(data),
    });
    if (res.status === 401) { this.logout(); window.location.href = '/admin/login'; throw new Error('Unauthorized'); }
    if (!res.ok) throw new Error(`POST ${path} failed`);
    return res.json();
  },

  async put(path: string, data: unknown) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'PUT', headers: this.headers(), body: JSON.stringify(data),
    });
    if (res.status === 401) { this.logout(); window.location.href = '/admin/login'; throw new Error('Unauthorized'); }
    if (!res.ok) {
      let detail = '';
      try { const body = await res.json(); detail = body.error || body.message || ''; } catch { /* ignore */ }
      throw new Error(`PUT ${path} failed${detail ? ': ' + detail : ''}`);
    }
    return res.json();
  },

  /** ATOMIC WRITE: send only the changed fields — server uses $set */
  async patch(path: string, data: unknown) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'PATCH', headers: this.headers(), body: JSON.stringify(data),
    });
    if (res.status === 401) { this.logout(); window.location.href = '/admin/login'; throw new Error('Unauthorized'); }
    if (!res.ok) throw new Error(`PATCH ${path} failed`);
    return res.json();
  },

  async del(path: string) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'DELETE', headers: this.headers(),
    });
    if (res.status === 401) { this.logout(); window.location.href = '/admin/login'; throw new Error('Unauthorized'); }
    if (!res.ok) throw new Error(`DELETE ${path} failed`);
    return res.json();
  },

  // Public endpoints (no auth needed)
  async getPublicProjects() { return this.get('/api/projects/public', false); },
  async getPublicWritings() { return this.get('/api/writings/public', false); },
  async getPublicBooks() { return this.get('/api/books/public', false); },
  async getPublicAbout() { return this.get('/api/about/public', false); },
  async getPublicHome() { return this.get('/api/home/public', false); },
  async getPublicSettings(opts?: { force?: boolean }) {
    if (opts?.force) {
      publicSettingsCache = null;
      publicSettingsPromise = null;
    }
    if (publicSettingsCache) return publicSettingsCache;
    if (!publicSettingsPromise) {
      publicSettingsPromise = this.get('/api/settings/public', false).then((data) => {
        publicSettingsCache = data as PublicSettings;
        return publicSettingsCache;
      }).finally(() => {
        publicSettingsPromise = null;
      });
    }
    return publicSettingsPromise;
  },

  // Cached admin settings — avoids refetching on every editor mount
  async getAdminSettings(opts?: { force?: boolean }) {
    if (opts?.force) {
      adminSettingsCache = null;
      adminSettingsPromise = null;
      adminSettingsTimestamp = 0;
    }
    const now = Date.now();
    if (adminSettingsCache && (now - adminSettingsTimestamp) < ADMIN_SETTINGS_TTL) {
      return adminSettingsCache;
    }
    if (!adminSettingsPromise) {
      adminSettingsPromise = this.get('/api/settings').then((data) => {
        adminSettingsCache = data as Record<string, unknown>;
        adminSettingsTimestamp = Date.now();
        return adminSettingsCache;
      }).finally(() => {
        adminSettingsPromise = null;
      });
    }
    return adminSettingsPromise;
  },
};
