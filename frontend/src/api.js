import axios from 'axios';

const baseURL =
  import.meta.env.PROD
    ? "/api"
    : (import.meta.env.VITE_API_URL || "http://localhost:3001/api");

export const api = axios.create({ baseURL });

export function setAuthToken(token) {
  if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  else delete api.defaults.headers.common['Authorization'];
}

export function loadAuth() {
  const token = localStorage.getItem('dnf_token');
  const role = localStorage.getItem('dnf_role');
  const username = localStorage.getItem('dnf_username');
  if (token) setAuthToken(token);
  return { token, role, username };
}

export function saveAuth({ token, role, username }) {
  localStorage.setItem('dnf_token', token);
  localStorage.setItem('dnf_role', role);
  localStorage.setItem('dnf_username', username);
  setAuthToken(token);
}

export function clearAuth() {
  localStorage.removeItem('dnf_token');
  localStorage.removeItem('dnf_role');
  localStorage.removeItem('dnf_username');
  setAuthToken(null);
}
