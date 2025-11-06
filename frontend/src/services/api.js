const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

// ---- current "signed-in" user id (for X-User-ID) ----
export function setCurrentUser(id) {
  if (id == null) sessionStorage.removeItem('xUserId');
  else sessionStorage.setItem('xUserId', String(id));
}
export function getCurrentUser() {
  const v = sessionStorage.getItem('xUserId');
  return v ? Number(v) : null;
}

// ---- generic request helper ----
async function request(path, init = {}, sendUserHeader = false) {
  const headers = { 'Content-Type': 'application/json', ...(init.headers || {}) };
  if (sendUserHeader) {
    const uid = getCurrentUser();
    if (uid != null) headers['X-User-ID'] = String(uid);
  }
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  if (res.status === 204) return null;
  return res.json();
}

// ---------- USERS ----------
export const usersApi = {
  list: () => request('/list_users'),
  create: (payload) => request('/users', { method: 'POST', body: JSON.stringify(payload) }),
};

// ---------- MUSIC ----------
export const musicApi = {
  list: () => request('/list_music'),
  get: (id) => request(`/music/${id}`),
  // Admin-only (requires X-User-ID of an admin)
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
