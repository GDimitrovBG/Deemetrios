const BASE = import.meta.env.VITE_API_URL || '';

let token = sessionStorage.getItem('areti_token') || null;
let onUnauth = null;

export function setToken(t) {
  token = t;
  if (t) sessionStorage.setItem('areti_token', t);
  else sessionStorage.removeItem('areti_token');
}

export function getToken() { return token; }

export function onUnauthenticated(cb) { onUnauth = cb; }

async function request(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...opts.headers };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE}${path}`, { ...opts, headers });
  } catch {
    throw new Error('Сървърът не е достъпен');
  }

  if (res.status === 401) {
    setToken(null);
    if (onUnauth) onUnauth();
    throw new Error('Сесията е изтекла');
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`HTTP ${res.status} — невалиден отговор`);
  }
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// Auth — login returns either { token, user } or { require2FA, challenge, emailHint }
export const login = (email, password) =>
  request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
export const verifyTwoFA = (challenge, code) =>
  request('/api/auth/verify-2fa', { method: 'POST', body: JSON.stringify({ challenge, code }) });
export const resendTwoFA = (challenge) =>
  request('/api/auth/resend-2fa', { method: 'POST', body: JSON.stringify({ challenge }) });
export const getMe = () => request('/api/auth/me');
export const changeMyPassword = (currentPassword, newPassword) =>
  request('/api/auth/me/password', { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }) });

// 2FA management (requires auth)
export const init2FA = () =>
  request('/api/auth/2fa/init', { method: 'POST', body: JSON.stringify({}) });
export const enable2FA = (code) =>
  request('/api/auth/2fa/enable', { method: 'POST', body: JSON.stringify({ code }) });
export const disable2FA = (password) =>
  request('/api/auth/2fa/disable', { method: 'POST', body: JSON.stringify({ password }) });

// Users (admin only)
export const getUsers = () => request('/api/users');
export const createUser = (data) =>
  request('/api/users', { method: 'POST', body: JSON.stringify(data) });
export const updateUser = (id, data) =>
  request(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteUser = (id) =>
  request(`/api/users/${id}`, { method: 'DELETE' });

// Bookings
export const createBooking = (data) =>
  request('/api/bookings', { method: 'POST', body: JSON.stringify(data) });
export const getBookings = () => request('/api/bookings');
export const updateBooking = (id, data) =>
  request(`/api/bookings/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteBooking = (id) =>
  request(`/api/bookings/${id}`, { method: 'DELETE' });

// Products
export const getProducts = () => request('/api/products');
export const createProduct = (data) =>
  request('/api/products', { method: 'POST', body: JSON.stringify(data) });
export const updateProduct = (ref, data) =>
  request(`/api/products/${ref}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteProduct = (ref) =>
  request(`/api/products/${ref}`, { method: 'DELETE' });

// Articles
export const getArticles = (all = false) =>
  request(`/api/articles${all ? '?all=1' : ''}`);
export const createArticle = (data) =>
  request('/api/articles', { method: 'POST', body: JSON.stringify(data) });
export const updateArticle = (id, data) =>
  request(`/api/articles/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteArticle = (id) =>
  request(`/api/articles/${id}`, { method: 'DELETE' });

// Settings
export const getSettings = () => request('/api/settings');
export const updateSettings = (data) =>
  request('/api/settings', { method: 'PUT', body: JSON.stringify(data) });
