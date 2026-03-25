const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
    if (!res.ok) throw new Error(`PUT ${path} failed`);
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
  async getPublicSettings() { return this.get('/api/settings/public', false); },
};
