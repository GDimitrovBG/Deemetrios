const BASE = import.meta.env.VITE_API_URL || '';

// The steps of the passwordless login. A 401 from these carries the server's
// own message and must not be treated as an expired session.
const LOGIN_STEPS = ['/api/auth/login', '/api/auth/verify-code', '/api/auth/resend-code'];

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

  // The 401 handler below exists for ONE case: a token that has expired while
  // the user was working, on a protected endpoint. The three endpoints that
  // hand OUT a session are not that case — the user has no session there yet,
  // so a 401 from them means "wrong code" or "this challenge is stale", and
  // the server says exactly which. Routing them through the generic handler
  // replaced that with "Сесията е изтекла", so one mistyped digit told the
  // user their session had expired on the screen where they are creating one.
  const isLoginStep = LOGIN_STEPS.includes(path);

  if (res.status === 401 && !isLoginStep) {
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

// Auth — passwordless OTP flow: email → code → token
export const requestCode = (email) =>
  request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email }) });
export const verifyCode = (challenge, code) =>
  request('/api/auth/verify-code', { method: 'POST', body: JSON.stringify({ challenge, code }) });
export const resendCode = (challenge) =>
  request('/api/auth/resend-code', { method: 'POST', body: JSON.stringify({ challenge }) });
export const getMe = () => request('/api/auth/me');

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
