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

  const res = await fetch(`${BASE}${path}`, { ...opts, headers });

  if (res.status === 401) {
    setToken(null);
    if (onUnauth) onUnauth();
    throw new Error('Сесията е изтекла');
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// Auth
export const login = (email, password) =>
  request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
export const getMe = () => request('/api/auth/me');
export const changeMyPassword = (currentPassword, newPassword) =>
  request('/api/auth/me/password', { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }) });

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
