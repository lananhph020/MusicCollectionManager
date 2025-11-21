const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

// ---- Token Management ----
export function setToken(accessToken, refreshToken) {
  if (accessToken) sessionStorage.setItem('accessToken', accessToken);
  else sessionStorage.removeItem('accessToken');
  
  if (refreshToken) sessionStorage.setItem('refreshToken', refreshToken);
  else sessionStorage.removeItem('refreshToken');
}

export function getToken() {
  return sessionStorage.getItem('accessToken');
}

export function getRefreshToken() {
  return sessionStorage.getItem('refreshToken');
}

export function clearTokens() {
  sessionStorage.removeItem('accessToken');
  sessionStorage.removeItem('refreshToken');
  sessionStorage.removeItem('currentUser');
}

export function setCurrentUserInfo(user) {
  if (user) sessionStorage.setItem('currentUser', JSON.stringify(user));
  else sessionStorage.removeItem('currentUser');
}

export function getCurrentUserInfo() {
  const data = sessionStorage.getItem('currentUser');
  return data ? JSON.parse(data) : null;
}

// ---- generic request helper ----
async function request(path, init = {}, requireAuth = false) {
  const headers = { 'Content-Type': 'application/json', ...(init.headers || {}) };
  
  if (requireAuth) {
    const token = getToken();
    if (!token) throw new Error('Not authenticated');
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  if (res.status === 204) return null;
  return res.json();
}

// ---------- AUTH ----------
export const authApi = {
  getLoginUrl: () => request('/auth/login-url'),
  exchangeToken: (code, redirectUri) => 
    request('/auth/token', { method: 'POST', body: JSON.stringify({ code, redirect_uri: redirectUri }) }),
  getCurrentUser: () => request('/auth/me', {}, true),
  logout: async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        await request('/auth/logout', { method: 'POST', body: JSON.stringify({ refresh_token: refreshToken }) }, true);
      } catch (e) {
        console.warn('Logout failed:', e);
      }
    }
    clearTokens();
  },
  getKeycloakLogoutUrl: () => request('/auth/keycloak-logout-url'),
};

// ---------- USERS ----------
export const usersApi = {
  list: () => request('/list_users', {}, true),
  create: (payload) => request('/users', { method: 'POST', body: JSON.stringify(payload) }, true),
};

// ---------- MUSIC ----------
export const musicApi = {
  list: () => request('/list_music', {}, true),
  get: (id) => request(`/music/${id}`, {}, true),
  // Admin-only
  create: (payload) => request('/music', { method: 'POST', body: JSON.stringify(payload) }, true),
  update: (id, payload) => request(`/update_music/${id}`, { method: 'PUT', body: JSON.stringify(payload) }, true),
  delete: (id) => request(`/delete_music/${id}`, { method: 'DELETE' }, true),
};

// ---------- COLLECTION ----------
export const collectionApi = {
  mine: () => request('/get_collection', {}, true),
  add: (music_id, status = 'none') =>
    request('/collection', { method: 'POST', body: JSON.stringify({ music_id, status }) }, true),
  updateItem: (user_music_id, status) =>
    request(`/collection/${user_music_id}`, { method: 'PUT', body: JSON.stringify({ status }) }, true),
  removeItem: (user_music_id) => request(`/remove_collection/${user_music_id}`, { method: 'DELETE' }, true),
  byUser: (user_id) => request(`/collection/${user_id}`, {}, true), // admin can view any user
};

// ---------- COMMENTS ----------
export const commentsApi = {
  // list does NOT need auth
  listForMusic: (music_id) => request(`/music/${music_id}/comments`),
  // add requires current user (X-User-ID)
  add: (music_id, content, rating) =>
    request(
      '/comments',
      { method: 'POST', body: JSON.stringify({ music_id, content, rating }) },
      true
    ),
};
