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

// On 401, redirect to login (token expired)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      _token = null;
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
