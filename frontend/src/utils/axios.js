import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT from memory (AuthContext stores the token)
// The interceptor reads the token set by AuthContext.
let _token = null;

export const setAuthToken = (token) => {
  _token = token;
};

api.interceptors.request.use((config) => {
  if (_token) {
    config.headers.Authorization = `Bearer ${_token}`;
  }
  return config;
});

// On 401, redirect to login (token expired).
// BUG-007: do NOT redirect for the login request itself — a failed login returns
// 401 "Invalid credentials", and redirecting would reload the page before the
// LoginPage can render the error. Also skip when already on /login.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || '';
    const isLoginRequest = requestUrl.includes('/auth/login');
    const onLoginPage = window.location.pathname === '/login';

    if (status === 401 && !isLoginRequest && !onLoginPage) {
      _token = null;
      sessionStorage.removeItem('crm_token'); // BUG-025: clear stale token so rehydration doesn't re-issue a doomed /me request
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
